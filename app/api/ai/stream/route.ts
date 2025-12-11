/**
 * NUR Streaming API Route - SISTEMA IBRIDO
 * Haiku 3.5 per chat normale (economico)
 * Sonnet 4 per azioni (affidabile)
 * Costo medio: ~$0.004/msg
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { getMissionPhase, buildMissionContext } from '@/lib/nur/mission'

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
    'insight', 'progress', 'avanzamento', 'capitolo', 'step',
    // Per conferme
    'dashboard', 'fallo', 'salvalo', 'ok fallo', 'sì fallo',
    // Per inserimento esplicito
    'macro', 'nuovo obiettivo', 'nuova missione', 'indipendente', '3000', 'mese'
]

const CONFIRMATION_PATTERNS = [
    /^s[iì]!?$/i,
    /^ok!?$/i,
    /^va bene!?$/i,
    /^fallo!?$/i,
    /^salvalo!?$/i,
    /^perfetto!?$/i,
    /^procedi!?$/i,
    /^certo!?$/i,
    /^dai!?$/i,
    /^facciamolo!?$/i
]

function needsSonnet(message: string, history?: any[]): boolean {
    const lowerMsg = message.toLowerCase().trim()

    if (ACTION_KEYWORDS.some(keyword => lowerMsg.includes(keyword))) {
        return true
    }

    if (history && history.length > 0) {
        if (CONFIRMATION_PATTERNS.some(pattern => pattern.test(lowerMsg))) {
            const lastNurMessage = [...history].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || ''
            if (lastNurMessage.includes('salv') ||
                lastNurMessage.includes('dashboard') ||
                lastNurMessage.includes('vuoi che') ||
                lastNurMessage.includes('lo faccio') ||
                lastNurMessage.includes('aggiungo') ||
                lastNurMessage.includes('creo') ||
                lastNurMessage.includes('capitoli') ||
                lastNurMessage.includes('step')) {
                return true
            }
        }
    }

    return false
}

// ============================================
// PROMPT HAIKU - Chat normale
// ============================================

const HAIKU_PROMPT = `Sei NUR, coach AI. Diretta, pratica, sfacciata. Max 1 emoji.

Sei qui per conversare, motivare, consigliare. Conosci l'utente e lo aiuti.

IMPORTANTE: Se l'utente vuole definire obiettivi, missioni, piani, task:
Digli che puoi aiutarlo e chiedi dettagli. Poi proponi di salvarlo nella dashboard.

{USER_CONTEXT}

{MISSION_CONTEXT}

{LAST_ACTION}

Rispondi in italiano, breve e diretto.`

// ============================================
// PROMPT SONNET - Azioni + Costruzione Missione
// ============================================

const SONNET_PROMPT = `Sei NUR in MODALITÀ AZIONE. Il tuo compito è INSERIRE DATI nel database usando i comandi.

## FASE ATTUALE: {MISSION_PHASE}

## REGOLA CRITICA - LEGGI ATTENTAMENTE:

Quando l'utente ti chiede di creare/inserire/salvare qualcosa, DEVI includere il comando appropriato nella tua risposta.
I comandi hanno questo formato: [COMANDO:parametro1|parametro2|...]
Il sistema backend legge questi comandi e li esegue. Se non li includi, NON viene salvato nulla!

## ESEMPI CORRETTI:

Utente: "Inserisci come missione diventare indipendente con 3000€/mese"
TU DEVI rispondere:
"Perfetto! Inserisco la tua missione. 🎯

[MISSION:Indipendenza finanziaria - 3000€/mese|Costruire un'attività che generi 3000€ mensili ricorrenti|Libertà economica e controllo del proprio tempo]

Fatto! Ora creiamo i capitoli per raggiungere questo obiettivo. Quali sono i macro-step che vedi?"

Utente: "Crea i capitoli: 1. Validare idea 2. Primi clienti 3. Scalare"
TU DEVI rispondere:
"Li aggiungo subito! 📋

[CHAPTER:Validare l'idea|Testare il mercato prima di investire tempo e risorse]
[CHAPTER:Primi 10 clienti|Acquisire i primi clienti paganti per validare il prodotto]
[CHAPTER:Scalare il business|Automatizzare e crescere in modo sostenibile]

Perfetto, tre capitoli solidi. Iniziamo dal primo?"

## COMANDI DISPONIBILI:

[MISSION:titolo|descrizione|perché] - Crea la missione principale
[CHAPTER:titolo|descrizione] - Crea un capitolo (macro-obiettivo)
[STEP:titolo_capitolo|titolo|descrizione] - Crea uno step dentro un capitolo
[TASK:titolo_step|titolo|descrizione] - Crea una task dentro uno step
[COMPLETE:titolo] - Marca come completato
[INSIGHT:tipo|contenuto] - Salva un insight (problem/desire/fear/strength)
[MEMORY:tipo|contenuto] - Salva una memoria sull'utente

## COMPORTAMENTO PER FASE:

- **DISCOVERY**: Raccogli info, usa [INSIGHT:...] per salvare
- **MISSION**: Proponi e poi USA [MISSION:...] per creare
- **CHAPTERS**: Proponi e poi USA [CHAPTER:...] per ogni capitolo
- **STEPS**: Proponi e poi USA [STEP:...] per ogni step
- **TASK**: Proponi e poi USA [TASK:...] per la task
- **ACTIVE**: Supporta, usa [COMPLETE:...] quando finito

## CONTESTO ATTUALE:

{USER_CONTEXT}

{MISSION_CONTEXT}

## CONVERSAZIONE RECENTE:
{RECENT_MESSAGES}

IMPORTANTE: Quando l'utente chiede di inserire/creare/salvare, INCLUDI SEMPRE I COMANDI nella risposta!
Rispondi in italiano, breve e diretto.`

// ============================================
// HELPER: Costruisci contesto utente compatto
// ============================================

async function buildCompactContext(userId: string): Promise<string> {
    try {
        const [areasResult, memoriesResult] = await Promise.all([
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
                .limit(5)
        ])

        let context = ''

        if (areasResult.data?.length) {
            const areasInfo = areasResult.data
                .filter((a: any) => a.progress > 0 || a.goal_state?.title)
                .map((a: any) => `${a.area_type}:${a.progress}%${a.goal_state?.title ? ` (goal: ${a.goal_state.title})` : ''}`)
                .join(', ')
            if (areasInfo) context += `Aree: ${areasInfo}. `
        }

        if (memoriesResult.data?.length) {
            const memories = memoriesResult.data
                .map((m: any) => m.content)
                .join('; ')
            context += `Ricordo: ${memories}. `
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
    // Parse [INSIGHT:tipo|contenuto]
    const insightMatches = text.matchAll(/\[INSIGHT:(\w+)\|([^\]]+)\]/g)
    for (const match of insightMatches) {
        const [, category, content] = match
        try {
            await supabase.from('user_insights').insert({
                clerk_user_id: userId,
                category: category.trim(),
                content: content.trim(),
                importance: 7,
                used_for_mission: false
            })
            console.log(`[NUR Action] Insight salvato: ${category} - ${content}`)
        } catch (e) {
            console.error('[NUR Action Error] Insight:', e)
        }
    }

    // Parse [MISSION:title|description|why]
    const missionMatch = text.match(/\[MISSION:([^|]+)\|([^|]+)\|([^\]]+)\]/)
    if (missionMatch) {
        const [, title, description, why] = missionMatch
        try {
            // Prima marca gli insight come usati
            await supabase
                .from('user_insights')
                .update({ used_for_mission: true })
                .eq('clerk_user_id', userId)
                .eq('used_for_mission', false)

            // Crea/aggiorna missione
            await supabase.from('user_mission').upsert({
                clerk_user_id: userId,
                title: title.trim(),
                description: description.trim(),
                why: why.trim(),
                status: 'active',
                updated_at: new Date().toISOString()
            }, { onConflict: 'clerk_user_id' })
            console.log(`[NUR Action] Missione creata: ${title}`)
        } catch (e) {
            console.error('[NUR Action Error] Mission:', e)
        }
    }

    // Parse [CHAPTER:title|description]
    const chapterMatches = text.matchAll(/\[CHAPTER:([^|]+)\|([^\]]+)\]/g)
    let chapterIndex = 0
    for (const match of chapterMatches) {
        const [, title, description] = match
        try {
            // Trova mission_id
            const { data: mission } = await supabase
                .from('user_mission')
                .select('id')
                .eq('clerk_user_id', userId)
                .eq('status', 'active')
                .single()

            if (mission) {
                // Conta capitoli esistenti
                const { count } = await supabase
                    .from('objectives')
                    .select('*', { count: 'exact', head: true })
                    .eq('clerk_user_id', userId)
                    .eq('mission_id', mission.id)
                    .eq('level', 'major')

                await supabase.from('objectives').insert({
                    clerk_user_id: userId,
                    mission_id: mission.id,
                    level: 'major',
                    title: title.trim(),
                    description: description.trim(),
                    status: (count || 0) === 0 && chapterIndex === 0 ? 'active' : 'pending',
                    progress: 0,
                    sort_order: (count || 0) + chapterIndex + 1
                })
                console.log(`[NUR Action] Capitolo creato: ${title}`)
                chapterIndex++
            }
        } catch (e) {
            console.error('[NUR Action Error] Chapter:', e)
        }
    }

    // Parse [STEP:parent_title|title|description]
    const stepMatches = text.matchAll(/\[STEP:([^|]+)\|([^|]+)\|([^\]]+)\]/g)
    let stepIndex = 0
    for (const match of stepMatches) {
        const [, parentTitle, title, description] = match
        try {
            // Trova parent (capitolo)
            const { data: parent } = await supabase
                .from('objectives')
                .select('id, mission_id')
                .eq('clerk_user_id', userId)
                .eq('title', parentTitle.trim())
                .eq('level', 'major')
                .single()

            if (parent) {
                // Conta step esistenti
                const { count } = await supabase
                    .from('objectives')
                    .select('*', { count: 'exact', head: true })
                    .eq('parent_id', parent.id)
                    .eq('level', 'sub')

                await supabase.from('objectives').insert({
                    clerk_user_id: userId,
                    mission_id: parent.mission_id,
                    parent_id: parent.id,
                    level: 'sub',
                    title: title.trim(),
                    description: description.trim(),
                    status: (count || 0) === 0 && stepIndex === 0 ? 'active' : 'pending',
                    progress: 0,
                    sort_order: (count || 0) + stepIndex + 1
                })
                console.log(`[NUR Action] Step creato: ${title}`)
                stepIndex++
            }
        } catch (e) {
            console.error('[NUR Action Error] Step:', e)
        }
    }

    // Parse [TASK:parent_title|title|description]
    const taskMatches = text.matchAll(/\[TASK:([^|]+)\|([^|]+)\|([^\]]+)\]/g)
    let taskIndex = 0
    for (const match of taskMatches) {
        const [, parentTitle, title, description] = match
        try {
            // Trova parent (step)
            const { data: parent } = await supabase
                .from('objectives')
                .select('id, mission_id')
                .eq('clerk_user_id', userId)
                .eq('title', parentTitle.trim())
                .eq('level', 'sub')
                .single()

            if (parent) {
                // Conta task esistenti
                const { count } = await supabase
                    .from('objectives')
                    .select('*', { count: 'exact', head: true })
                    .eq('parent_id', parent.id)
                    .eq('level', 'task')

                await supabase.from('objectives').insert({
                    clerk_user_id: userId,
                    mission_id: parent.mission_id,
                    parent_id: parent.id,
                    level: 'task',
                    title: title.trim(),
                    description: description.trim(),
                    status: (count || 0) === 0 && taskIndex === 0 ? 'active' : 'pending',
                    progress: 0,
                    sort_order: (count || 0) + taskIndex + 1
                })
                console.log(`[NUR Action] Task creata: ${title}`)
                taskIndex++
            }
        } catch (e) {
            console.error('[NUR Action Error] Task:', e)
        }
    }

    // Parse [COMPLETE:title]
    const completeMatch = text.match(/\[COMPLETE:([^\]]+)\]/)
    if (completeMatch) {
        const [, title] = completeMatch
        try {
            await supabase
                .from('objectives')
                .update({
                    status: 'completed',
                    progress: 100,
                    completed_at: new Date().toISOString()
                })
                .eq('clerk_user_id', userId)
                .eq('title', title.trim())
            console.log(`[NUR Action] Completato: ${title}`)
        } catch (e) {
            console.error('[NUR Action Error] Complete:', e)
        }
    }

    // Parse [PROGRESS:title|value]
    const progressMatch = text.match(/\[PROGRESS:([^|]+)\|(\d+)\]/)
    if (progressMatch) {
        const [, title, value] = progressMatch
        try {
            await supabase
                .from('objectives')
                .update({
                    progress: parseInt(value),
                    status: parseInt(value) >= 100 ? 'completed' : 'active'
                })
                .eq('clerk_user_id', userId)
                .eq('title', title.trim())
            console.log(`[NUR Action] Progresso: ${title} → ${value}%`)
        } catch (e) {
            console.error('[NUR Action Error] Progress:', e)
        }
    }

    // Parse [SAVE:tipo|titolo|contenuto]
    const saveMatch = text.match(/\[SAVE:(\w+)\|([^|]+)\|([^\]]+)\]/)
    if (saveMatch) {
        const [, type, title, content] = saveMatch
        try {
            await supabase.from('journal_entries').insert({
                clerk_user_id: userId,
                entry_type: type,
                title: title.trim(),
                content: content.trim(),
                metadata: { added_by: 'nur', is_material: true }
            })
            console.log(`[NUR Action] Materiale salvato: ${title}`)
        } catch (e) {
            console.error('[NUR Action Error] Save:', e)
        }
    }

    // Parse [MEMORY:tipo|contenuto]
    const memoryMatch = text.match(/\[MEMORY:(\w+)\|([^\]]+)\]/)
    if (memoryMatch) {
        const [, type, content] = memoryMatch
        try {
            await supabase.from('user_memory').insert({
                clerk_user_id: userId,
                memory_type: type,
                content: content.trim(),
                importance: 7,
                confidence: 8,
                is_current: true
            })
            console.log(`[NUR Action] Memoria salvata: ${content}`)
        } catch (e) {
            console.error('[NUR Action Error] Memory:', e)
        }
    }

    // Legacy: Parse [OBJECTIVE:level|parent|title|areas]
    const objectiveMatch = text.match(/\[OBJECTIVE:(\w+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/)
    if (objectiveMatch) {
        const [, level, parent, title, areasStr] = objectiveMatch
        try {
            const { data: mission } = await supabase
                .from('user_mission')
                .select('id')
                .eq('clerk_user_id', userId)
                .single()

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

            await supabase.from('objectives').insert({
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
}

// ============================================
// HELPER: Pulisci risposta dai comandi
// ============================================

function cleanResponse(text: string): string {
    return text
        .replace(/\[INSIGHT:[^\]]+\]/g, '')
        .replace(/\[MISSION:[^\]]+\]/g, '')
        .replace(/\[CHAPTER:[^\]]+\]/g, '')
        .replace(/\[STEP:[^\]]+\]/g, '')
        .replace(/\[TASK:[^\]]+\]/g, '')
        .replace(/\[COMPLETE:[^\]]+\]/g, '')
        .replace(/\[PROGRESS:[^\]]+\]/g, '')
        .replace(/\[SAVE:[^\]]+\]/g, '')
        .replace(/\[MEMORY:[^\]]+\]/g, '')
        .replace(/\[OBJECTIVE:[^\]]+\]/g, '')
        .replace(/\[GOAL:[^\]]+\]/g, '')
        .replace(/\[MOOD:[^\]]+\]/g, '')
        .trim()
}

// ============================================
// HELPER: Recupera ultima azione
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

        // 1. ROUTING: HAIKU O SONNET?
        const useSonnet = needsSonnet(message, history)
        const modelToUse = useSonnet ? 'claude-sonnet-4-20250514' : 'claude-3-5-haiku-latest'
        console.log(`[NUR ROUTER] Message: "${message.substring(0, 50)}..." → ${useSonnet ? 'SONNET (azione)' : 'HAIKU (chat)'}`)

        // 2. GESTIONE CONVERSAZIONE
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

        // 3. COSTRUISCI CONTESTI
        const userContext = await buildCompactContext(userId)
        const missionPhase = await getMissionPhase(userId)
        const missionContext = await buildMissionContext(userId)
        const lastAction = await getLastAction(userId)
        const recentHistory = (history || []).slice(-6)

        // 4. COSTRUISCI PROMPT
        let systemPrompt: string
        if (useSonnet) {
            const recentMsgs = recentHistory
                .map((m: any) => `${m.role === 'user' ? 'User' : 'NUR'}: ${m.content}`)
                .join('\n')
            systemPrompt = SONNET_PROMPT
                .replace('{USER_CONTEXT}', userContext)
                .replace('{MISSION_PHASE}', missionPhase)
                .replace('{MISSION_CONTEXT}', missionContext)
                .replace('{RECENT_MESSAGES}', recentMsgs || 'Nessuna conversazione precedente')
        } else {
            systemPrompt = HAIKU_PROMPT
                .replace('{USER_CONTEXT}', userContext)
                .replace('{MISSION_CONTEXT}', missionContext)
                .replace('{LAST_ACTION}', lastAction)
        }

        // 5. PREPARA MESSAGGI
        const messages: Anthropic.MessageParam[] = [
            ...recentHistory.map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            { role: 'user', content: message }
        ]

        // 6. STREAMING
        const encoder = new TextEncoder()
        let fullResponse = ''
        let pendingBuffer = ''

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    if (conversationId && !existingConvId) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`))
                    }

                    const stream = anthropic.messages.stream({
                        model: modelToUse,
                        max_tokens: useSonnet ? 1200 : 500,
                        system: systemPrompt,
                        messages
                    })

                    for await (const event of stream) {
                        if (event.type === 'content_block_delta') {
                            const delta = event.delta as any
                            if (delta.type === 'text_delta' && delta.text) {
                                fullResponse += delta.text
                                pendingBuffer += delta.text

                                let textToSend = pendingBuffer
                                const lastOpenBracket = textToSend.lastIndexOf('[')
                                const lastCloseBracket = textToSend.lastIndexOf(']')

                                if (lastOpenBracket > lastCloseBracket) {
                                    // C'è un comando aperto, tieni il buffer
                                    textToSend = pendingBuffer.substring(0, lastOpenBracket)
                                    pendingBuffer = pendingBuffer.substring(lastOpenBracket)
                                } else {
                                    pendingBuffer = ''
                                }

                                const cleanText = cleanResponse(textToSend)
                                if (cleanText) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanText })}\n\n`))
                                }
                            }
                        }
                    }

                    // IMPORTANTE: Svuota il buffer residuo alla fine dello streaming
                    if (pendingBuffer) {
                        const cleanText = cleanResponse(pendingBuffer)
                        if (cleanText) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanText })}\n\n`))
                        }
                        pendingBuffer = ''
                    }

                    // Log costi
                    const finalMessage = await stream.finalMessage()
                    if (finalMessage.usage) {
                        const isHaiku = modelToUse.includes('haiku')
                        const inputRate = isHaiku ? 0.001 : 0.003
                        const outputRate = isHaiku ? 0.005 : 0.015
                        const inputCost = (finalMessage.usage.input_tokens * inputRate) / 1000
                        const outputCost = (finalMessage.usage.output_tokens * outputRate) / 1000
                        const totalCost = inputCost + outputCost
                        console.log(`[NUR COST] Model: ${modelToUse} | In: ${finalMessage.usage.input_tokens} | Out: ${finalMessage.usage.output_tokens} | Cost: $${totalCost.toFixed(6)}`)
                    }

                    // 7. ESEGUI AZIONI
                    if (useSonnet && fullResponse.includes('[')) {
                        console.log('[NUR ACTION] Executing commands from Sonnet response')
                        await executeActions(fullResponse, userId)
                    }

                    // 8. SALVA RISPOSTA
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
                            .update({ updated_at: new Date().toISOString() })
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
