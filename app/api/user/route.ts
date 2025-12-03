/**
 * User API Route
 * Gestisce operazioni utente (init, profilo, aree vita)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getNur } from '@/lib/nur'

/**
 * GET - Ottieni dati utente
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
            case 'profile':
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('clerk_user_id', userId)
                    .maybeSingle()
                return NextResponse.json({ profile, success: true })

            case 'areas':
                const { data: areas } = await supabase
                    .from('life_areas')
                    .select('*')
                    .eq('clerk_user_id', userId)
                return NextResponse.json({ areas: areas || [], success: true })

            case 'context':
                const nur = getNur()
                const context = await nur.getUserContext(userId)
                return NextResponse.json({ context, success: true })

            case 'stats':
                // Statistiche utente
                const [
                    conversationsCount,
                    solutionsCount,
                    insightsCount
                ] = await Promise.all([
                    supabase
                        .from('conversations')
                        .select('*', { count: 'exact', head: true })
                        .eq('clerk_user_id', userId),
                    supabase
                        .from('solutions')
                        .select('*', { count: 'exact', head: true })
                        .eq('clerk_user_id', userId),
                    supabase
                        .from('user_memory')
                        .select('*', { count: 'exact', head: true })
                        .eq('clerk_user_id', userId)
                ])

                return NextResponse.json({
                    stats: {
                        conversations: conversationsCount.count || 0,
                        solutions: solutionsCount.count || 0,
                        insights: insightsCount.count || 0
                    },
                    success: true
                })

            default:
                // Tutto
                const nur2 = getNur()
                const fullContext = await nur2.getUserContext(userId)
                return NextResponse.json({ ...fullContext, success: true })
        }

    } catch (error: any) {
        console.error('User GET Error:', error)
        return NextResponse.json(
            { error: error.message, success: false },
            { status: 500 }
        )
    }
}

/**
 * POST - Azioni utente
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { userId, action, data } = body

        if (!userId) {
            return NextResponse.json(
                { error: 'UserId mancante' },
                { status: 400 }
            )
        }

        switch (action) {
            case 'init':
                // Inizializza utente (chiamato al primo accesso)
                const nur = getNur()
                await nur.initializeUser(userId, {
                    email: data?.email,
                    fullName: data?.fullName,
                    ageRange: data?.ageRange
                })
                return NextResponse.json({ success: true, message: 'Utente inizializzato' })

            case 'update_profile':
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update(data)
                    .eq('clerk_user_id', userId)
                return NextResponse.json({ success: !profileError })

            case 'update_area':
                if (!data?.area_type) {
                    return NextResponse.json(
                        { error: 'area_type mancante' },
                        { status: 400 }
                    )
                }
                const { error: areaError } = await supabase
                    .from('life_areas')
                    .update({
                        current_state: data.current_state,
                        goal_state: data.goal_state,
                        progress: data.progress,
                        priority: data.priority,
                        notes: data.notes,
                        last_significant_update: new Date().toISOString()
                    })
                    .eq('clerk_user_id', userId)
                    .eq('area_type', data.area_type)
                return NextResponse.json({ success: !areaError })

            case 'complete_onboarding':
                const { error: onboardError } = await supabase
                    .from('profiles')
                    .update({
                        onboarding_completed: true,
                        age_range: data?.ageRange,
                        communication_style: data?.communicationStyle
                    })
                    .eq('clerk_user_id', userId)
                return NextResponse.json({ success: !onboardError })

            case 'celebrate':
                // Celebra un achievement
                if (!data?.achievement) {
                    return NextResponse.json(
                        { error: 'achievement mancante' },
                        { status: 400 }
                    )
                }
                const nur2 = getNur()
                await nur2.celebrateAchievement(userId, data.achievement, data.area)
                return NextResponse.json({ success: true })

            default:
                return NextResponse.json(
                    { error: 'Azione non valida' },
                    { status: 400 }
                )
        }

    } catch (error: any) {
        console.error('User POST Error:', error)
        return NextResponse.json(
            { error: error.message, success: false },
            { status: 500 }
        )
    }
}
