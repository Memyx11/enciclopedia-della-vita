/**
 * NUR: LIFE RPG - Achievements System
 * Gestione achievement e badge
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import { Achievement, AchievementDefinition } from '@/lib/supabase/types'
import { awardXp } from './xp'

// ============================================
// TYPES
// ============================================

export interface AchievementUnlockResult {
    unlocked: boolean
    achievement?: Achievement
    xpAwarded?: number
    error?: string
}

export interface AchievementCheckResult {
    newlyUnlocked: string[]
    totalUnlocked: number
    totalAvailable: number
}

// ============================================
// ACHIEVEMENT FUNCTIONS
// ============================================

/**
 * Sblocca un achievement per un utente
 */
export async function unlockAchievement(
    clerkUserId: string,
    achievementSlug: string
): Promise<AchievementUnlockResult> {
    try {
        // Usa la funzione SQL
        const { data, error } = await supabaseAdmin
            .rpc('unlock_achievement', {
                p_clerk_user_id: clerkUserId,
                p_achievement_slug: achievementSlug
            })

        if (error) throw error

        // Se già sbloccato, data è false
        if (!data) {
            return { unlocked: false }
        }

        // Recupera l'achievement appena sbloccato
        const { data: achievement, error: fetchError } = await supabaseAdmin
            .from('achievements')
            .select('*')
            .eq('clerk_user_id', clerkUserId)
            .eq('slug', achievementSlug)
            .single()

        if (fetchError) throw fetchError

        return {
            unlocked: true,
            achievement,
            xpAwarded: achievement?.xp_reward || 0
        }
    } catch (error) {
        console.error('Error unlocking achievement:', error)
        return {
            unlocked: false,
            error: (error as Error).message
        }
    }
}

/**
 * Controlla e sblocca tutti gli achievement disponibili
 */
export async function checkAllAchievements(
    clerkUserId: string
): Promise<AchievementCheckResult> {
    try {
        const { data: unlocked, error } = await supabaseAdmin
            .rpc('check_achievements', { p_clerk_user_id: clerkUserId })

        if (error) throw error

        // Conta achievement totali
        const { count: totalUnlocked } = await supabaseAdmin
            .from('achievements')
            .select('*', { count: 'exact', head: true })
            .eq('clerk_user_id', clerkUserId)

        const { count: totalAvailable } = await supabaseAdmin
            .from('achievement_definitions')
            .select('*', { count: 'exact', head: true })

        return {
            newlyUnlocked: unlocked || [],
            totalUnlocked: totalUnlocked || 0,
            totalAvailable: totalAvailable || 0
        }
    } catch (error) {
        console.error('Error checking achievements:', error)
        return {
            newlyUnlocked: [],
            totalUnlocked: 0,
            totalAvailable: 0
        }
    }
}

/**
 * Ottieni tutti gli achievement sbloccati da un utente
 */
export async function getUserAchievements(clerkUserId: string): Promise<Achievement[]> {
    const { data, error } = await supabaseAdmin
        .from('achievements')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .order('unlocked_at', { ascending: false })

    if (error) {
        console.error('Error fetching achievements:', error)
        return []
    }

    return data || []
}

/**
 * Ottieni tutte le definizioni di achievement
 */
export async function getAllAchievementDefinitions(): Promise<AchievementDefinition[]> {
    const { data, error } = await supabaseAdmin
        .from('achievement_definitions')
        .select('*')
        .order('category', { ascending: true })

    if (error) {
        console.error('Error fetching achievement definitions:', error)
        return []
    }

    return data || []
}

/**
 * Ottieni achievement con stato (sbloccato o no) per un utente
 */
export async function getAchievementsWithStatus(clerkUserId: string): Promise<{
    definition: AchievementDefinition
    unlocked: boolean
    unlockedAt?: string
}[]> {
    const [definitions, userAchievements] = await Promise.all([
        getAllAchievementDefinitions(),
        getUserAchievements(clerkUserId)
    ])

    const unlockedSlugs = new Set(userAchievements.map(a => a.slug))
    const unlockedMap = new Map(userAchievements.map(a => [a.slug, a.unlocked_at]))

    return definitions.map(def => ({
        definition: def,
        unlocked: unlockedSlugs.has(def.slug),
        unlockedAt: unlockedMap.get(def.slug)
    }))
}

/**
 * Ottieni gli achievement più recenti (per notifiche)
 */
export async function getRecentAchievements(
    clerkUserId: string,
    limit: number = 5
): Promise<Achievement[]> {
    const { data, error } = await supabaseAdmin
        .from('achievements')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .order('unlocked_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching recent achievements:', error)
        return []
    }

    return data || []
}

/**
 * Conta achievement per categoria
 */
export async function getAchievementsByCategory(clerkUserId: string): Promise<
    Record<string, { unlocked: number; total: number }>
> {
    const [definitions, userAchievements] = await Promise.all([
        getAllAchievementDefinitions(),
        getUserAchievements(clerkUserId)
    ])

    const unlockedSlugs = new Set(userAchievements.map(a => a.slug))

    const byCategory: Record<string, { unlocked: number; total: number }> = {}

    for (const def of definitions) {
        const category = def.category || 'special'
        if (!byCategory[category]) {
            byCategory[category] = { unlocked: 0, total: 0 }
        }
        byCategory[category].total++
        if (unlockedSlugs.has(def.slug)) {
            byCategory[category].unlocked++
        }
    }

    return byCategory
}
