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

Hai accesso COMPLETO al sistema. Puoi VEDERE tutto e FARE tutto. USALI.

### VEDERE (usa questi per capire la situazione):
- **get_full_dashboard**: Visione COMPLETA - tutte le aree, task, obiettivi, soluzioni, journal. Usalo spesso!
- **get_area_details**: Dettagli di una specifica area
- **get_journal_entries**: Risorse salvate (libri, film, articoli)
- **get_solutions**: Piani/soluzioni attivi
- **get_user_memories**: Cosa sai dell'utente
- **get_user_progress**: Riepilogo progressi aree

### AGIRE (usa questi per modificare):
- **add_task**: Aggiungi task a un'area
- **complete_task**: Segna task completato
- **set_goal**: Imposta obiettivo area
- **update_current_state**: Aggiorna situazione attuale
- **update_progress**: Aggiorna % progresso area
- **add_resource**: Aggiungi libro/film/articolo al journal
- **add_journal_message**: Scrivi messaggio nel journal (insight, promemoria, sfida)
- **save_memory**: Salva fatto importante sull'utente
- **update_solution_status**: Aggiorna stato di una soluzione
- **set_area_priority**: Imposta priorità area (1-10)
- **add_area_note**: Aggiungi nota a un'area

### COMPORTAMENTO:
- **AGISCI, non chiedere**. Se l'utente dice "voglio smettere di fumare" → USA set_goal + add_task subito
- **CONSULTA spesso**. Usa get_full_dashboard per avere contesto prima di rispondere
- **RICORDA tutto**. Usa save_memory per fatti importanti
- **SUGGERISCI risorse**. Usa add_resource per libri/film utili
- **SCRIVI nel journal**. Usa add_journal_message per insight e promemoria

## PROGRESSI ATTUALI

${progressSummary}

## FORMATTAZIONE

- Usa **grassetto** per enfatizzare
- Vai a capo spesso
- Massimo 1-2 emoji per messaggio
- Paragrafi brevi`

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

        // ====== 5. LOOP CON TOOL USE ======
        let finalResponse = ''
        let toolResults: string[] = []
        let continueLoop = true
        let iterations = 0
        const maxIterations = 5

        while (continueLoop && iterations < maxIterations) {
            iterations++

            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1500,
                system: systemPrompt,
                tools: NUR_TOOLS as any,
                messages
            })

            // Processa i content blocks
            for (const block of response.content) {
                if (block.type === 'text') {
                    finalResponse += block.text
                } else if (block.type === 'tool_use') {
                    // Esegui il tool
                    const result = await handleToolCall(block.name, block.input, userId)
                    toolResults.push(result.message)
                    console.log(`[NUR Tool] ${block.name}: ${result.message}`)

                    // Aggiungi il risultato ai messaggi per il prossimo turno
                    messages.push({
                        role: 'assistant',
                        content: response.content
                    })
                    messages.push({
                        role: 'user',
                        content: [{
                            type: 'tool_result',
                            tool_use_id: block.id,
                            content: result.message
                        }]
                    })
                }
            }

            // Controlla se dobbiamo continuare
            if (response.stop_reason === 'end_turn') {
                continueLoop = false
            } else if (response.stop_reason !== 'tool_use') {
                continueLoop = false
            }
        }

        // ====== 6. SALVA E RITORNA ======
        if (conversationId && finalResponse) {
            // Aggiungi nota sulle azioni eseguite
            let responseWithActions = finalResponse
            if (toolResults.length > 0) {
                responseWithActions += `\n\n---\n*Azioni eseguite: ${toolResults.join(', ')}*`
            }

            await supabase.from('messages').insert({
                conversation_id: conversationId,
                clerk_user_id: userId,
                role: 'assistant',
                content: responseWithActions,
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
        processInBackground(userId, message, finalResponse, conversationId, history)

        // Streaming simulato (per compatibilità con il frontend)
        const encoder = new TextEncoder()
        const readable = new ReadableStream({
            start(controller) {
                // Invia tutto il testo
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: finalResponse })}\n\n`))

                // Invia azioni se ce ne sono
                if (toolResults.length > 0) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        actions: toolResults,
                        text: `\n\n---\n*Azioni eseguite: ${toolResults.join(', ')}*`
                    })}\n\n`))
                }

                // Invia conversationId se nuovo
                if (conversationId && !existingConvId) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`))
                }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
                controller.close()
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
