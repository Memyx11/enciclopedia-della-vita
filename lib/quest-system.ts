/**
 * Quest System - Gestione completa delle quest e progressione utente
 */

import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

export interface Quest {
    id: string
    chapter: number
    sort_order: number
    title: string
    description: string
    long_description?: string
    xp_reward: number
    unlock_after?: string
    unlock_condition?: any
    completion_type: string
    completion_config: any
    quest_type: 'story' | 'discovery' | 'growth' | 'challenge'
    area_id?: string
    icon: string
    is_template: boolean
    repeatable: boolean
}

export interface QuestProgress {
    id: string
    clerk_user_id: string
    quest_id: string
    status: 'locked' | 'available' | 'in_progress' | 'completed'
    progress_data: any
    progress_percent: number
    started_at?: string
    completed_at?: string
    xp_awarded: number
}

export interface QuestWithProgress extends Quest {
    progress?: QuestProgress
}

export interface UserProfile {
    id: string
    clerk_user_id: string
    name?: string
    life_phase?: string
    situation: string[]
    mindset?: string
    skills: string[]
    area_priorities: any
    mindset_history: any[]
}

export interface AreaObjective {
    id: string
    clerk_user_id: string
    area_id: string
    title: string
    description?: string
    why?: string
    target_date?: string
    status: 'active' | 'completed' | 'paused' | 'abandoned'
    priority: number
    progress_percent: number
    metrics: any
}

export interface RoutineTask {
    id: string
    clerk_user_id: string
    area_objective_id?: string
    area_id: string
    title: string
    description?: string
    scheduled_time?: string
    duration_minutes: number
    frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
    frequency_days: number[]
    difficulty: string
    xp_reward: number
    is_active: boolean
}

// ============================================
// QUEST FUNCTIONS
// ============================================

/**
 * Inizializza le quest per un nuovo utente
 */
export async function initializeUserQuests(userId: string): Promise<void> {
    // Usa la funzione SQL
    await supabase.rpc('initialize_user_quests', { p_clerk_user_id: userId })
}

/**
 * Ottiene tutte le quest con il progresso utente
 */
export async function getUserQuests(userId: string): Promise<QuestWithProgress[]> {
    // Prima assicurati che le quest siano inizializzate
    const { data: existing } = await supabase
        .from('user_quest_progress')
        .select('id')
        .eq('clerk_user_id', userId)
        .limit(1)

    if (!existing || existing.length === 0) {
        await initializeUserQuests(userId)
    }

    // Carica quest con progresso
    const { data: quests } = await supabase
        .from('game_quests')
        .select('*')
        .eq('is_template', false)
        .order('chapter', { ascending: true })
        .order('sort_order', { ascending: true })

    const { data: progress } = await supabase
        .from('user_quest_progress')
        .select('*')
        .eq('clerk_user_id', userId)

    const progressMap = new Map((progress || []).map(p => [p.quest_id, p]))

    return (quests || []).map(quest => ({
        ...quest,
        progress: progressMap.get(quest.id)
    }))
}

/**
 * Ottiene la quest attiva corrente
 */
export async function getActiveQuest(userId: string): Promise<QuestWithProgress | null> {
    const { data } = await supabase
        .from('user_quest_progress')
        .select(`
            *,
            game_quests (*)
        `)
        .eq('clerk_user_id', userId)
        .in('status', ['available', 'in_progress'])
        .order('game_quests(chapter)', { ascending: true })
        .order('game_quests(sort_order)', { ascending: true })
        .limit(1)
        .single()

    if (!data) return null

    return {
        ...data.game_quests,
        progress: {
            id: data.id,
            clerk_user_id: data.clerk_user_id,
            quest_id: data.quest_id,
            status: data.status,
            progress_data: data.progress_data,
            progress_percent: data.progress_percent,
            started_at: data.started_at,
            completed_at: data.completed_at,
            xp_awarded: data.xp_awarded
        }
    }
}

/**
 * Inizia una quest (da available a in_progress)
 */
export async function startQuest(userId: string, questId: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_quest_progress')
        .update({
            status: 'in_progress',
            started_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('quest_id', questId)
        .eq('status', 'available')

    return !error
}

/**
 * Completa una quest
 */
export async function completeQuest(
    userId: string,
    questId: string
): Promise<{ success: boolean; xp_awarded: number; next_quest?: string }> {
    // Carica la quest
    const { data: quest } = await supabase
        .from('game_quests')
        .select('*')
        .eq('id', questId)
        .single()

    if (!quest) return { success: false, xp_awarded: 0 }

    // Aggiorna progresso
    const { error } = await supabase
        .from('user_quest_progress')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            xp_awarded: quest.xp_reward,
            progress_percent: 100
        })
        .eq('clerk_user_id', userId)
        .eq('quest_id', questId)

    if (error) return { success: false, xp_awarded: 0 }

    // Assegna XP
    await supabase.rpc('add_xp', {
        p_clerk_user_id: userId,
        p_amount: quest.xp_reward,
        p_reason: `Quest completata: ${quest.title}`,
        p_objective_id: null
    })

    // Sblocca quest successive
    await supabase.rpc('unlock_next_quests', {
        p_clerk_user_id: userId,
        p_completed_quest_id: questId
    })

    // Trova prossima quest
    const { data: nextQuest } = await supabase
        .from('game_quests')
        .select('id')
        .eq('unlock_after', questId)
        .single()

    return {
        success: true,
        xp_awarded: quest.xp_reward,
        next_quest: nextQuest?.id
    }
}

/**
 * Controlla se una quest è completabile e la completa automaticamente
 */
export async function checkAndCompleteQuest(
    userId: string,
    questId: string
): Promise<{ completed: boolean; xp?: number }> {
    // Usa la funzione SQL per verificare
    const { data: canComplete } = await supabase.rpc('check_quest_completion', {
        p_clerk_user_id: userId,
        p_quest_id: questId
    })

    if (canComplete) {
        const result = await completeQuest(userId, questId)
        return { completed: result.success, xp: result.xp_awarded }
    }

    return { completed: false }
}

/**
 * Controlla tutte le quest e completa quelle completabili
 * Usa la funzione SQL che gestisce auto-start e completamento
 */
export async function checkAllQuests(userId: string): Promise<string[]> {
    try {
        // Usa la funzione SQL migliorata che:
        // 1. Auto-start delle quest available → in_progress
        // 2. Controlla tutte le quest in_progress
        // 3. Completa quelle che soddisfano i requisiti
        const { data, error } = await supabase.rpc('check_and_complete_all_quests', {
            p_clerk_user_id: userId
        })

        if (error) {
            console.error('[Quest] Error checking quests:', error)
            // Fallback al metodo manuale
            return await checkAllQuestsManual(userId)
        }

        const completedQuests = (data || []).map((q: any) => q.completed_quest_id)
        if (completedQuests.length > 0) {
            console.log(`[Quest] Completed via SQL: ${completedQuests.join(', ')}`)
        }
        return completedQuests
    } catch (e) {
        console.error('[Quest] Exception:', e)
        return await checkAllQuestsManual(userId)
    }
}

/**
 * Fallback manuale per checkAllQuests
 */
async function checkAllQuestsManual(userId: string): Promise<string[]> {
    const completedQuests: string[] = []

    // Prima metti in_progress le quest available
    await supabase
        .from('user_quest_progress')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('clerk_user_id', userId)
        .eq('status', 'available')

    // Carica quest in progress
    const { data: inProgress } = await supabase
        .from('user_quest_progress')
        .select('quest_id')
        .eq('clerk_user_id', userId)
        .eq('status', 'in_progress')

    for (const { quest_id } of inProgress || []) {
        const { completed } = await checkAndCompleteQuest(userId, quest_id)
        if (completed) {
            completedQuests.push(quest_id)
        }
    }

    return completedQuests
}

// ============================================
// PROFILE FUNCTIONS
// ============================================

/**
 * Ottiene o crea il profilo utente
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    let { data } = await supabase
        .from('user_profile_data')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

    if (!data) {
        // Crea profilo
        const { data: newProfile } = await supabase
            .from('user_profile_data')
            .insert({ clerk_user_id: userId })
            .select()
            .single()
        data = newProfile
    }

    return data
}

/**
 * Aggiorna un campo del profilo
 */
export async function updateProfileField(
    userId: string,
    field: string,
    value: any
): Promise<boolean> {
    const updateData: any = { [field]: value }

    // Se è mindset, aggiungi allo storico
    if (field === 'mindset') {
        const { data: profile } = await supabase
            .from('user_profile_data')
            .select('mindset, mindset_history')
            .eq('clerk_user_id', userId)
            .single()

        if (profile && profile.mindset && profile.mindset !== value) {
            const history = profile.mindset_history || []
            history.push({
                from: profile.mindset,
                to: value,
                date: new Date().toISOString()
            })
            updateData.mindset_history = history
        }
    }

    // Se è array (situation, skills), gestisci append
    if (field === 'situation' || field === 'skills') {
        if (typeof value === 'string' && value.startsWith('add:')) {
            const toAdd = value.replace('add:', '')
            const { data: profile } = await supabase
                .from('user_profile_data')
                .select(field)
                .eq('clerk_user_id', userId)
                .single()

            const current = (profile as any)?.[field] || []
            if (!current.includes(toAdd)) {
                updateData[field] = [...current, toAdd]
            } else {
                return true // Già presente
            }
        }
    }

    const { error } = await supabase
        .from('user_profile_data')
        .update(updateData)
        .eq('clerk_user_id', userId)

    return !error
}

// ============================================
// AREA OBJECTIVES FUNCTIONS
// ============================================

/**
 * Crea un nuovo obiettivo area
 */
export async function createAreaObjective(
    userId: string,
    areaId: string,
    title: string,
    description?: string,
    why?: string,
    targetDate?: string,
    priority: number = 5
): Promise<AreaObjective | null> {
    const { data, error } = await supabase
        .from('area_objectives')
        .insert({
            clerk_user_id: userId,
            area_id: areaId,
            title,
            description,
            why,
            target_date: targetDate,
            priority
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating objective:', error)
        return null
    }

    return data
}

/**
 * Ottiene gli obiettivi attivi per area
 */
export async function getAreaObjectives(
    userId: string,
    areaId?: string
): Promise<AreaObjective[]> {
    let query = supabase
        .from('area_objectives')
        .select('*')
        .eq('clerk_user_id', userId)
        .eq('status', 'active')
        .order('priority', { ascending: true })

    if (areaId) {
        query = query.eq('area_id', areaId)
    }

    const { data } = await query
    return data || []
}

/**
 * Conta le aree con obiettivi attivi
 */
export async function countActiveAreas(userId: string): Promise<number> {
    const { data } = await supabase
        .from('area_objectives')
        .select('area_id')
        .eq('clerk_user_id', userId)
        .eq('status', 'active')

    const uniqueAreas = new Set((data || []).map(d => d.area_id))
    return uniqueAreas.size
}

// ============================================
// ROUTINE FUNCTIONS
// ============================================

/**
 * Aggiunge una task alla routine
 */
export async function addRoutineTask(
    userId: string,
    areaId: string,
    title: string,
    scheduledTime?: string,
    durationMinutes: number = 30,
    frequency: 'daily' | 'weekdays' | 'weekends' | 'custom' = 'daily',
    frequencyDays: number[] = [],
    difficulty: string = 'media',
    objectiveId?: string
): Promise<RoutineTask | null> {
    const xpReward = getXpForDifficulty(difficulty)

    const { data, error } = await supabase
        .from('routine_tasks')
        .insert({
            clerk_user_id: userId,
            area_id: areaId,
            area_objective_id: objectiveId,
            title,
            scheduled_time: scheduledTime,
            duration_minutes: durationMinutes,
            frequency,
            frequency_days: frequencyDays,
            difficulty,
            xp_reward: xpReward
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding routine task:', error)
        return null
    }

    return data
}

/**
 * Ottiene le task della routine per un giorno
 */
export async function getRoutineTasksForDay(
    userId: string,
    dayOfWeek: number // 0=dom, 1=lun...
): Promise<RoutineTask[]> {
    const { data } = await supabase
        .from('routine_tasks')
        .select('*')
        .eq('clerk_user_id', userId)
        .eq('is_active', true)
        .order('scheduled_time', { ascending: true })

    // Filtra per frequenza
    return (data || []).filter(task => {
        if (task.frequency === 'daily') return true
        if (task.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5
        if (task.frequency === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6
        if (task.frequency === 'custom') return task.frequency_days.includes(dayOfWeek)
        return false
    })
}

/**
 * Completa una task giornaliera
 */
export async function completeRoutineTask(
    userId: string,
    routineTaskId: string,
    date: string
): Promise<{ success: boolean; xp_earned: number }> {
    // Carica la task
    const { data: task } = await supabase
        .from('routine_tasks')
        .select('xp_reward, title')
        .eq('id', routineTaskId)
        .single()

    if (!task) return { success: false, xp_earned: 0 }

    // Aggiorna o crea log
    const { error } = await supabase
        .from('daily_task_log')
        .upsert({
            clerk_user_id: userId,
            routine_task_id: routineTaskId,
            scheduled_date: date,
            status: 'completed',
            completed_at: new Date().toISOString(),
            xp_earned: task.xp_reward
        }, {
            onConflict: 'clerk_user_id,routine_task_id,scheduled_date'
        })

    if (error) return { success: false, xp_earned: 0 }

    // Assegna XP
    await supabase.rpc('add_xp', {
        p_clerk_user_id: userId,
        p_amount: task.xp_reward,
        p_reason: `Task completata: ${task.title}`,
        p_objective_id: null
    })

    return { success: true, xp_earned: task.xp_reward }
}

/**
 * Ottiene il log delle task per un giorno
 */
export async function getDayTaskLog(
    userId: string,
    date: string
): Promise<any[]> {
    const { data } = await supabase
        .from('daily_task_log')
        .select(`
            *,
            routine_tasks (*)
        `)
        .eq('clerk_user_id', userId)
        .eq('scheduled_date', date)

    return data || []
}

/**
 * Salva il template routine per un giorno
 */
export async function saveRoutineTemplate(
    userId: string,
    dayOfWeek: number,
    wakeTime?: string,
    sleepTime?: string,
    obligations: any[] = []
): Promise<boolean> {
    const { error } = await supabase
        .from('user_routine_template')
        .upsert({
            clerk_user_id: userId,
            day_of_week: dayOfWeek,
            wake_time: wakeTime,
            sleep_time: sleepTime,
            obligations
        }, {
            onConflict: 'clerk_user_id,day_of_week'
        })

    return !error
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getXpForDifficulty(difficulty: string): number {
    switch (difficulty) {
        case 'facile': return 30
        case 'media': return 60
        case 'difficile': return 120
        case 'epica': return 250
        case 'leggendaria': return 500
        default: return 60
    }
}

/**
 * Ottiene le aree di vita con configurazione
 */
export async function getLifeAreas(): Promise<any[]> {
    const { data } = await supabase
        .from('life_areas_config')
        .select('*')
        .order('sort_order', { ascending: true })

    return data || []
}

/**
 * Ottiene statistiche complete utente
 */
export async function getUserStats(userId: string): Promise<any> {
    const [profile, quests, objectives, tasks, achievements] = await Promise.all([
        getUserProfile(userId),
        getUserQuests(userId),
        getAreaObjectives(userId),
        supabase.from('routine_tasks').select('*').eq('clerk_user_id', userId).eq('is_active', true),
        supabase.from('user_achievements').select('achievement_id').eq('clerk_user_id', userId)
    ])

    const completedQuests = quests.filter(q => q.progress?.status === 'completed').length
    const activeAreas = await countActiveAreas(userId)

    return {
        profile,
        quests: {
            total: quests.length,
            completed: completedQuests,
            current: quests.find(q => q.progress?.status === 'in_progress')
        },
        objectives: {
            total: objectives.length,
            active: objectives.filter(o => o.status === 'active').length
        },
        routine: {
            tasks: tasks.data?.length || 0
        },
        achievements: {
            unlocked: achievements.data?.length || 0
        },
        areas: {
            active: activeAreas
        }
    }
}
