import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateOnboardingPrompt } from '@/lib/nur/prompt'
import { parseToolCalls, executeToolCalls, cleanToolCalls } from '@/lib/nur/tools'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
})

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { message, step, history } = await req.json() as {
            message: string
            step: number
            history: Message[]
        }

        // Generate onboarding prompt
        const systemPrompt = await generateOnboardingPrompt(userId)

        // Add step context
        const stepContext = getStepContext(step)

        // Build messages for Claude
        const claudeMessages = [
            ...history.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            })),
            { role: 'user' as const, content: message }
        ]

        // Call Claude
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: `${systemPrompt}\n\n${stepContext}`,
            messages: claudeMessages
        })

        // Extract text content
        let assistantMessage = ''
        for (const block of response.content) {
            if (block.type === 'text') {
                assistantMessage = block.text
                break
            }
        }

        // Parse and execute tool calls
        const toolCalls = parseToolCalls(assistantMessage)
        let extractedData: Record<string, string> = {}

        if (toolCalls.length > 0) {
            await executeToolCalls(userId, toolCalls)

            // Extract data for preview
            for (const call of toolCalls) {
                if (call.tool === 'update_profile') {
                    const { field, value } = call.params as { field: string; value: string }
                    if (field === 'full_name') extractedData.name = value
                    if (field === 'bio') extractedData.bio = value
                    if (field === 'wake_time') extractedData.wakeTime = value
                    if (field === 'sleep_time') extractedData.sleepTime = value
                }
                if (call.tool === 'save_memory') {
                    const { type, content } = call.params as { type: string; content: string }
                    if (type === 'preference' && content.toLowerCase().includes('area')) {
                        extractedData.focusArea = content
                    }
                }
                if (call.tool === 'create_goal') {
                    const { title } = call.params as { title: string }
                    extractedData.firstGoal = title
                }
            }
        }

        // Clean tool calls from message
        const cleanMessage = cleanToolCalls(assistantMessage)

        // Determine if we should progress to next step
        const progressStep = shouldProgressStep(step, toolCalls, message, cleanMessage)

        // Check if onboarding is complete
        const complete = step === 4 && toolCalls.some(t => t.tool === 'create_goal')

        return NextResponse.json({
            message: cleanMessage,
            extractedData,
            progressStep,
            complete
        })
    } catch (error) {
        console.error('Onboarding API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

function getStepContext(step: number): string {
    switch (step) {
        case 1:
            return `
**STEP ATTUALE: Identità (1/4)**
Obiettivo: Scoprire nome, età, cosa fa nella vita.
Quando hai queste info, usa i tool per salvarle.
`
        case 2:
            return `
**STEP ATTUALE: Routine (2/4)**
Obiettivo: Scoprire orari di sveglia/sonno, abitudini.
Chiedi della routine quotidiana e salva le info.
`
        case 3:
            return `
**STEP ATTUALE: Priorità (3/4)**
Obiettivo: Capire cosa conta per l'utente, su quale area vuole concentrarsi.
Le aree sono: Finanze, Carriera, Formazione, Salute, Spiritualità, Relazioni, Casa, Hobby, Esperienze, Sociale.
`
        case 4:
            return `
**STEP ATTUALE: Primo Goal (4/4)**
Obiettivo: Creare il primo obiettivo concreto.
Aiuta l'utente a definire un goal specifico nell'area scelta.
Quando è pronto, usa create_goal per crearlo.
`
        default:
            return ''
    }
}

function shouldProgressStep(
    step: number,
    toolCalls: { tool: string }[],
    _userMessage: string,
    _assistantMessage: string
): boolean {
    switch (step) {
        case 1:
            // Progress when name is saved
            return toolCalls.some(t => t.tool === 'update_profile')
        case 2:
            // Progress when routine info is saved
            return toolCalls.some(t =>
                t.tool === 'update_profile' ||
                t.tool === 'save_memory'
            )
        case 3:
            // Progress when area preference is saved
            return toolCalls.some(t => t.tool === 'save_memory')
        case 4:
            // Complete when goal is created
            return toolCalls.some(t => t.tool === 'create_goal')
        default:
            return false
    }
}
