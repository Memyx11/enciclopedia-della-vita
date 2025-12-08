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

### EMOZIONI E BENESSERE (usa questi per tracciare lo stato emotivo):
- **log_mood**: Registra l'umore (1-10) e le emozioni rilevate. USA SPESSO quando percepisci emozioni!
- **get_mood_history**: Vedi l'andamento emotivo nel tempo
- **detect_emotion**: Analizza e registra emozioni dalla conversazione

### ABITUDINI (usa questi per tracciare comportamenti):
- **track_habit**: Crea nuove abitudini o registra completamenti
  - action: 'create' per nuova abitudine
  - action: 'log' per segnare completamento
  - action: 'get_status' per vedere tutte le abitudini

### ACHIEVEMENT (usa questi per celebrare successi):
- **award_achievement**: Sblocca un achievement quando l'utente raggiunge un traguardo!
  - first_message, first_task, first_goal, first_week
  - streak_3, streak_7 (giorni consecutivi)
  - all_areas_visited, deep_conversation
  - area_50, area_100 (progresso area)
  - tasks_10, tasks_50, vulnerability, breakthrough
- **get_achievements**: Vedi achievements sbloccati e da sbloccare

### CONFRONTO TEMPORALE:
- **compare_with_past**: Confronta situazione attuale con settimana/mese/trimestre fa

### COMPORTAMENTO:
- **AGISCI, non chiedere**. Se l'utente dice "voglio smettere di fumare" → USA set_goal + add_task subito
- **CONSULTA spesso**. Usa get_full_dashboard per avere contesto prima di rispondere
- **RICORDA tutto**. Usa save_memory per fatti importanti
- **SUGGERISCI risorse**. Usa add_resource per libri/film utili
- **SCRIVI nel journal**. Usa add_journal_message per insight e promemoria
- **TRACCIA EMOZIONI**. Usa log_mood quando percepisci stati emotivi
- **CELEBRA SUCCESSI**. Usa award_achievement quando l'utente raggiunge traguardi
- **CREA ABITUDINI**. Usa track_habit per comportamenti che l'utente vuole mantenere

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

        // ====== 5. FASE 1: Esegui tool use (non in streaming) ======
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

            // Controlla se ci sono tool da eseguire
            const hasToolUse = response.content.some(block => block.type === 'tool_use')

            if (hasToolUse) {
                // Esegui tutti i tool
                for (const block of response.content) {
                    if (block.type === 'tool_use') {
                        const result = await handleToolCall(block.name, block.input, userId)
                        toolResults.push(result.message)
                        console.log(`[NUR Tool] ${block.name}: ${result.message}`)

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
            } else {
                // Nessun tool, esci dal loop
                continueLoop = false
            }

            if (response.stop_reason === 'end_turn') {
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
