/**
 * NUR: LIFE RPG - Streak System
 * Gestione streak giornaliero e vite
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import { awardXp, XP_REWARDS } from './xp'

// ============================================
// CONSTANTS
// ============================================

export const MAX_LIVES = 3
export const LIVES_RECOVERY_HOURS = 24 // Ore per recuperare 1 vita

export const STREAK_MILESTONES = {
    7: { name: 'Settimana Perfetta', xpBonus: XP_REWARDS.streak_week_milestone },
    14: { name: 'Due Settimane', xpBonus: 100 },
    30: { name: 'Mese Imbattibile', xpBonus: XP_REWARDS.streak_month_milestone },
    60: { name: 'Due Mesi', xpBonus: 300 },
    90: { name: 'Trimestre d\'Oro', xpBonus: 500 },
    180: { name: 'Semestre Leggendario', xpBonus: 1000 },
    365: { name: 'Anno Perfetto', xpBonus: 2000 }
}

// ============================================
// TYPES
// ============================================

export interface StreakResult {
    success: boolean
    streakDays: number
    streakBroken: boolean
    milestoneReached?: string
    xpBonus?: number
    error?: string
}

export interface LivesInfo {
    lives: number
    livesLastLost: Date | null
    nextLifeRecovery: Date | null
    isAlive: boolean
}

// ============================================
// STREAK FUNCTIONS
// ============================================

/**
 * Aggiorna lo streak dell'utente
 * Usa la funzione SQL update_streak per atomicità
 */
export async function updateStreak(clerkUserId: string): Promise<StreakResult> {
    try {
        const { data, error } = await supabaseAdmin
            .rpc('update_streak', { p_clerk_user_id: clerkUserId })
            .single()

        if (error) throw error

        const result: StreakResult = {
            success: true,
            streakDays: data.new_streak,
            streakBroken: data.streak_broken
        }

        // Check for milestones
        if (!data.streak_broken) {
            const milestone = STREAK_MILESTONES[data.new_streak as keyof typeof STREAK_MILESTONES]
            if (milestone) {
                result.milestoneReached = milestone.name
                result.xpBonus = milestone.xpBonus

                // Award milestone XP
                await awardXp(
                    clerkUserId,
                    milestone.xpBonus,
                    'streak_milestone',
                    `Traguardo: ${milestone.name}!`
                )
            }
        }

        return result
    } catch (error) {
        console.error('Error updating streak:', error)
        return {
            success: false,
            streakDays: 0,
            streakBroken: false,
            error: (error as Error).message
        }
    }
}

/**
 * Ottieni info sullo streak dell'utente
 */
export async function getStreakInfo(clerkUserId: string): Promise<{
    streakDays: number
    streakLastDate: string | null
    nextMilestone: { days: number; name: string } | null
}> {
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('streak_days, streak_last_date')
        .eq('clerk_user_id', clerkUserId)
        .single()

    if (error || !profile) {
        return { streakDays: 0, streakLastDate: null, nextMilestone: null }
    }

    // Find next milestone
    const milestoneKeys = Object.keys(STREAK_MILESTONES).map(Number).sort((a, b) => a - b)
    const nextMilestoneDay = milestoneKeys.find(day => day > profile.streak_days)

    return {
        streakDays: profile.streak_days,
        streakLastDate: profile.streak_last_date,
        nextMilestone: nextMilestoneDay
            ? { days: nextMilestoneDay, name: STREAK_MILESTONES[nextMilestoneDay as keyof typeof STREAK_MILESTONES].name }
            : null
    }
}

/**
 * Verifica se lo streak è ancora valido (non è passato più di un giorno)
 */
export function isStreakValid(lastDate: string | null): boolean {
    if (!lastDate) return false

    const last = new Date(lastDate)
    const today = new Date()

    // Resetta ore per confronto solo date
    last.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

    return diffDays <= 1
}

// ============================================
// LIVES FUNCTIONS
// ============================================

/**
 * Ottieni info sulle vite dell'utente
 */
export async function getLivesInfo(clerkUserId: string): Promise<LivesInfo> {
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('lives, lives_last_lost')
        .eq('clerk_user_id', clerkUserId)
        .single()

    if (error || !profile) {
        return {
            lives: MAX_LIVES,
            livesLastLost: null,
            nextLifeRecovery: null,
            isAlive: true
        }
    }

    let nextLifeRecovery: Date | null = null

    if (profile.lives < MAX_LIVES && profile.lives_last_lost) {
        const lastLost = new Date(profile.lives_last_lost)
        nextLifeRecovery = new Date(lastLost.getTime() + (LIVES_RECOVERY_HOURS * 60 * 60 * 1000))
    }

    return {
        lives: profile.lives,
        livesLastLost: profile.lives_last_lost ? new Date(profile.lives_last_lost) : null,
        nextLifeRecovery,
        isAlive: profile.lives > 0
    }
}

/**
 * Perdi una vita (quando non completi task importante o rompi streak)
 */
export async function loseLife(clerkUserId: string, reason?: string): Promise<{
    success: boolean
    livesRemaining: number
    isGameOver: boolean
}> {
    try {
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('lives')
            .eq('clerk_user_id', clerkUserId)
            .single()

        if (fetchError) throw fetchError

        const newLives = Math.max(0, (profile?.lives || MAX_LIVES) - 1)

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                lives: newLives,
                lives_last_lost: new Date().toISOString()
            })
            .eq('clerk_user_id', clerkUserId)

        if (updateError) throw updateError

        // Log activity
        await supabaseAdmin.from('activity_log').insert({
            clerk_user_id: clerkUserId,
            activity_type: 'xp_gained', // TODO: add 'life_lost' type
            description: reason || 'Vita persa',
            xp_gained: 0
        })

        return {
            success: true,
            livesRemaining: newLives,
            isGameOver: newLives === 0
        }
    } catch (error) {
        console.error('Error losing life:', error)
        return {
            success: false,
            livesRemaining: MAX_LIVES,
            isGameOver: false
        }
    }
}

/**
 * Recupera vite (automatico dopo tempo o tramite achievement)
 */
export async function recoverLives(clerkUserId: string, amount: number = 1): Promise<{
    success: boolean
    livesAfter: number
}> {
    try {
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('lives')
            .eq('clerk_user_id', clerkUserId)
            .single()

        if (fetchError) throw fetchError

        const newLives = Math.min(MAX_LIVES, (profile?.lives || 0) + amount)

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ lives: newLives })
            .eq('clerk_user_id', clerkUserId)

        if (updateError) throw updateError

        return {
            success: true,
            livesAfter: newLives
        }
    } catch (error) {
        console.error('Error recovering lives:', error)
        return {
            success: false,
            livesAfter: 0
        }
    }
}

/**
 * Check e recupera vite automaticamente basato sul tempo
 */
export async function checkAndRecoverLives(clerkUserId: string): Promise<number> {
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('lives, lives_last_lost')
        .eq('clerk_user_id', clerkUserId)
        .single()

    if (error || !profile) return MAX_LIVES

    if (profile.lives >= MAX_LIVES) return profile.lives
    if (!profile.lives_last_lost) return profile.lives

    const lastLost = new Date(profile.lives_last_lost)
    const now = new Date()
    const hoursPassed = (now.getTime() - lastLost.getTime()) / (1000 * 60 * 60)

    const livesToRecover = Math.floor(hoursPassed / LIVES_RECOVERY_HOURS)

    if (livesToRecover > 0) {
        const result = await recoverLives(clerkUserId, livesToRecover)
        return result.livesAfter
    }

    return profile.lives
}
