/**
 * NUR Chat API - Main chat endpoint with message limits
 * 3 messaggi/giorno FREE, 20 messaggi/giorno PRO
 */

import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { generateNurPrompt } from '@/lib/nur/prompt'
import { processToolCalls } from '@/lib/nur/tools'

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

// Limiti messaggi
const MESSAGE_LIMITS = {
    free: 3,
    pro: 20
}

interface MessageRequest {
    message: string
    history?: { role: 'user' | 'assistant'; content: string }[]
    isInitialMessage?: boolean
}

/**
 * Controlla e aggiorna il contatore messaggi giornaliero
 */
async function checkMessageLimit(clerkUserId: string): Promise<{
    allowed: boolean
    count: number
    limit: number
    remaining: number
    isPro: boolean
}> {
    const today = new Date().toISOString().split('T')[0]

    // Get profile with message counts
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('messages_today, messages_reset_at, subscription_tier')
        .eq('clerk_user_id', clerkUserId)
        .single()

    if (error || !profile) {
        // Se non esiste profilo, consenti comunque (onboarding)
        return { allowed: true, count: 0, limit: MESSAGE_LIMITS.free, remaining: MESSAGE_LIMITS.free, isPro: false }
    }

    const isPro = profile.subscription_tier === 'pro'
    const limit = isPro ? MESSAGE_LIMITS.pro : MESSAGE_LIMITS.free

    // Controlla se bisogna resettare il contatore (nuovo giorno)
    const lastReset = profile.messages_reset_at ? new Date(profile.messages_reset_at).toISOString().split('T')[0] : null

    if (lastReset !== today) {
        // Nuovo giorno, resetta contatore
        await supabaseAdmin
            .from('profiles')
            .update({
                messages_today: 1,
                messages_reset_at: new Date().toISOString()
            })
            .eq('clerk_user_id', clerkUserId)

        return { allowed: true, count: 1, limit, remaining: limit - 1, isPro }
    }

    const currentCount = profile.messages_today || 0

    if (currentCount >= limit) {
        return { allowed: false, count: currentCount, limit, remaining: 0, isPro }
    }

    // Incrementa contatore
    await supabaseAdmin
        .from('profiles')
        .update({ messages_today: currentCount + 1 })
        .eq('clerk_user_id', clerkUserId)

    return {
        allowed: true,
        count: currentCount + 1,
        limit,
        remaining: limit - currentCount - 1,
        isPro
    }
}

/**
 * Salva messaggio nel database
 */
async function saveMessage(
    clerkUserId: string,
    role: 'user' | 'assistant',
    content: string
): Promise<void> {
    try {
        await supabaseAdmin
            .from('chat_messages')
            .insert({
                clerk_user_id: clerkUserId,
                conversation_id: `main_${clerkUserId}`,
                role,
                content,
                tokens_used: null
            })
    } catch (error) {
        console.error('Error saving message:', error)
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Non autorizzato' },
                { status: 401 }
            )
        }

        const { message, history = [], isInitialMessage = false }: MessageRequest = await req.json()

        // Skip limit check for initial NUR greeting
        if (!isInitialMessage) {
            // Controlla limite messaggi
            const limitCheck = await checkMessageLimit(userId)

            if (!limitCheck.allowed) {
                const upgradeMsg = limitCheck.isPro
                    ? 'Hai raggiunto il limite di 20 messaggi per oggi. Torna domani!'
                    : 'Hai usato i tuoi 3 messaggi gratuiti di oggi. Passa a PRO per 20 messaggi al giorno!'

                return NextResponse.json({
                    error: 'limit_reached',
                    message: upgradeMsg,
                    count: limitCheck.count,
                    limit: limitCheck.limit,
                    remaining: 0
                }, { status: 429 })
            }
        }

        // Genera system prompt con contesto utente
        const systemPrompt = await generateNurPrompt(userId)

        // Costruisci i messaggi per Claude
        const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = [
            ...history,
        ]

        // Se è il messaggio iniziale, chiedi a NUR di iniziare la conversazione
        if (isInitialMessage) {
            claudeMessages.push({
                role: 'user',
                content: 'Inizia una nuova conversazione con me. Salutami in modo naturale basandoti su quello che sai di me e sul momento della giornata.'
            })
        } else {
            claudeMessages.push({
                role: 'user',
                content: message
            })

            // Salva messaggio utente
            await saveMessage(userId, 'user', message)
        }

        // Stream response
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let fullResponse = ''

                    const response = await client.messages.create({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 1024,
                        system: systemPrompt,
                        messages: claudeMessages,
                        stream: true
                    })

                    for await (const event of response) {
                        if (event.type === 'content_block_delta') {
                            const delta = event.delta as { type: string; text?: string }
                            if (delta.type === 'text_delta' && delta.text) {
                                fullResponse += delta.text
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
                                )
                            }
                        }
                    }

                    // Processa tool calls nella risposta
                    const { cleanText, toolCalls } = processToolCalls(fullResponse, userId)

                    // Salva risposta NUR (testo pulito)
                    await saveMessage(userId, 'assistant', cleanText)

                    // Segnala completamento
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ done: true, toolCalls: toolCalls.length })}\n\n`)
                    )

                    controller.close()
                } catch (error) {
                    console.error('Stream error:', error)
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
                    )
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })

    } catch (error) {
        console.error('NUR Chat API Error:', error)
        return NextResponse.json(
            { error: 'Errore interno' },
            { status: 500 }
        )
    }
}
