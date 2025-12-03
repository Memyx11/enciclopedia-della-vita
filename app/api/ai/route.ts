/**
 * NUR API Route
 * Endpoint principale per comunicare con NUR
 */

import { NextRequest, NextResponse } from 'next/server'
import { getNur } from '@/lib/nur'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { message, userId, history, conversationId, area } = body

        // Validazione
        if (!message) {
            return NextResponse.json(
                { error: 'Messaggio mancante' },
                { status: 400 }
            )
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'UserId mancante' },
                { status: 400 }
            )
        }

        // Ottieni l'istanza di NUR
        const nur = getNur()

        // Formatta la history
        const formattedHistory = (history || []).map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }))

        // Chiama NUR
        const response = await nur.chat(
            userId,
            message,
            formattedHistory,
            {
                conversationId,
                areaContext: area,
                extractInsights: true,
                saveToDb: true
            }
        )

        return NextResponse.json({
            response: response.message,
            success: true,
            insights_extracted: response.insights_extracted,
            conversation_id: response.conversation_id,
            metadata: response.metadata
        })

    } catch (error: any) {
        console.error('NUR API Error:', error)
        return NextResponse.json(
            {
                response: 'Ops, qualcosa è andato storto. Riprova tra un attimo.',
                error: error.message,
                success: false
            },
            { status: 500 }
        )
    }
}

/**
 * GET - Ottieni info su NUR (statistiche, stato)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const action = searchParams.get('action')

        if (!userId) {
            return NextResponse.json(
                { error: 'UserId mancante' },
                { status: 400 }
            )
        }

        const nur = getNur()

        switch (action) {
            case 'context':
                // Ottieni il contesto dell'utente
                const context = await nur.getUserContext(userId)
                return NextResponse.json({ context, success: true })

            default:
                return NextResponse.json({ message: 'NUR is ready', success: true })
        }

    } catch (error: any) {
        console.error('NUR GET Error:', error)
        return NextResponse.json(
            { error: error.message, success: false },
            { status: 500 }
        )
    }
}
