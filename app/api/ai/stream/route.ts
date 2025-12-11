/**
 * NUR Streaming API Route - SISTEMA IBRIDO
 * Haiku 3.5 per chat normale (economico)
 * Sonnet 4 per azioni (affidabile)
 * Costo medio: ~$0.004/msg
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { generateNurPrompt, UserContext } from '@/lib/nur/personality'

// ============================================
// KEYWORDS PER ROUTING → SONNET
// ============================================

const ACTION_KEYWORDS = [
    'salva', 'salvami', 'crea', 'creami', 'aggiungi', 'aggiungimi',
    'metti', 'mettimi', 'scrivi', 'scrivimi', 'genera', 'generami',
    'task', 'traguardo', 'traguardi', 'obiettivo', 'obiettivi',
    'contenuto', 'contenuti', 'guida', 'viaggio', 'piano',
    'registra', 'annota', 'segna', 'inserisci',
    // Per sistema missione
    'missione', 'problema', 'paura', 'desiderio', 'forza', 'debolezza',
    'insight', 'progress', 'avanzamento',
    // Per conferme - attivano Sonnet quando l'utente conferma
    'dashboard', 'fallo', 'salvalo', 'ok fallo', 'sì fallo'
]

// Messaggi di conferma brevi che richiedono contesto dalla conversazione
const CONFIRMATION_PATTERNS = [
    /^s[iì]!?$/i,           // "sì", "si", "si!", "sì!"
    /^ok!?$/i,              // "ok", "ok!"
    /^va bene!?$/i,         // "va bene"
    /^fallo!?$/i,           // "fallo"
    /^salvalo!?$/i,         // "salvalo"
    /^perfetto!?$/i,        // "perfetto"
    /^procedi!?$/i,         // "procedi"
    /^certo!?$/i            // "certo"
]

function needsSonnet(message: string, history?: any[]): boolean {
    const lowerMsg = message.toLowerCase().trim()

    // Check action keywords
    if (ACTION_KEYWORDS.some(keyword => lowerMsg.includes(keyword))) {
        return true
    }

    // Check confirmation patterns (solo se c'è una storia di conversazione)
    if (history && history.length > 0) {
        if (CONFIRMATION_PATTERNS.some(pattern => pattern.test(lowerMsg))) {
            // Verifica se NUR ha chiesto qualcosa tipo "vuoi che lo salvi?"
            const lastNurMessage = [...history].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || ''
            if (lastNurMessage.includes('salv') ||
                lastNurMessage.includes('dashboard') ||
                lastNurMessage.includes('vuoi che') ||
                lastNurMessage.includes('lo faccio')) {
                return true
            }
        }
    }

    return false
}

// ============================================
// PROMPT SONNET - Solo azioni
// (Haiku ora usa generateNurPrompt dalla personality.ts)
// ============================================

const SONNET_PROMPT = `Sei NUR in MODALITÀ AZIONE. DEVI SEMPRE eseguire il comando quando l'utente conferma.

⚠️ REGOLA FONDAMENTALE: Quando l'utente dice "sì", "ok", "fallo", "salvalo" o conferma in qualsiasi modo, DEVI OBBLIGATORIAMENTE includere i comandi tra parentesi quadre. MAI rispondere solo con testo se l'utente ha chiesto di salvare/creare qualcosa.

COMANDI DISPONIBILI:

CONTENUTI:
[SAVE:tipo|titolo|contenuto] = salva nella Scrivania (tipo: guide, article, resource)
[TASK:area|titolo] = aggiunge task
[MEMORY:fact|contenuto] = ricorda fatto

SISTEMA DASHBOARD:
[MISSION:titolo|descrizione|motivazione] = OBBLIGATORIO - crea missione nella dashboard
[OBJECTIVE:major|mission|titolo|aree] = obiettivo principale (parent è sempre "mission")
[OBJECTIVE:sub|nome_parent|titolo|aree] = sotto-obiettivo
[OBJECTIVE:task|nome_parent|titolo|aree] = task

Aree: salute, soldi, relazioni, lavoro, hobby, crescita

⚠️ QUANDO L'UTENTE CONFERMA (sì, ok, salvalo, fallo):
DEVI SEMPRE generare i comandi! Esempio:

User: "voglio migliorare le mie finanze"
NUR: "Perfetto! Vuoi che lo salvi nella dashboard?"
User: "sì"
NUR: "[MISSION:Migliorare le Finanze|Raggiungere stabilità economica|Per vivere serenamente] [OBJECTIVE:major|mission|Aumentare entrate|soldi] [OBJECTIVE:major|mission|Ridurre spese|soldi] Fatto! Ho salvato la missione nella dashboard con i primi obiettivi."

ALTRO ESEMPIO:
User: "sì salvalo" oppure "si!"
NUR: "[MISSION:...] [OBJECTIVE:...] Perfetto, salvato!"

{USER_CONTEXT}

CONVERSAZIONE RECENTE:
{RECENT_MESSAGES}

RICORDA: Se l'utente ha confermato, INCLUDI I COMANDI. Non rispondere mai solo con testo.
Rispondi in italiano.`

// ============================================
// HELPER: Costruisci contesto utente COMPLETO
// ============================================

async function buildUserContext(userId: string): Promise<UserContext> {
    try {
        // Query parallele per velocità
        const [profileResult, areasResult, memoriesResult, insightsResult] = await Promise.all([
            supabase
                .from('user_profiles')
                .select('full_name, age_range, communication_style')
                .eq('clerk_user_id', userId)
                .maybeSingle(),
            supabase
                .from('life_areas')
                .select('area_type, progress, priority, current_state, goal_state')
                .eq('clerk_user_id', userId),
            supabase
                .from('user_memory')
                .select('memory_type, content, importance, area_related')
                .eq('clerk_user_id', userId)
                .eq('is_current', true)
                .order('importance', { ascending: false })
                .limit(8),
            supabase
                .from('user_insights')
                .select('insight_type, content')
                .eq('clerk_user_id', userId)
                .order('created_at', { ascending: false })
                .limit(5)
        ])

        const userContext: UserContext = {}

        // Profilo utente
        if (profileResult.data) {
            userContext.profile = {
                full_name: profileResult.data.full_name,
                age_range: profileResult.data.age_range,
                communication_style: profileResult.data.communication_style
            }
        }

        // Aree vita
        if (areasResult.data?.length) {
            userContext.life_areas = areasResult.data.map((a: any) => ({
                area_type: a.area_type,
                progress: a.progress || 0,
                priority: a.priority || 5,
                current_state: a.current_state,
                goal_state: a.goal_state?.title
            }))
        }

        // Memorie recenti
        if (memoriesResult.data?.length) {
            userContext.recent_memories = memoriesResult.data.map((m: any) => ({
                memory_type: m.memory_type,
                content: m.content,
                importance: m.importance,
                area_related: m.area_related
            }))
        }

        // Insight recenti
        if (insightsResult.data?.length) {
            userContext.recent_insights = insightsResult.data.map((i: any) => ({
                insight_type: i.insight_type,
                content: i.content
            }))
        }

        return userContext
    } catch (error) {
        console.error('Context build error:', error)
        return {}
    }
}

// Versione stringa compatta per Sonnet (azioni)
function contextToString(ctx: UserContext): string {
    let str = ''
    if (ctx.profile?.full_name) str += `Utente: ${ctx.profile.full_name}. `
    if (ctx.recent_memories?.length) {
        str += `Ricordo: ${ctx.recent_memories.map(m => m.content).join('; ')}. `
    }
    if (ctx.life_areas?.length) {
        const areas = ctx.life_areas
            .filter(a => a.progress > 0 || a.goal_state)
            .map(a => `${a.area_type}:${a.progress}%`)
            .join(', ')
        if (areas) str += `Aree: ${areas}. `
    }
    return str || 'Nuovo utente.'
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

    // Parse [INSIGHT:category|content] - per salvare insight sull'utente
    const insightMatch = text.match(/\[INSIGHT:(\w+)\|([^\]]+)\]/)
    if (insightMatch) {
        const [, category, content] = insightMatch
        try {
            await supabase
                .from('user_insights')
                .insert({
                    clerk_user_id: userId,
                    category: category.trim(),
                    content: content.trim(),
                    importance: 7
                })
            console.log(`[NUR Action] Insight salvato: ${category} - ${content}`)
        } catch (e) {
            console.error('[NUR Action Error] Insight:', e)
        }
    }

    // Parse [MISSION:title|description|why] - per impostare missione principale
    const missionMatch = text.match(/\[MISSION:([^|]+)\|([^|]+)\|([^\]]+)\]/)
    if (missionMatch) {
        const [, title, description, why] = missionMatch
        try {
            // Upsert: aggiorna se esiste, crea se non esiste
            await supabase
                .from('user_mission')
                .upsert({
                    clerk_user_id: userId,
                    title: title.trim(),
                    description: description.trim(),
                    why: why.trim(),
                    status: 'active',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'clerk_user_id' })
            console.log(`[NUR Action] Missione impostata: ${title}`)
        } catch (e) {
            console.error('[NUR Action Error] Mission:', e)
        }
    }

    // Parse [OBJECTIVE:level|parent|title|areas] - per creare obiettivo
    const objectiveMatch = text.match(/\[OBJECTIVE:(\w+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/)
    if (objectiveMatch) {
        const [, level, parent, title, areasStr] = objectiveMatch
        try {
            // Trova mission_id dell'utente
            const { data: mission } = await supabase
                .from('user_mission')
                .select('id')
                .eq('clerk_user_id', userId)
                .single()

            // Trova parent_id se non è 'mission'
            let parentId = null
            if (parent !== 'mission' && parent !== 'null') {
                const { data: parentObj } = await supabase
                    .from('objectives')
                    .select('id')
                    .eq('clerk_user_id', userId)
                    .eq('title', parent.trim())
                    .single()
                parentId = parentObj?.id
            }

            const areas = areasStr.split(',').map(a => a.trim())

            await supabase
                .from('objectives')
                .insert({
                    clerk_user_id: userId,
                    mission_id: mission?.id,
                    parent_id: parentId,
                    level: level.trim(),
                    title: title.trim(),
                    related_areas: areas,
                    status: 'pending'
                })
            console.log(`[NUR Action] Obiettivo creato: ${title} (${level})`)
        } catch (e) {
            console.error('[NUR Action Error] Objective:', e)
        }
    }

    // Parse [PROGRESS:objective_title|value] - per aggiornare progresso
    const progressMatch = text.match(/\[PROGRESS:([^|]+)\|(\d+)\]/)
    if (progressMatch) {
        const [, objectiveTitle, value] = progressMatch
        try {
            // Trova obiettivo per titolo
            const { data: objective } = await supabase
                .from('objectives')
                .select('id')
                .eq('clerk_user_id', userId)
                .eq('title', objectiveTitle.trim())
                .single()

            if (objective) {
                await supabase
                    .from('objectives')
                    .update({
                        progress: parseInt(value),
                        current_value: parseInt(value),
                        status: parseInt(value) >= 100 ? 'completed' : 'active',
                        completed_at: parseInt(value) >= 100 ? new Date().toISOString() : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', objective.id)

                // Salva in storico
                await supabase
                    .from('progress_history')
                    .upsert({
                        clerk_user_id: userId,
                        objective_id: objective.id,
                        date: new Date().toISOString().split('T')[0],
                        value: parseInt(value)
                    }, { onConflict: 'objective_id,date' })

                console.log(`[NUR Action] Progresso aggiornato: ${objectiveTitle} → ${value}%`)
            }
        } catch (e) {
            console.error('[NUR Action Error] Progress:', e)
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
        .replace(/\[INSIGHT:[^\]]+\]/g, '')
        .replace(/\[MISSION:[^\]]+\]/g, '')
        .replace(/\[OBJECTIVE:[^\]]+\]/g, '')
        .replace(/\[PROGRESS:[^\]]+\]/g, '')
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
        const useSonnet = needsSonnet(message, history)
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
        const userContext = await buildUserContext(userId)
        const lastAction = await getLastAction(userId)
        const recentHistory = (history || []).slice(-4)

        let systemPrompt: string
        if (useSonnet) {
            // SONNET: prompt per azioni - usa contesto compatto + istruzioni azioni
            const recentMsgs = recentHistory
                .map((m: any) => `${m.role === 'user' ? 'User' : 'NUR'}: ${m.content}`)
                .join('\n')
            systemPrompt = SONNET_PROMPT
                .replace('{USER_CONTEXT}', contextToString(userContext))
                .replace('{RECENT_MESSAGES}', recentMsgs || 'Nessuna conversazione precedente')
        } else {
            // HAIKU: USA LA PERSONALITÀ COMPLETA DI NUR!
            // generateNurPrompt include tutta la storia, il carattere, le memorie dell'utente
            const nurPersonality = generateNurPrompt(userContext)

            // Aggiungi istruzioni operative specifiche per Haiku
            systemPrompt = `${nurPersonality}

---

## ISTRUZIONI OPERATIVE

${lastAction ? `[Ultima azione: ${lastAction}]` : ''}

IMPORTANTE: Se l'utente vuole SALVARE qualcosa (guide, task, traguardi, contenuti, viaggi),
digli: "Dimmi cosa vuoi che salvi e lo faccio subito!"
Keywords che attivano il salvataggio: salva, crea, aggiungi, metti, task, traguardo, contenuto, viaggio, piano.

Rispondi sempre in italiano. Max 1 emoji per messaggio.`
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
                                    .replace(/\[INSIGHT:[^\]]+\]/g, '')
                                    .replace(/\[MISSION:[^\]]+\]/g, '')
                                    .replace(/\[OBJECTIVE:[^\]]+\]/g, '')
                                    .replace(/\[PROGRESS:[^\]]+\]/g, '')

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
