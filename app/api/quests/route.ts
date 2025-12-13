/**
 * Quest API - Gestione quest e progressione
 */

import { NextRequest, NextResponse } from 'next/server'
import {
    getUserQuests,
    getActiveQuest,
    startQuest,
    completeQuest,
    checkAndCompleteQuest,
    checkAllQuests,
    getUserStats,
    initializeUserQuests
} from '@/lib/quest-system'

/**
 * GET /api/quests
 * Ottiene tutte le quest con progressione utente
 *
 * Query params:
 * - active: true → solo quest attiva
 * - stats: true → include statistiche complete
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const activeOnly = searchParams.get('active') === 'true'
        const includeStats = searchParams.get('stats') === 'true'

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 })
        }

        if (activeOnly) {
            const activeQuest = await getActiveQuest(userId)
            return NextResponse.json({ quest: activeQuest })
        }

        const quests = await getUserQuests(userId)

        // Raggruppa per capitolo
        const chapters: Record<number, any[]> = {}
        for (const quest of quests) {
            if (!chapters[quest.chapter]) {
                chapters[quest.chapter] = []
            }
            chapters[quest.chapter].push(quest)
        }

        // Statistiche opzionali
        let stats = null
        if (includeStats) {
            stats = await getUserStats(userId)
        }

        return NextResponse.json({
            quests,
            chapters,
            stats,
            summary: {
                total: quests.length,
                completed: quests.filter(q => q.progress?.status === 'completed').length,
                available: quests.filter(q => q.progress?.status === 'available').length,
                in_progress: quests.filter(q => q.progress?.status === 'in_progress').length,
                locked: quests.filter(q => q.progress?.status === 'locked').length
            }
        })

    } catch (error: any) {
        console.error('Quest GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/quests
 * Azioni sulle quest
 *
 * Body:
 * - action: 'start' | 'complete' | 'check' | 'check_all' | 'init'
 * - userId: string
 * - questId: string (per start/complete/check)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { action, userId, questId } = body

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 })
        }

        switch (action) {
            case 'init':
                // Inizializza quest per nuovo utente
                await initializeUserQuests(userId)
                return NextResponse.json({ success: true })

            case 'start':
                if (!questId) {
                    return NextResponse.json({ error: 'questId required' }, { status: 400 })
                }
                const started = await startQuest(userId, questId)
                return NextResponse.json({ success: started })

            case 'complete':
                if (!questId) {
                    return NextResponse.json({ error: 'questId required' }, { status: 400 })
                }
                const result = await completeQuest(userId, questId)
                return NextResponse.json(result)

            case 'check':
                if (!questId) {
                    return NextResponse.json({ error: 'questId required' }, { status: 400 })
                }
                const checkResult = await checkAndCompleteQuest(userId, questId)
                return NextResponse.json(checkResult)

            case 'check_all':
                const completed = await checkAllQuests(userId)
                return NextResponse.json({
                    completed_quests: completed,
                    count: completed.length
                })

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

    } catch (error: any) {
        console.error('Quest POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
