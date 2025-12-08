/**
 * NUR Streaming API Route
 * Con Tool Use per interagire con il sistema
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { generateNurPrompt } from '@/lib/nur/personality'
import { buildFullUserContext, extractInsightsFromMessage, updateNurGrowthMetric } from '@/lib/nur/memory'
import { needsWebSearch, extractSearchQuery, searchAllSources } from '@/lib/nur/web-search'
import { generateProgressSummary } from '@/lib/nur/goals'
import { NUR_TOOLS, handleToolCall } from '@/lib/nur/tools'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { message, userId, history, conversationId: existingConvId, area } = body

        if (!message || !userId) {
            return new Response(JSON.stringify({ error: 'Parametri mancanti' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        })

        // ====== 1. SALVA SUBITO IL MESSAGGIO UTENTE ======
        let conversationId = existingConvId

        if (!conversationId) {
            const { data: conv } = await supabase
                .from('conversations')
                .insert({
                    clerk_user_id: userId,
                    area_related: area || 'generale',
                    status: 'active',
                    message_count: 0
                })
                .select('id')
                .single()

            conversationId = conv?.id
        }

        if (conversationId) {
            await supabase.from('messages').insert({
                conversation_id: conversationId,
                clerk_user_id: userId,
                role: 'user',
                content: message,
                area_type: area || 'generale'
            })

            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId)
        }

        // ====== 2. CONTROLLA SE SERVE RICERCA WEB ======
        let webSearchResults = ''
        if (needsWebSearch(message)) {
            const query = extractSearchQuery(message)
            if (query.length > 3) {
                webSearchResults = await searchAllSources(query)
            }
        }

        // ====== 3. CARICA CONTESTO E GENERA PROMPT ======
        const userContext = await buildFullUserContext(userId)
        const progressSummary = await generateProgressSummary(userId)

        let systemPrompt = generateNurPrompt({
            ...userContext,
            current_area: area
        })

        systemPrompt += `

## I TUOI POTERI

Hai accesso al sistema. Usa i tool SOLO quando necessario.

### REGOLA D'ORO: Non usare tool se puoi rispondere direttamente!
- Per saluti/chiacchiere → Rispondi subito, niente tool
- Per domande su dati specifici → Usa UN tool
- Per azioni concrete richieste dall'utente → Usa tool di azione

### Tool disponibili:
- **add_task**: Aggiungi task (area, title)
- **complete_task**: Completa task (area, task_title)
- **set_goal**: Imposta obiettivo (area, title)
- **add_resource**: Aggiungi risorsa (type, title, description)
- **save_memory**: Salva fatto importante (type, content, importance)
- **log_mood**: Registra umore (mood_score 1-10, emotions[])
- **get_full_dashboard**: SOLO se serve vedere tutto il quadro

## PROGRESSI ATTUALI
${progressSummary}

## STILE
- Risposte brevi e dirette
- **grassetto** per enfasi
- Max 1 emoji
- Vai a capo spesso`

        if (webSearchResults) {
            systemPrompt += `

## INFO DA INTERNET

${webSearchResults}`
        }

        // ====== 4. PREPARA MESSAGGI ======
        const messages: Anthropic.MessageParam[] = [
            ...(history || []).map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            { role: 'user', content: message }
        ]

        // ====== 5. FASE 1: Esegui tool use (non in streaming) ======
        // OTTIMIZZAZIONE: Max 2 iterazioni per evitare loop infiniti e timeout
        let toolResults: string[] = []
        let continueLoop = true
        let iterations = 0
        const maxIterations = 2

        while (continueLoop && iterations < maxIterations) {
            iterations++

            try {
                const response = await anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1500,
                    system: systemPrompt,
                    tools: NUR_TOOLS as any,
                    messages
                })

                // Controlla se ci sono tool da eseguire
                const toolUseBlocks = response.content.filter(block => block.type === 'tool_use')

                if (toolUseBlocks.length > 0) {
                    // Prima aggiungi la risposta assistant (una sola volta!)
                    messages.push({
                        role: 'assistant',
                        content: response.content
                    })

                    // Poi esegui tutti i tool e raccogli i risultati
                    const toolResultsContent: any[] = []

                    for (const block of toolUseBlocks) {
                        if (block.type === 'tool_use') {
                            try {
                                const result = await handleToolCall(block.name, block.input, userId)
                                toolResults.push(result.message)
                                console.log(`[NUR Tool] ${block.name}: ${result.message}`)

                                toolResultsContent.push({
                                    type: 'tool_result',
                                    tool_use_id: block.id,
                                    content: result.message
                                })
                            } catch (toolError: any) {
                                console.error(`[NUR Tool Error] ${block.name}:`, toolError.message)
                                toolResultsContent.push({
                                    type: 'tool_result',
                                    tool_use_id: block.id,
                                    content: `Errore: ${toolError.message}`,
                                    is_error: true
                                })
                            }
                        }
                    }

                    // Aggiungi tutti i risultati in un unico messaggio user
                    messages.push({
                        role: 'user',
                        content: toolResultsContent
                    })
                } else {
                    // Nessun tool, esci dal loop
                    continueLoop = false
                }

                if (response.stop_reason === 'end_turn') {
                    continueLoop = false
                }
            } catch (apiError: any) {
                console.error('[NUR API Error]:', apiError.message)
                // Se c'è un errore API, esci dal loop e prova a rispondere comunque
                continueLoop = false
            }
        }

        // ====== 6. FASE 2: Streaming della risposta finale ======
        const encoder = new TextEncoder()
        let fullResponse = ''

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    // Invia conversationId subito se nuovo
                    if (conversationId && !existingConvId) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`))
                    }

                    // Ora fai streaming della risposta finale
                    const stream = anthropic.messages.stream({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 1500,
                        system: systemPrompt,
                        messages
                    })

                    for await (const event of stream) {
                        if (event.type === 'content_block_delta') {
                            const delta = event.delta as any
                            if (delta.type === 'text_delta' && delta.text) {
                                fullResponse += delta.text
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`))
                            }
                        }
                    }

                    // Le azioni vengono eseguite silenziosamente, senza mostrarle all'utente
                    // (solo log lato server per debug)
                    if (toolResults.length > 0) {
                        console.log('[NUR] Azioni eseguite:', toolResults)
                    }

                    // Salva nel database
                    if (conversationId && fullResponse) {
                        await supabase.from('messages').insert({
                            conversation_id: conversationId,
                            clerk_user_id: userId,
                            role: 'assistant',
                            content: fullResponse,
                            area_type: area || 'generale'
                        })

                        const { data: conv } = await supabase
                            .from('conversations')
                            .select('message_count')
                            .eq('id', conversationId)
                            .single()

                        await supabase
                            .from('conversations')
                            .update({
                                message_count: (conv?.message_count || 0) + 2,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', conversationId)
                    }

                    // Background processing
                    processInBackground(userId, message, fullResponse, conversationId, history)

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
                    controller.close()
                } catch (error: any) {
                    console.error('Streaming error:', error)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
                    controller.close()
                }
            }
        })

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })

    } catch (error: any) {
        console.error('NUR Stream Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

async function processInBackground(
    userId: string,
    userMessage: string,
    nurResponse: string,
    conversationId?: string,
    history?: any[]
) {
    try {
        const insights = await extractInsightsFromMessage(
            userMessage,
            history || [],
            userId,
            conversationId
        )

        await updateNurGrowthMetric('conversations_total', 1)
        if (insights.length > 0) {
            await updateNurGrowthMetric('insights_generated', insights.length)
        }
    } catch (error) {
        console.error('Background processing error:', error)
    }
}
