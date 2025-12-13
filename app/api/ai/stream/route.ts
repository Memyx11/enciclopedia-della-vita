/**
 * NUR Streaming API Route - SISTEMA IBRIDO
 * Haiku 3.5 per chat normale (economico)
 * Sonnet 4 per azioni (affidabile)
 * Costo medio: ~$0.004/msg
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { getDiscoveryState } from '@/lib/nur/discovery'
import { getActiveQuest } from '@/lib/quest-system'
import { generateNurPrompt as generateUnifiedPrompt } from "@/lib/nur/prompt"
import { parseToolCalls, executeToolCalls, cleanToolCalls } from "@/lib/nur/tools"

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
    'macro', 'nuovo obiettivo', 'nuova missione', 'indipendente', '3000', 'mese',
    // Per materiali
    'materiale', 'materiali', 'script', 'documento', 'link', 'video', 'checklist', 'template',
    'scrivania', 'risorsa', 'risorse'
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

function needsSonnet(message: string, history?: any[], isDiscoveryMode: boolean = false): boolean {
    const lowerMsg = message.toLowerCase().trim()

    // IN DISCOVERY MODE: usa Sonnet SOLO per conferme esplicite di creare missione
    // NON per parole generiche come "piano", "obiettivo", ecc.
    if (isDiscoveryMode) {
        // Solo se l'utente conferma esplicitamente di voler creare la missione
        if (CONFIRMATION_PATTERNS.some(pattern => pattern.test(lowerMsg))) {
            const lastNurMessage = [...(history || [])].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || ''
            // Solo se NUR ha proposto di creare la missione
            if (lastNurMessage.includes('missione') &&
                (lastNurMessage.includes('vuoi che') ||
                 lastNurMessage.includes('creo') ||
                 lastNurMessage.includes('inserisco'))) {
                return true
            }
        }
        // Comandi espliciti di inserimento
        if (lowerMsg.includes('inserisci') || lowerMsg.includes('crea la missione') || lowerMsg.includes('salvala')) {
            return true
        }
        // Altrimenti resta in Haiku per discovery
        return false
    }

    // FUORI DISCOVERY: comportamento normale
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
// HELPER: Pulisci risposta dai comandi
// ============================================

function cleanResponse(text: string, isFinal: boolean = false): string {
    // Rimuovi i TOOL calls dal testo (formato: [TOOL:nome]{json}[/TOOL])
    let cleaned = cleanToolCalls(text)
    
    // IMPORTANTE: NON fare trim() durante lo streaming per preservare gli spazi
    // Trim solo alla fine del messaggio completo
    return isFinal ? cleaned.trim() : cleaned
}


// ============================================
// MAIN: POST Handler
// ============================================

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { message, userId, history, conversationId: existingConvId, area, isInitialMessage } = body

        if (!message || !userId) {
            return new Response(JSON.stringify({ error: 'Parametri mancanti' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Determina se NUR deve iniziare la conversazione
        const isNurStarting = message === '__NUR_START_CONVERSATION__' || isInitialMessage

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        })

        // 1. CHECK DISCOVERY MODE PRIMA del routing
        const discoveryState = await getDiscoveryState(userId)
        const isDiscoveryMode = discoveryState.isNewUser
        console.log(`[NUR] Discovery mode: ${isDiscoveryMode}, insights: ${discoveryState.insightCount}`)

        // 2. ROUTING: HAIKU O SONNET?
        // Discovery Mode = SEMPRE Sonnet (per garantire che i comandi [PROFILE:...] vengano usati correttamente)
        // Sonnet è più costoso ma segue meglio le istruzioni sui comandi
        const useSonnet = isDiscoveryMode || needsSonnet(message, history, isDiscoveryMode)
        const modelToUse = useSonnet ? 'claude-sonnet-4-20250514' : 'claude-3-5-haiku-latest'
        console.log(`[NUR ROUTER] ${isNurStarting ? 'NUR STARTING' : `Message: "${message.substring(0, 50)}..."`} → ${useSonnet ? 'SONNET' : 'HAIKU'} (Discovery: ${isDiscoveryMode})`)

        // 3. GESTIONE CONVERSAZIONE
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

        // Salva messaggio utente (solo se NON è NUR che inizia)
        if (conversationId && !isNurStarting) {
            await supabase.from('messages').insert({
                conversation_id: conversationId,
                clerk_user_id: userId,
                role: 'user',
                content: message,
                area_type: area || 'generale'
            })
        }

        // 4. COSTRUISCI CONTESTI
        const recentHistory = (history || []).slice(-6)

        // 5. COSTRUISCI PROMPT
        // PROMPT UNIFICATO - Usa sempre il nuovo sistema con TOOLS
        const activeQuest = await getActiveQuest(userId)
        console.log('[NUR] Generating unified prompt. Quest:', activeQuest?.title || 'none')

        const systemPrompt = await generateUnifiedPrompt(userId, activeQuest)

                // 5. PREPARA MESSAGGI
        let messages: Anthropic.MessageParam[]

        if (isNurStarting) {
            // NUR inizia: usa un messaggio che le dice di presentarsi
            messages = [
                { role: 'user', content: '[L\'utente è appena entrato in chat. Salutalo per primo con il suo nome se lo conosci, presentati brevemente come NUR e fagli una domanda aperta per iniziare a conoscerlo. Sii calda e accogliente ma non smielata.]' }
            ]
        } else {
            messages = [
                ...recentHistory.map((m: any) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content
                })),
                { role: 'user', content: message }
            ]
        }

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

                                // Durante streaming: NON fare trim per preservare gli spazi
                                const cleanText = cleanResponse(textToSend, false)
                                if (cleanText) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanText })}\n\n`))
                                }
                            }
                        }
                    }

                    // IMPORTANTE: Svuota il buffer residuo alla fine dello streaming
                    if (pendingBuffer) {
                        const cleanText = cleanResponse(pendingBuffer, false)
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
                    // Esegui SEMPRE i comandi se presenti (sia Sonnet che Haiku)
                    const hasToolCalls = fullResponse.includes('[TOOL:')

                    if (hasToolCalls) {
                        console.log('[NUR TOOLS] Found tool calls, executing...')
                        const toolCalls = parseToolCalls(fullResponse)
                        console.log('[NUR TOOLS] Parsed:', toolCalls.length, 'tools')
                        const results = await executeToolCalls(userId, toolCalls)
                        console.log('[NUR TOOLS] Results:', results)
                    }

                    // 7b. CHECK QUEST COMPLETION
                    // Dopo ogni risposta, controlla se qualche quest è completabile
                    try {
                        const { checkAllQuests } = await import('@/lib/quest-system')
                        const completedQuests = await checkAllQuests(userId)
                        if (completedQuests.length > 0) {
                            console.log(`[NUR QUEST] Quests completed: ${completedQuests.join(', ')}`)
                        }
                    } catch (questError) {
                        console.error('[NUR QUEST] Error checking quests:', questError)
                    }

                    // 8. SALVA RISPOSTA (con trim finale)
                    const cleanedResponse = cleanResponse(fullResponse, true)
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

