/**
 * Journal API Route
 * Gestisce il Giornale personalizzato dell'utente
 */

import { NextRequest, NextResponse } from 'next/server'
import {
    getJournalFeed,
    getUnreadCount,
    markEntrySeen,
    markAllSeen,
    recordInteraction,
    togglePin,
    deleteEntry,
    generateDailyNurMessage,
    createWeeklySummary,
    JournalEntryType
} from '@/lib/nur/journal'

/**
 * GET - Ottieni il feed del giornale
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

        switch (action) {
            case 'unread_count':
                const count = await getUnreadCount(userId)
                return NextResponse.json({ count, success: true })

            case 'generate_daily':
                const dailyEntry = await generateDailyNurMessage(userId)
                return NextResponse.json({
                    entry: dailyEntry,
                    success: !!dailyEntry
                })

            case 'weekly_summary':
                const summary = await createWeeklySummary(userId)
                return NextResponse.json({
                    entry: summary,
                    success: !!summary
                })

            default:
                // Feed normale
                const limit = parseInt(searchParams.get('limit') || '20')
                const offset = parseInt(searchParams.get('offset') || '0')
                const includeRead = searchParams.get('includeRead') !== 'false'
                const types = searchParams.get('types')?.split(',') as JournalEntryType[] | undefined
                const area = searchParams.get('area') || undefined

                const entries = await getJournalFeed(userId, {
                    limit,
                    offset,
                    includeRead,
                    entryTypes: types,
                    areaFilter: area
                })

                return NextResponse.json({
                    entries,
                    count: entries.length,
                    success: true
                })
        }

    } catch (error: any) {
        console.error('Journal GET Error:', error)
        return NextResponse.json(
            { error: error.message, success: false },
            { status: 500 }
        )
    }
}

/**
 * POST - Azioni sul giornale
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { userId, action, entryId, interactionType } = body

        if (!userId) {
            return NextResponse.json(
                { error: 'UserId mancante' },
                { status: 400 }
            )
        }

        switch (action) {
            case 'mark_seen':
                if (!entryId) {
                    return NextResponse.json(
                        { error: 'EntryId mancante' },
                        { status: 400 }
                    )
                }
                const seenSuccess = await markEntrySeen(entryId)
                return NextResponse.json({ success: seenSuccess })

            case 'mark_all_seen':
                const allSeenSuccess = await markAllSeen(userId)
                return NextResponse.json({ success: allSeenSuccess })

            case 'interact':
                if (!entryId || !interactionType) {
                    return NextResponse.json(
                        { error: 'EntryId e interactionType richiesti' },
                        { status: 400 }
                    )
                }
                const interactSuccess = await recordInteraction(entryId, interactionType)
                return NextResponse.json({ success: interactSuccess })

            case 'toggle_pin':
                if (!entryId) {
                    return NextResponse.json(
                        { error: 'EntryId mancante' },
                        { status: 400 }
                    )
                }
                const pinSuccess = await togglePin(entryId)
                return NextResponse.json({ success: pinSuccess })

            default:
                return NextResponse.json(
                    { error: 'Azione non valida' },
                    { status: 400 }
                )
        }

    } catch (error: any) {
        console.error('Journal POST Error:', error)
        return NextResponse.json(
            { error: error.message, success: false },
            { status: 500 }
        )
    }
}

/**
 * DELETE - Elimina una entry
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const entryId = searchParams.get('entryId')

        if (!entryId) {
            return NextResponse.json(
                { error: 'EntryId mancante' },
                { status: 400 }
            )
        }

        const success = await deleteEntry(entryId)
        return NextResponse.json({ success })

    } catch (error: any) {
        console.error('Journal DELETE Error:', error)
        return NextResponse.json(
            { error: error.message, success: false },
            { status: 500 }
        )
    }
}
