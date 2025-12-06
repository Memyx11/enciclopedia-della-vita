/**
 * NUR Streaming API Route
 * Endpoint per risposte in streaming (parola per parola)
 * Con accesso a Internet e salvataggio affidabile messaggi
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { generateNurPrompt } from '@/lib/nur/personality'
import { buildFullUserContext, extractInsightsFromMessage, updateNurGrowthMetric } from '@/lib/nur/memory'
import { createInsightEntry } from '@/lib/nur/journal'
import { needsWebSearch, extractSearchQuery, searchAllSources } from '@/lib/nur/web-search'
import { generateProgressSummary, detectGoalsFromMessage, processDetectedGoals } from '@/lib/nur/goals'

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
        // Questo risolve il bug dei messaggi che spariscono
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

        // Salva il messaggio utente IMMEDIATAMENTE
        if (conversationId) {
            await supabase.from('messages').insert({
                conversation_id: conversationId,
                clerk_user_id: userId,
                role: 'user',
                content: message,
                area_type: area || 'generale'
            })

            // Aggiorna updated_at della conversazione
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

        // Genera riepilogo progressi per NUR
        const progressSummary = await generateProgressSummary(userId)

        let systemPrompt = generateNurPrompt({
            ...userContext,
            current_area: area
        })

        // Aggiungi istruzioni di formattazione
        systemPrompt += `

IMPORTANTE - FORMATTAZIONE RISPOSTE:
- Usa **grassetto** per enfatizzare parole importanti
- Usa elenchi puntati con - quando elenchi cose
- Usa elenchi numerati 1. 2. 3. per passi da seguire
- Vai a capo spesso per rendere il testo leggibile
- Usa > per citazioni o riflessioni importanti
- NON usare troppi emoji, massimo 1-2 per messaggio
- Mantieni i paragrafi brevi (2-3 frasi max)

## PROGRESSI E OBIETTIVI DELL'UTENTE

${progressSummary}

Quando l'utente parla di obiettivi o di cosa vuole raggiungere:
- Aiutalo a definire obiettivi chiari e misurabili
- Suggerisci task concreti e realizzabili
- Celebra i progressi fatti
- Se vedi task completati, riconoscilo e incoraggialo`

        // Se ci sono risultati web, aggiungili al contesto
        if (webSearchResults) {
            systemPrompt += `

## INFORMAZIONI DA INTERNET

Ho cercato su internet per te. Ecco cosa ho trovato:

${webSearchResults}

**USA QUESTE INFORMAZIONI** nella tua risposta quando rilevante. Cita le fonti se opportuno. Non limitarti a ripetere, elabora e personalizza per l'utente.`
        }

        // ====== 4. PREPARA MESSAGGI PER CLAUDE ======
        const messages = [
            ...(history || []).map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            { role: 'user' as const, content: message }
        ]

        // ====== 5. CREA LO STREAM ======
        const stream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages
        })

        const encoder = new TextEncoder()
        let fullResponse = ''

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const event of stream) {
                        if (event.type === 'content_block_delta') {
                            const delta = event.delta as any
                            if (delta.type === 'text_delta' && delta.text) {
                                fullResponse += delta.text
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`))
                            }
                        }
                    }

                    // ====== 6. SALVA LA RISPOSTA E PROCESSA ======
                    // Salva SUBITO la risposta di NUR
                    if (conversationId && fullResponse) {
                        await supabase.from('messages').insert({
                            conversation_id: conversationId,
                            clerk_user_id: userId,
                            role: 'assistant',
                            content: fullResponse,
                            area_type: area || 'generale'
                        })

                        // Aggiorna conteggio messaggi
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

                    // Processa insights in background (non blocca)
                    processInsightsInBackground(userId, message, fullResponse, conversationId, area, history)

                    // Invia nuovo conversationId se creato
                    if (conversationId && !existingConvId) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`))
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
                    controller.close()

                } catch (error) {
                    console.error('Stream error:', error)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Errore durante lo streaming' })}\n\n`))
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

/**
 * Processa insights in background senza bloccare la risposta
 */
async function processInsightsInBackground(
    userId: string,
    userMessage: string,
    nurResponse: string,
    conversationId?: string,
    area?: string,
    history?: any[]
) {
    try {
        // ====== RILEVA OBIETTIVI DAL MESSAGGIO ======
        const goalDetection = await detectGoalsFromMessage(userMessage, history || [])
        if (goalDetection.detected_goals.length > 0 || goalDetection.update_current_state.length > 0) {
            const result = await processDetectedGoals(userId, goalDetection)
            console.log(`[Goals] Created: ${result.goalsCreated} goals, ${result.tasksCreated} tasks, ${result.statesUpdated} states`)
        }

        // Estrai insights
        const insights = await extractInsightsFromMessage(
            userMessage,
            history || [],
            userId,
            conversationId
        )

        // Salva insight importanti nel giornale
        for (const insight of insights) {
            if (insight.importance >= 7) {
                await createInsightEntry(
                    userId,
                    insight.type,
                    insight.content,
                    undefined,
                    insight.area,
                    insight.importance
                )
            }
        }

        // Aggiorna metriche
        await updateNurGrowthMetric('conversations_total', 1)
        if (insights.length > 0) {
            await updateNurGrowthMetric('insights_generated', insights.length)
        }

        // Estrai e salva soluzioni se presenti
        const solutionIndicators = ['ecco cosa puoi fare', 'ti propongo', 'primo step', 'inizia con', 'ecco un piano']
        if (solutionIndicators.some(ind => nurResponse.toLowerCase().includes(ind))) {
            const lines = nurResponse.split('\n').filter(l => l.trim())
            const steps: string[] = []

            for (const line of lines) {
                if (/^[\d]+[\.\)]|\s*[-•]\s/.test(line.trim())) {
                    const cleanStep = line.replace(/^[\d]+[\.\)]\s*|\s*[-•]\s*/, '').trim()
                    if (cleanStep.length > 10) {
                        steps.push(cleanStep)
                    }
                }
            }

            if (steps.length >= 2) {
                const title = lines[0].substring(0, 60).replace(/[^a-zA-Z0-9àèéìòù\s]/gi, '').trim() || 'Piano suggerito da NUR'
                await supabase.from('solutions').insert({
                    clerk_user_id: userId,
                    conversation_id: conversationId,
                    title,
                    description: nurResponse.substring(0, 200),
                    steps,
                    status: 'proposta',
                    area_type: area || 'generale',
                    progress: 0
                })
            }
        }

    } catch (error) {
        console.error('Background processing error:', error)
    }
}
