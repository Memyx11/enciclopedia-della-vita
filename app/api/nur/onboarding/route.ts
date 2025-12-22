import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateOnboardingPrompt } from '@/lib/nur/prompt'
import { parseToolCalls, executeToolCalls, cleanToolCalls } from '@/lib/nur/tools'
import { supabaseAdmin } from '@/lib/supabase/client'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
})

interface Message {
    role: 'user' | 'assistant'
    content: string
}

/**
 * I 6 step dell'onboarding dal GDD:
 * 1. L'Incontro - NUR si presenta
 * 2. Il Nome - Chi sei?
 * 3. La Prima Sfida - Cosa rimandi?
 * 4. Mappa Veloce - Le tue aree
 * 5. Primo Obiettivo - Da dove parti
 * 6. Il Patto - Le regole tra noi
 */

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const { message, step, history, collectedContext } = await req.json() as {
            message: string
            step: number
            history: Message[]
            collectedContext: string
        }

        // Generate onboarding prompt con contesto raccolto
        const systemPrompt = await generateOnboardingPrompt(userId, step, collectedContext)

        // Add step context
        const stepContext = getStepContext(step)

        // Build messages for Claude
        const claudeMessages = message === '__START__'
            ? [{ role: 'user' as const, content: 'Ciao, sono pronto per iniziare.' }]
            : [
                ...history.map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                })),
                { role: 'user' as const, content: message }
            ]

        // Create streaming response
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let fullResponse = ''

                    // Call Claude with streaming
                    const streamResponse = await anthropic.messages.stream({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 1024,
                        system: `${systemPrompt}\n\n${stepContext}`,
                        messages: claudeMessages
                    })

                    // Process stream
                    for await (const event of streamResponse) {
                        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                            const text = event.delta.text
                            fullResponse += text

                            // Send chunk (filter out tool calls in real-time)
                            const cleanText = text.replace(/\[TOOL:\w+\][\s\S]*?\[\/TOOL\]/g, '')
                            if (cleanText) {
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ text: cleanText })}\n\n`
                                ))
                            }
                        }
                    }

                    // Process complete response
                    const toolCalls = parseToolCalls(fullResponse)
                    let extractedData: Record<string, any> = {}

                    if (toolCalls.length > 0) {
                        await executeToolCalls(userId, toolCalls)

                        // Extract data for preview panel
                        for (const call of toolCalls) {
                            if (call.tool === 'update_profile') {
                                const { field, value } = call.params as { field: string; value: string }
                                if (field === 'full_name') extractedData.name = value
                            }
                            if (call.tool === 'save_memory') {
                                const { type, content } = call.params as { type: string; content: string }
                                if (type === 'struggle') extractedData.struggle = content
                                if (type === 'preference' && content.toLowerCase().includes('area')) {
                                    // Parse areas from memory
                                    extractedData.areas = content
                                }
                            }
                            if (call.tool === 'create_goal') {
                                const { title } = call.params as { title: string }
                                extractedData.firstGoal = title
                            }
                        }
                    }

                    // Determine next step based on current step and tool calls
                    const nextStep = determineNextStep(step, toolCalls, fullResponse)

                    // Update onboarding progress in database
                    if (nextStep > step) {
                        await supabaseAdmin
                            .from('profiles')
                            .update({
                                onboarding_step: nextStep,
                                updated_at: new Date().toISOString()
                            })
                            .eq('clerk_user_id', userId)
                    }

                    // Check if onboarding is complete (step 6 done)
                    const complete = step === 6 && nextStep > 6

                    if (complete) {
                        // Mark onboarding as completed
                        await supabaseAdmin
                            .from('profiles')
                            .update({
                                onboarding_completed: true,
                                onboarding_step: 6,
                                updated_at: new Date().toISOString()
                            })
                            .eq('clerk_user_id', userId)
                    }

                    // Send final event with metadata
                    controller.enqueue(encoder.encode(
                        `data: ${JSON.stringify({
                            done: true,
                            extractedData,
                            nextStep: nextStep > step ? nextStep : null,
                            complete
                        })}\n\n`
                    ))

                    controller.close()
                } catch (error) {
                    console.error('Stream error:', error)
                    controller.enqueue(encoder.encode(
                        `data: ${JSON.stringify({ error: 'Errore nella risposta' })}\n\n`
                    ))
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })
    } catch (error) {
        console.error('Onboarding API error:', error)
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

/**
 * Contesto specifico per ogni step dell'onboarding
 */
function getStepContext(step: number): string {
    switch (step) {
        case 1:
            return `
**STEP ATTUALE: L'Incontro (1/6)**
Obiettivo: Presentati come NUR. Accogli l'utente con calore e mistero.
Spiega brevemente chi sei (una guida, non un'app) e cosa farete insieme.
NON usare ancora tool - solo conversazione.
Quando l'utente risponde con interesse, si passa allo step 2.
`
        case 2:
            return `
**STEP ATTUALE: Il Nome (2/6)**
Obiettivo: Scoprire il nome dell'utente e qualcosa su di lui/lei.
Chiedi come vuole essere chiamato/a.
Quando hai il nome, usa:
[TOOL:update_profile]{"field": "full_name", "value": "Nome"}[/TOOL]
Poi passa allo step 3.
`
        case 3:
            return `
**STEP ATTUALE: La Prima Sfida (3/6)**
Obiettivo: Identificare cosa l'utente rimanda, il suo "blocco" principale.
Chiedi: "Cosa rimandi sempre? Qual è quella cosa che sai che dovresti fare ma continui a procrastinare?"
Quando l'utente condivide, salva come memoria:
[TOOL:save_memory]{"type": "struggle", "content": "descrizione del blocco", "importance": 8}[/TOOL]
`
        case 4:
            return `
**STEP ATTUALE: Mappa Veloce (4/6)**
Obiettivo: Fare una panoramica veloce delle 10 aree della vita.
Le aree sono: Finanze, Carriera, Formazione, Salute, Spiritualità, Relazioni, Casa, Hobby, Esperienze, Sociale.
Chiedi brevemente come si sente in 2-3 aree chiave (non tutte 10!).
Salva le preferenze come memoria:
[TOOL:save_memory]{"type": "preference", "content": "Area X: descrizione stato", "importance": 6}[/TOOL]
`
        case 5:
            return `
**STEP ATTUALE: Primo Obiettivo (5/6)**
Obiettivo: Creare il primo goal concreto partendo dalla sfida identificata.
Proponi di trasformare il "blocco" in un obiettivo specifico e raggiungibile.
Quando l'utente approva, crea il goal:
[TOOL:create_goal]{"title": "...", "type": "obiettivo", "area": "slug_area", "description": "...", "is_primary": true}[/TOOL]
`
        case 6:
            return `
**STEP ATTUALE: Il Patto (6/6)**
Obiettivo: Stabilire le "regole del gioco" e suggellare il patto.
Spiega brevemente:
- Il sistema delle vite (3 vite, attenzione!)
- I punti XP e i livelli
- Il Boss Task quotidiano
- Che NUR sarà sempre lì, ma non giudica

Chiudi con una frase poetica di incoraggiamento.
Quando l'utente accetta/è pronto, salva una memoria di commitment:
[TOOL:save_memory]{"type": "achievement", "content": "Ha accettato il Patto di NUR", "importance": 10}[/TOOL]

Dopo questo tool, l'onboarding è COMPLETO.
`
        default:
            return ''
    }
}

/**
 * Determina se passare allo step successivo
 */
function determineNextStep(
    currentStep: number,
    toolCalls: { tool: string; params: Record<string, any> }[],
    fullResponse: string
): number {
    switch (currentStep) {
        case 1:
            // Step 1 -> 2: quando NUR ha finito di presentarsi e l'utente ha risposto
            // Basta che ci sia una risposta per progredire
            return 2

        case 2:
            // Step 2 -> 3: quando il nome è stato salvato
            if (toolCalls.some(t => t.tool === 'update_profile' && t.params.field === 'full_name')) {
                return 3
            }
            return currentStep

        case 3:
            // Step 3 -> 4: quando la sfida/struggle è stata salvata
            if (toolCalls.some(t => t.tool === 'save_memory' && t.params.type === 'struggle')) {
                return 4
            }
            return currentStep

        case 4:
            // Step 4 -> 5: quando almeno una area è stata mappata
            if (toolCalls.some(t => t.tool === 'save_memory' && t.params.type === 'preference')) {
                return 5
            }
            return currentStep

        case 5:
            // Step 5 -> 6: quando il primo goal è stato creato
            if (toolCalls.some(t => t.tool === 'create_goal')) {
                return 6
            }
            return currentStep

        case 6:
            // Step 6 -> complete: quando il patto è stato salvato come achievement
            if (toolCalls.some(t => t.tool === 'save_memory' && t.params.type === 'achievement')) {
                return 7 // Signal completion
            }
            return currentStep

        default:
            return currentStep
    }
}
