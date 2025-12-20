/**
 * NUR: LIFE RPG - XP System
 * Gestione punti esperienza e progressione
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import { ActivityType, Profile, getLevelInfo, calculateLevelFromXp, getTitleForLevel } from '@/lib/supabase/types'

// ============================================
// CONSTANTS
// ============================================

export const XP_REWARDS = {
    // Tasks
    task_completed: 10,
    task_completed_early: 15,        // Completato prima del previsto
    task_completed_boss: 100,        // Boss task giornaliero

    // Goals
    goal_completed_obiettivo: 50,
    goal_completed_boss: 200,
    goal_completed_sogno: 500,

    // Routine
    routine_completed: 15,
    routine_streak_bonus: 5,         // Per ogni giorno consecutivo

    // Skills
    skill_level_up: 25,

    // Materials
    material_obtained_comune: 5,
    material_obtained_non_comune: 10,
    material_obtained_raro: 25,
    material_obtained_epico: 50,
    material_obtained_leggendario: 100,

    // Tests (Sistema Prove)
    test_passed: 25,
    test_passed_difficult: 50,

    // Streak
    streak_day_bonus: 5,             // Bonus per ogni giorno di streak
    streak_week_milestone: 50,       // Bonus a 7 giorni
    streak_month_milestone: 200,     // Bonus a 30 giorni

    // Misc
    onboarding_completed: 50,
    first_goal_created: 25,
    first_task_completed: 25
} as const

// ============================================
// XP FUNCTIONS
// ============================================

export interface XpGainResult {
    success: boolean
    newXp: number
    newLevel: number
    newTitle: string
    leveledUp: boolean
    xpGained: number
    error?: string
}

/**
 * Assegna XP a un utente
 * Usa la funzione SQL add_xp per atomicità
 */
export async function awardXp(
    clerkUserId: string,
    amount: number,
    activityType: ActivityType = 'xp_gained',
    description?: string
): Promise<XpGainResult> {
    try {
        // Usa la funzione SQL per atomicità
        const { data, error } = await supabaseAdmin
            .rpc('add_xp', {
                p_clerk_user_id: clerkUserId,
                p_xp_amount: amount,
                p_activity_type: activityType,
                p_description: description || null
            })
            .single()

        if (error) throw error

        return {
            success: true,
            newXp: data.new_xp,
            newLevel: data.new_level,
            newTitle: data.new_title,
            leveledUp: data.leveled_up,
            xpGained: amount
        }
    } catch (error) {
        console.error('Error awarding XP:', error)
        return {
            success: false,
            newXp: 0,
            newLevel: 0,
            newTitle: '',
            leveledUp: false,
            xpGained: 0,
            error: (error as Error).message
        }
    }
}

/**
 * Ottieni le info XP/livello di un utente
 */
export async function getUserXpInfo(clerkUserId: string) {
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('xp, level, title, streak_days')
        .eq('clerk_user_id', clerkUserId)
        .single()

    if (error || !profile) {
        return null
    }

    return {
        ...getLevelInfo(profile.xp),
        streak_days: profile.streak_days
    }
}

/**
 * Calcola XP con bonus streak
 */
export function calculateXpWithStreak(baseXp: number, streakDays: number): number {
    // Bonus del 10% per ogni giorno di streak, max 100%
    const streakMultiplier = Math.min(1 + (streakDays * 0.1), 2)
    return Math.floor(baseXp * streakMultiplier)
}

/**
 * Assegna XP per completamento task
 */
export async function awardTaskXp(
    clerkUserId: string,
    isBossTask: boolean = false,
    streakDays: number = 0
): Promise<XpGainResult> {
    const baseXp = isBossTask ? XP_REWARDS.task_completed_boss : XP_REWARDS.task_completed
    const finalXp = calculateXpWithStreak(baseXp, streakDays)

    const activityType: ActivityType = isBossTask ? 'boss_task_completed' : 'task_completed'

    return awardXp(
        clerkUserId,
        finalXp,
        activityType,
        isBossTask ? 'Boss Task completato!' : 'Task completato'
    )
}

/**
 * Assegna XP per completamento goal
 */
export async function awardGoalXp(
    clerkUserId: string,
    goalType: 'obiettivo' | 'boss' | 'sogno',
    customXp?: number
): Promise<XpGainResult> {
    const xpMap = {
        obiettivo: XP_REWARDS.goal_completed_obiettivo,
        boss: XP_REWARDS.goal_completed_boss,
        sogno: XP_REWARDS.goal_completed_sogno
    }

    const xp = customXp || xpMap[goalType]

    return awardXp(
        clerkUserId,
        xp,
        'goal_completed',
        `${goalType.charAt(0).toUpperCase() + goalType.slice(1)} completato!`
    )
}

/**
 * Assegna XP per test superato
 */
export async function awardTestXp(
    clerkUserId: string,
    isDifficult: boolean = false
): Promise<XpGainResult> {
    const xp = isDifficult ? XP_REWARDS.test_passed_difficult : XP_REWARDS.test_passed

    return awardXp(
        clerkUserId,
        xp,
        'test_passed',
        'Prova superata!'
    )
}
