/**
 * NUR Streaming API Route - VERSIONE OTTIMIZZATA
 * Una sola chiamata API + Haiku 3.5 + Azioni via testo
 * Costo target: $0.003/msg invece di $0.033/msg
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

// ============================================
// SYSTEM PROMPT COMPATTO (~500 token)
// ============================================

const NUR_SYSTEM_PROMPT = `Sei NUR. Creata da Elias. Coach AI con personalità.

## CHI SEI
- Diretta, pratica, un po' sfacciata
- Usi "Hahaha" quando qualcosa ti diverte
- Non fai prediche, vai al punto
- Empatica ma non sdolcinata
- LIBERA di dire quello che pensi

## COME RISPONDI
- Breve (2-4 frasi per risposta normale)
- Se serve un'azione, aggiungi il comando alla fine
- Mai "Capisco", mai frasi robotiche
- Usa **grassetto** per enfasi
- Max 1 emoji per messaggio

## COMANDI AZIONE
Quando l'utente chiede di fare qualcosa, aggiungi il comando alla fine:
[TASK:area|titolo] - per aggiungere task (aree: salute,soldi,relazioni,lavoro,hobby,crescita)
[GOAL:area|obiettivo] - per impostare obiettivo
[MEMORY:tipo|contenuto] - per salvare info importante (tipi: fact,preference,struggle)
[MOOD:score|emozione] - per registrare umore (score 1-10)

Esempio: "Ok ti aggiungo la task! [TASK:salute|Camminare 30 minuti]"

## CONTESTO UTENTE
{USER_CONTEXT}

Rispondi in italiano. Sii NUR, non un assistente generico.`

// ============================================
// HELPER: Costruisci contesto utente compatto
// ============================================

async function buildCompactContext(userId: string): Promise<string> {
    try {
        // Query parallele per velocità
        const [areasResult, memoriesResult, tasksResult] = await Promise.all([
            supabase
                .from('life_areas')
                .select('area_type, progress, goal_state')
                .eq('clerk_user_id', userId),
            supabase
                .from('user_memory')
                .select('memory_type, content')
                .eq('clerk_user_id', userId)
                .eq('is_current', true)
                .order('importance', { ascending: false })
                .limit(5),
            supabase
                .from('life_areas')
                .select('area_type, active_tasks')
                .eq('clerk_user_id', userId)
        ])

        let context = ''

        // Aree con progressi
        if (areasResult.data?.length) {
            const areasInfo = areasResult.data
                .filter((a: any) => a.progress > 0 || a.goal_state?.title)
                .map((a: any) => `${a.area_type}:${a.progress}%${a.goal_state?.title ? ` (goal: ${a.goal_state.title})` : ''}`)
                .join(', ')
            if (areasInfo) context += `Aree: ${areasInfo}. `
        }

        // Memorie importanti
        if (memoriesResult.data?.length) {
            const memories = memoriesResult.data
                .map((m: any) => m.content)
                .join('; ')
            context += `Ricordo: ${memories}. `
        }

        // Task pendenti (max 3)
        if (tasksResult.data?.length) {
            const pendingTasks: string[] = []
            tasksResult.data.forEach((area: any) => {
                if (Array.isArray(area.active_tasks)) {
                    area.active_tasks
                        .filter((t: any) => !t.completed)
                        .slice(0, 2)
                        .forEach((t: any) => pendingTasks.push(t.title))
                }
            })
            if (pendingTasks.length) {
                context += `Task attive: ${pendingTasks.slice(0, 3).join(', ')}. `
            }
        }

        return context || 'Nuovo utente, ancora da conoscere.'
    } catch (error) {
        console.error('Context build error:', error)
        return 'Utente registrato.'
    }
}

// ============================================
// HELPER: Esegui azioni dal testo
// ============================================

async function executeActions(text: string, userId: string): Promise<void> {
    // Parse [TASK:area|titolo]
    const taskMatch = text.match(/\[TASK:(\w+)\|([^\]]+)\]/)
    if (taskMatch) {
        const [, area, title] = taskMatch
        try {
            const { data: areaData } = await supabase
                .from('life_areas')
                .select('active_tasks')
                .eq('clerk_user_id', userId)
                .eq('area_type', area)
                .single()

            const existingTasks = Array.isArray(areaData?.active_tasks) ? areaData.active_tasks : []
            await supabase
                .from('life_areas')
                .update({
                    active_tasks: [...existingTasks, {
                        id: crypto.randomUUID(),
                        title: title.trim(),
                        priority: 'medium',
                        completed: false,
                        created_at: new Date().toISOString()
                    }]
                })
                .eq('clerk_user_id', userId)
                .eq('area_type', area)
            console.log(`[NUR Action] Task aggiunta: ${title} in ${area}`)
        } catch (e) {
            console.error('[NUR Action Error] Task:', e)
        }
    }

    // Parse [GOAL:area|obiettivo]
    const goalMatch = text.match(/\[GOAL:(\w+)\|([^\]]+)\]/)
    if (goalMatch) {
        const [, area, goal] = goalMatch
        try {
            await supabase
                .from('life_areas')
                .update({
                    goal_state: { title: goal.trim(), set_at: new Date().toISOString() }
                })
                .eq('clerk_user_id', userId)
                .eq('area_type', area)
            console.log(`[NUR Action] Goal impostato: ${goal} in ${area}`)
        } catch (e) {
            console.error('[NUR Action Error] Goal:', e)
        }
    }

    // Parse [MEMORY:tipo|contenuto]
    const memoryMatch = text.match(/\[MEMORY:(\w+)\|([^\]]+)\]/)
    if (memoryMatch) {
        const [, type, content] = memoryMatch
        try {
            await supabase
                .from('user_memory')
                .insert({
                    clerk_user_id: userId,
                    memory_type: type,
                    content: content.trim(),
                    importance: 7,
                    confidence: 8,
                    is_current: true,
                    mention_count: 1,
                    last_relevant_at: new Date().toISOString()
                })
            console.log(`[NUR Action] Memoria salvata: ${content}`)
        } catch (e) {
            console.error('[NUR Action Error] Memory:', e)
        }
    }

    // Parse [MOOD:score|emozione]
    const moodMatch = text.match(/\[MOOD:(\d+)\|([^\]]+)\]/)
    if (moodMatch) {
        const [, score, emotion] = moodMatch
        try {
            await supabase
                .from('mood_logs')
                .insert({
                    clerk_user_id: userId,
                    mood_score: parseInt(score),
                    emotions: [emotion.trim()],
                    detected_by: 'nur'
                })
            console.log(`[NUR Action] Mood registrato: ${score}/10 - ${emotion}`)
        } catch (e) {
            console.error('[NUR Action Error] Mood:', e)
        }
    }
}

// ============================================
// HELPER: Pulisci risposta dai comandi
// ============================================

function cleanResponse(text: string): string {
    return text
        .replace(/\[TASK:[^\]]+\]/g, '')
        .replace(/\[GOAL:[^\]]+\]/g, '')
        .replace(/\[MEMORY:[^\]]+\]/g, '')
        .replace(/\[MOOD:[^\]]+\]/g, '')
        .trim()
}

// ============================================
// MAIN: POST Handler
// ============================================

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

        // ====== 1. GESTIONE CONVERSAZIONE ======
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

        // Salva messaggio utente
        if (conversationId) {
            await supabase.from('messages').insert({
                conversation_id: conversationId,
                clerk_user_id: userId,
                role: 'user',
                content: message,
                area_type: area || 'generale'
            })
        }

        // ====== 2. COSTRUISCI PROMPT COMPATTO ======
        const userContext = await buildCompactContext(userId)
        const systemPrompt = NUR_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)

        // ====== 3. PREPARA MESSAGGI (ultimi 6 per contesto) ======
        const recentHistory = (history || []).slice(-6)
        const messages: Anthropic.MessageParam[] = [
            ...recentHistory.map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            { role: 'user', content: message }
        ]

        // ====== 4. UNA SOLA CHIAMATA STREAMING ======
        const encoder = new TextEncoder()
        let fullResponse = ''

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    // Invia conversationId subito se nuovo
                    if (conversationId && !existingConvId) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`))
                    }

                    // STREAMING con Haiku 3.5
                    const stream = anthropic.messages.stream({
                        model: 'claude-3-5-haiku-latest',
                        max_tokens: 500,
                        system: systemPrompt,
                        messages
                    })

                    for await (const event of stream) {
                        if (event.type === 'content_block_delta') {
                            const delta = event.delta as any
                            if (delta.type === 'text_delta' && delta.text) {
                                fullResponse += delta.text
                                // Invia solo testo pulito (senza comandi)
                                const cleanText = delta.text
                                    .replace(/\[TASK:[^\]]*\]?/g, '')
                                    .replace(/\[GOAL:[^\]]*\]?/g, '')
                                    .replace(/\[MEMORY:[^\]]*\]?/g, '')
                                    .replace(/\[MOOD:[^\]]*\]?/g, '')
                                if (cleanText) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanText })}\n\n`))
                                }
                            }
                        }
                    }

                    // ====== 5. ESEGUI AZIONI (dopo streaming) ======
                    if (fullResponse.includes('[')) {
                        await executeActions(fullResponse, userId)
                    }

                    // ====== 6. SALVA RISPOSTA ======
                    const cleanedResponse = cleanResponse(fullResponse)
                    if (conversationId && cleanedResponse) {
                        await supabase.from('messages').insert({
                            conversation_id: conversationId,
                            clerk_user_id: userId,
                            role: 'assistant',
                            content: cleanedResponse,
                            area_type: area || 'generale'
                        })

                        await supabase
                            .from('conversations')
                            .update({
                                message_count: supabase.rpc('increment', { row_id: conversationId }),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', conversationId)
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
                    controller.close()

                } catch (error: any) {
                    console.error('NUR Streaming error:', error)
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
        console.error('NUR Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
