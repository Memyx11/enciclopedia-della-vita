/**
 * NUR Streaming API Route
 * Endpoint per risposte in streaming (parola per parola)
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { generateNurPrompt } from '@/lib/nur/personality'
import { buildFullUserContext, extractInsightsFromMessage, updateNurGrowthMetric } from '@/lib/nur/memory'
import { createInsightEntry } from '@/lib/nur/journal'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { message, userId, history, conversationId, area } = body

        if (!message || !userId) {
            return new Response(JSON.stringify({ error: 'Parametri mancanti' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        })

        // Carica contesto utente
        const userContext = await buildFullUserContext(userId)

        // Genera system prompt
        const systemPrompt = generateNurPrompt({
            ...userContext,
            current_area: area
        }) + `

IMPORTANTE - FORMATTAZIONE RISPOSTE:
- Usa **grassetto** per enfatizzare parole importanti
- Usa elenchi puntati con - quando elenchi cose
- Usa elenchi numerati 1. 2. 3. per passi da seguire
- Vai a capo spesso per rendere il testo leggibile
- Usa > per citazioni o riflessioni importanti
- NON usare troppi emoji, massimo 1-2 per messaggio
- Mantieni i paragrafi brevi (2-3 frasi max)`

        // Prepara messaggi
        const messages = [
            ...(history || []).map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            { role: 'user' as const, content: message }
        ]

        // Crea lo stream
        const stream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            system: systemPrompt,
            messages
        })

        // Encoder per lo streaming
        const encoder = new TextEncoder()
        let fullResponse = ''

        // ReadableStream che invia chunks
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const event of stream) {
                        if (event.type === 'content_block_delta') {
                            const delta = event.delta as any
                            if (delta.type === 'text_delta' && delta.text) {
                                fullResponse += delta.text
                                // Invia il chunk come Server-Sent Event
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`))
                            }
                        }
                    }

                    // Dopo che lo stream è completo, processa in background
                    processAfterStream(userId, message, fullResponse, conversationId, area, history)

                    // Invia evento di fine
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
 * Processa tutto dopo che lo stream è completo
 */
async function processAfterStream(
    userId: string,
    userMessage: string,
    nurResponse: string,
    existingConversationId?: string,
    area?: string,
    history?: any[]
) {
    try {
        // 1. Salva la conversazione
        let conversationId = existingConversationId

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
            // Salva i messaggi
            await supabase.from('messages').insert([
                {
                    conversation_id: conversationId,
                    clerk_user_id: userId,
                    role: 'user',
                    content: userMessage,
                    area_type: area || 'generale'
                },
                {
                    conversation_id: conversationId,
                    clerk_user_id: userId,
                    role: 'assistant',
                    content: nurResponse,
                    area_type: area || 'generale'
                }
            ])

            // Aggiorna conteggio
            const { data: conv } = await supabase
                .from('conversations')
                .select('message_count')
                .eq('id', conversationId)
                .single()

            await supabase
                .from('conversations')
                .update({ message_count: (conv?.message_count || 0) + 2 })
                .eq('id', conversationId)
        }

        // 2. Estrai insights
        const insights = await extractInsightsFromMessage(
            userMessage,
            history || [],
            userId,
            conversationId
        )

        // 3. Salva insight importanti nel giornale
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

        // 4. Aggiorna metriche
        await updateNurGrowthMetric('conversations_total', 1)
        if (insights.length > 0) {
            await updateNurGrowthMetric('insights_generated', insights.length)
        }

        // 5. Estrai e salva soluzioni se presenti
        const solutionIndicators = ['ecco cosa puoi fare', 'ti propongo', 'primo step', 'inizia con']
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
        console.error('Post-stream processing error:', error)
    }
}
