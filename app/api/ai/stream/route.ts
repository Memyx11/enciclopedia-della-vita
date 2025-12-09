/**
 * NUR Streaming API Route - SISTEMA IBRIDO
 * Haiku 3.5 per chat normale (economico)
 * Sonnet 4 per azioni (affidabile)
 * Costo medio: ~$0.004/msg
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

// ============================================
// KEYWORDS PER ROUTING → SONNET
// ============================================

const ACTION_KEYWORDS = [
    'salva', 'salvami', 'crea', 'creami', 'aggiungi', 'aggiungimi',
    'metti', 'mettimi', 'scrivi', 'scrivimi', 'genera', 'generami',
    'task', 'traguardo', 'traguardi', 'obiettivo', 'obiettivi',
    'contenuto', 'contenuti', 'guida', 'viaggio', 'piano',
    'registra', 'annota', 'segna', 'inserisci'
]

function needsSonnet(message: string): boolean {
    const lowerMsg = message.toLowerCase()
    return ACTION_KEYWORDS.some(keyword => lowerMsg.includes(keyword))
}

// ============================================
// PROMPT HAIKU - Chat normale
// ============================================

const HAIKU_PROMPT = `Sei NUR, coach AI. Diretta, pratica, sfacciata. Max 1 emoji.

Sei qui per conversare, motivare, consigliare. Conosci l'utente e lo aiuti.

IMPORTANTE: Se l'utente vuole SALVARE qualcosa (guide, task, traguardi, contenuti, viaggi),
digli: "Dimmi cosa vuoi che salvi e lo faccio subito!"
Keywords che attivano il salvataggio: salva, crea, aggiungi, metti, task, traguardo, contenuto, viaggio, piano.

{USER_CONTEXT}

{LAST_ACTION}

Rispondi in italiano.`

// ============================================
// PROMPT SONNET - Solo azioni
// ============================================

const SONNET_PROMPT = `Sei NUR in MODALITÀ AZIONE. Esegui il comando richiesto.

COMANDI DISPONIBILI:
[TASK:area|titolo] = aggiunge task
[SAVE:guide|titolo|contenuto] = salva guida/contenuto nella Scrivania
[SAVE:viaggio|titolo|contenuto] = salva piano viaggio
[GOAL:area|obiettivo] = imposta traguardo
[MEMORY:fact|contenuto] = ricorda fatto importante

Aree valide: salute, soldi, relazioni, lavoro, hobby, crescita

ISTRUZIONI:
1. Capisci cosa vuole l'utente
2. Usa il comando appropriato con contenuto COMPLETO e UTILE
3. Conferma brevemente (max 2 frasi)

ESEMPIO:
User: "salvami una guida per dormire meglio"
NUR: "Fatto! [SAVE:guide|Guida Sonno|1. Vai a letto alla stessa ora ogni giorno. 2. Evita schermi 1h prima. 3. Camera fresca (18-20°C). 4. No caffè dopo le 15. 5. Routine relax serale.]"

{USER_CONTEXT}

CONVERSAZIONE RECENTE:
{RECENT_MESSAGES}

Rispondi in italiano.`

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

    // Parse [SAVE:tipo|titolo|contenuto] - per salvare materiale nella Scrivania
    const saveMatch = text.match(/\[SAVE:(\w+)\|([^|]+)\|([^\]]+)\]/)
    if (saveMatch) {
        const [, type, title, content] = saveMatch
        try {
            await supabase
                .from('journal_entries')
                .insert({
                    clerk_user_id: userId,
                    entry_type: type, // guide, article, exercise, resource
                    title: title.trim(),
                    content: content.trim(),
                    metadata: { added_by: 'nur', is_material: true }
                })
            console.log(`[NUR Action] Materiale salvato: ${title}`)
        } catch (e) {
            console.error('[NUR Action Error] Save:', e)
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
        .replace(/\[SAVE:[^\]]+\]/g, '')
        .trim()
}

// ============================================
// HELPER: Recupera ultima azione per Haiku
// ============================================

async function getLastAction(userId: string): Promise<string> {
    try {
        const { data } = await supabase
            .from('journal_entries')
            .select('title, entry_type, created_at')
            .eq('clerk_user_id', userId)
            .eq('metadata->>added_by', 'nur')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (data) {
            return `[Ultima azione: salvato "${data.title}" (${data.entry_type})]`
        }
        return ''
    } catch {
        return ''
    }
}

// ============================================
// MAIN: POST Handler - SISTEMA IBRIDO
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

        // ====== 1. ROUTING: HAIKU O SONNET? ======
        const useSonnet = needsSonnet(message)
        const modelToUse = useSonnet ? 'claude-sonnet-4-20250514' : 'claude-3-5-haiku-latest'
        console.log(`[NUR ROUTER] Message: "${message.substring(0, 50)}..." → ${useSonnet ? 'SONNET (azione)' : 'HAIKU (chat)'}`)

        // ====== 2. GESTIONE CONVERSAZIONE ======
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

        // ====== 3. COSTRUISCI PROMPT ======
        const userContext = await buildCompactContext(userId)
        const lastAction = await getLastAction(userId)
        const recentHistory = (history || []).slice(-4)

        let systemPrompt: string
        if (useSonnet) {
            // SONNET: prompt per azioni
            const recentMsgs = recentHistory
                .map((m: any) => `${m.role === 'user' ? 'User' : 'NUR'}: ${m.content}`)
                .join('\n')
            systemPrompt = SONNET_PROMPT
                .replace('{USER_CONTEXT}', userContext)
                .replace('{RECENT_MESSAGES}', recentMsgs || 'Nessuna conversazione precedente')
        } else {
            // HAIKU: prompt per chat
            systemPrompt = HAIKU_PROMPT
                .replace('{USER_CONTEXT}', userContext)
                .replace('{LAST_ACTION}', lastAction)
        }

        // ====== 4. PREPARA MESSAGGI ======
        const messages: Anthropic.MessageParam[] = [
            ...recentHistory.map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            { role: 'user', content: message }
        ]

        // ====== 5. STREAMING ======
        const encoder = new TextEncoder()
        let fullResponse = ''
        let pendingBuffer = ''

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    // Invia conversationId subito se nuovo
                    if (conversationId && !existingConvId) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`))
                    }

                    const stream = anthropic.messages.stream({
                        model: modelToUse,
                        max_tokens: useSonnet ? 1000 : 500, // Sonnet può scrivere contenuti più lunghi
                        system: systemPrompt,
                        messages
                    })

                    for await (const event of stream) {
                        if (event.type === 'content_block_delta') {
                            const delta = event.delta as any
                            if (delta.type === 'text_delta' && delta.text) {
                                fullResponse += delta.text
                                pendingBuffer += delta.text

                                // Buffer per nascondere comandi parziali
                                let textToSend = pendingBuffer
                                const lastOpenBracket = textToSend.lastIndexOf('[')
                                const lastCloseBracket = textToSend.lastIndexOf(']')

                                if (lastOpenBracket > lastCloseBracket) {
                                    textToSend = pendingBuffer.substring(0, lastOpenBracket)
                                    pendingBuffer = pendingBuffer.substring(lastOpenBracket)
                                } else {
                                    pendingBuffer = ''
                                }

                                // Rimuovi comandi completi dal testo visibile
                                const cleanText = textToSend
                                    .replace(/\[TASK:[^\]]+\]/g, '')
                                    .replace(/\[GOAL:[^\]]+\]/g, '')
                                    .replace(/\[MEMORY:[^\]]+\]/g, '')
                                    .replace(/\[MOOD:[^\]]+\]/g, '')
                                    .replace(/\[SAVE:[^\]]+\]/g, '')

                                if (cleanText) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanText })}\n\n`))
                                }
                            }
                        }
                    }

                    // Log costi
                    const finalMessage = await stream.finalMessage()
                    if (finalMessage.usage) {
                        const isHaiku = modelToUse.includes('haiku')
                        const inputRate = isHaiku ? 0.001 : 0.003  // $/1K tokens
                        const outputRate = isHaiku ? 0.005 : 0.015
                        const inputCost = (finalMessage.usage.input_tokens * inputRate) / 1000
                        const outputCost = (finalMessage.usage.output_tokens * outputRate) / 1000
                        const totalCost = inputCost + outputCost
                        console.log(`[NUR COST] Model: ${modelToUse} | In: ${finalMessage.usage.input_tokens} | Out: ${finalMessage.usage.output_tokens} | Cost: $${totalCost.toFixed(6)}`)
                    }

                    // ====== 6. ESEGUI AZIONI (solo se Sonnet) ======
                    if (useSonnet && fullResponse.includes('[')) {
                        console.log('[NUR ACTION] Executing commands from Sonnet response')
                        await executeActions(fullResponse, userId)
                    }

                    // ====== 7. SALVA RISPOSTA ======
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
