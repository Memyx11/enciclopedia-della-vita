/**
 * NUR Tools System
 * Funzioni che NUR può chiamare per interagire con il sistema
 * VERSIONE OTTIMIZZATA - Solo 6 tool essenziali
 */

import { supabase } from '@/lib/supabase'
import { AreaType } from './memory'

// ============================================
// TOOL DEFINITIONS - VERSIONE MINIMA
// Solo 6 tool per evitare overload
// ============================================

export const NUR_TOOLS = [
    {
        name: 'get_full_dashboard',
        description: 'Visione completa dello stato utente. USA SOLO quando serve vedere dati specifici.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'set_mission',
        description: 'Imposta o aggiorna la missione principale dell\'utente nella dashboard. Usa quando l\'utente definisce un grande obiettivo di vita.',
        input_schema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Titolo della missione (es. "Diventare finanziariamente libero")' },
                description: { type: 'string', description: 'Descrizione breve della missione' },
                start_value: { type: 'number', description: 'Valore di partenza (es. -5000 per debiti)' },
                target_value: { type: 'number', description: 'Valore obiettivo da raggiungere (es. 50000)' },
                current_value: { type: 'number', description: 'Valore attuale (es. 8500)' },
                unit: { type: 'string', description: 'Unità di misura (es. "euro", "kg", "ore")' },
                target_date: { type: 'string', description: 'Data obiettivo in formato YYYY-MM-DD' }
            },
            required: ['title']
        }
    },
    {
        name: 'add_objective',
        description: 'Aggiunge una task/obiettivo al piano della missione. Le task sono ordinate e si sbloccano in sequenza.',
        input_schema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Titolo della task' },
                description: { type: 'string', description: 'Descrizione di cosa fare' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], description: 'Difficoltà: easy (30 XP), medium (60 XP), hard (100 XP)' },
                status: { type: 'string', enum: ['pending', 'active', 'locked'], description: 'Stato iniziale (default: locked, la prima sarà active)' }
            },
            required: ['title']
        }
    },
    {
        name: 'update_progress',
        description: 'Aggiorna il progresso della missione o di un obiettivo.',
        input_schema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['mission', 'objective'], description: 'Cosa aggiornare' },
                title: { type: 'string', description: 'Titolo dell\'obiettivo da aggiornare (solo se type=objective)' },
                current_value: { type: 'number', description: 'Nuovo valore corrente (per missione)' },
                progress: { type: 'number', description: 'Percentuale di progresso 0-100 (per obiettivo)' },
                status: { type: 'string', enum: ['pending', 'active', 'completed'], description: 'Nuovo stato' }
            },
            required: ['type']
        }
    },
    {
        name: 'add_task',
        description: 'Aggiunge un task a un\'area. Usa quando l\'utente vuole fare qualcosa di concreto.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro']
                },
                title: { type: 'string' }
            },
            required: ['area', 'title']
        }
    },
    {
        name: 'set_goal',
        description: 'Imposta obiettivo per un\'area. Usa quando l\'utente definisce cosa vuole raggiungere.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro']
                },
                title: { type: 'string' }
            },
            required: ['area', 'title']
        }
    },
    {
        name: 'save_memory',
        description: 'Salva un fatto importante sull\'utente.',
        input_schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['fact', 'preference', 'goal', 'struggle', 'achievement']
                },
                content: { type: 'string' },
                importance: { type: 'number' }
            },
            required: ['type', 'content', 'importance']
        }
    },
    {
        name: 'add_journal_message',
        description: 'Aggiunge un messaggio nella Scrivania dell\'utente.',
        input_schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['nur_message', 'insight', 'suggestion', 'reminder', 'challenge']
                },
                content: { type: 'string' },
                title: { type: 'string' }
            },
            required: ['type', 'content']
        }
    },
    {
        name: 'log_mood',
        description: 'Registra l\'umore dell\'utente.',
        input_schema: {
            type: 'object',
            properties: {
                mood_score: { type: 'number' },
                emotions: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: ['mood_score', 'emotions']
        }
    },
    // ============================================
    // GAMIFICATION TOOLS
    // ============================================
    {
        name: 'award_xp',
        description: 'Assegna XP all\'utente. Usa per premiare completamenti, progressi o azioni positive.',
        input_schema: {
            type: 'object',
            properties: {
                amount: { type: 'number', description: 'Quantità di XP da assegnare (30-200)' },
                reason: { type: 'string', description: 'Motivo dell\'assegnazione XP' },
                category: {
                    type: 'string',
                    enum: ['task_completion', 'objective_progress', 'daily_check', 'achievement', 'bonus'],
                    description: 'Categoria del premio'
                }
            },
            required: ['amount', 'reason']
        }
    },
    {
        name: 'update_streak',
        description: 'Aggiorna lo streak dell\'utente. Usato internamente quando l\'utente completa attività giornaliere.',
        input_schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['increment', 'reset'], description: 'Incrementa o resetta lo streak' }
            },
            required: ['action']
        }
    },
    {
        name: 'modify_lives',
        description: 'Modifica le vite dell\'utente. Togli vite per task saltate/fallite, aggiungi per completamenti speciali.',
        input_schema: {
            type: 'object',
            properties: {
                change: { type: 'number', description: 'Modifica (+1 per aggiungere, -1 per rimuovere)' },
                reason: { type: 'string', description: 'Motivo della modifica' }
            },
            required: ['change', 'reason']
        }
    },
    {
        name: 'complete_objective',
        description: 'Completa un obiettivo e assegna XP automaticamente. Gestisce level-up e streak.',
        input_schema: {
            type: 'object',
            properties: {
                objective_title: { type: 'string', description: 'Titolo dell\'obiettivo da completare' },
                notes: { type: 'string', description: 'Note opzionali sul completamento' }
            },
            required: ['objective_title']
        }
    },
    {
        name: 'get_user_stats',
        description: 'Ottieni le statistiche di gamification dell\'utente (level, XP, streak, lives, rank).',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    }
]

// ============================================
// TOOL HANDLERS
// ============================================

export async function handleToolCall(
    toolName: string,
    input: any,
    userId: string
): Promise<{ success: boolean; message: string; data?: any }> {
    try {
        switch (toolName) {
            case 'get_full_dashboard':
                return await handleGetFullDashboard(userId)
            case 'set_mission':
                return await handleSetMission(userId, input)
            case 'add_objective':
                return await handleAddObjective(userId, input)
            case 'update_progress':
                return await handleUpdateProgress(userId, input)
            case 'add_task':
                return await handleAddTask(userId, input)
            case 'set_goal':
                return await handleSetGoal(userId, input)
            case 'save_memory':
                return await handleSaveMemory(userId, input)
            case 'add_journal_message':
                return await handleAddJournalMessage(userId, input)
            case 'log_mood':
                return await handleLogMood(userId, input)
            // Gamification tools
            case 'award_xp':
                return await handleAwardXp(userId, input)
            case 'update_streak':
                return await handleUpdateStreak(userId, input)
            case 'modify_lives':
                return await handleModifyLives(userId, input)
            case 'complete_objective':
                return await handleCompleteObjective(userId, input)
            case 'get_user_stats':
                return await handleGetUserStats(userId)
            // Fallback per tool vecchi (compatibilità)
            case 'complete_task':
                return await handleCompleteTask(userId, input)
            case 'add_resource':
                return await handleAddResource(userId, input)
            case 'get_user_progress':
                return await handleGetProgress(userId)
            default:
                return { success: false, message: `Tool non supportato: ${toolName}` }
        }
    } catch (error: any) {
        console.error(`Tool error (${toolName}):`, error)
        return { success: false, message: error.message }
    }
}

// ============================================
// HANDLERS
// ============================================

async function handleGetFullDashboard(
    userId: string
): Promise<{ success: boolean; message: string; data?: any }> {
    const { data: areas } = await supabase
        .from('life_areas')
        .select('area_type, progress, goal_state, active_tasks')
        .eq('clerk_user_id', userId)
        .order('priority', { ascending: false })

    if (!areas) {
        return { success: false, message: 'Nessun dato' }
    }

    const totalProgress = areas.length > 0
        ? Math.round(areas.reduce((sum: number, a: any) => sum + (a.progress || 0), 0) / areas.length)
        : 0

    const summary = areas.map((a: any) => {
        const tasks = Array.isArray(a.active_tasks) ? a.active_tasks : []
        return {
            area: a.area_type,
            progress: a.progress || 0,
            goal: a.goal_state?.title || null,
            pending_tasks: tasks.filter((t: any) => !t.completed).map((t: any) => t.title).slice(0, 3)
        }
    })

    return {
        success: true,
        message: `Progresso totale: ${totalProgress}%`,
        data: summary
    }
}

// ============================================
// MISSION & OBJECTIVES HANDLERS
// ============================================

async function handleSetMission(
    userId: string,
    input: {
        title: string
        description?: string
        start_value?: number
        target_value?: number
        current_value?: number
        unit?: string
        target_date?: string
    }
): Promise<{ success: boolean; message: string; data?: any }> {
    // Prima controlla se esiste già una missione attiva
    const { data: existingMission } = await supabase
        .from('user_mission')
        .select('id')
        .eq('clerk_user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

    if (existingMission) {
        // Aggiorna la missione esistente
        const { error } = await supabase
            .from('user_mission')
            .update({
                title: input.title,
                description: input.description || null,
                start_value: input.start_value || null,
                target_value: input.target_value || null,
                current_value: input.current_value ?? input.start_value ?? null,
                unit: input.unit || null,
                target_date: input.target_date || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingMission.id)

        if (error) {
            console.error('Error updating mission:', error)
            return { success: false, message: 'Errore aggiornamento missione' }
        }

        return {
            success: true,
            message: `Missione aggiornata: "${input.title}"`,
            data: { mission_id: existingMission.id }
        }
    }

    // Crea nuova missione
    const { data: newMission, error } = await supabase
        .from('user_mission')
        .insert({
            clerk_user_id: userId,
            title: input.title,
            description: input.description || null,
            start_value: input.start_value || null,
            target_value: input.target_value || null,
            current_value: input.current_value ?? input.start_value ?? null,
            unit: input.unit || null,
            start_date: new Date().toISOString().split('T')[0],
            target_date: input.target_date || null,
            status: 'active'
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error creating mission:', error)
        return { success: false, message: 'Errore creazione missione' }
    }

    return {
        success: true,
        message: `Missione creata: "${input.title}"`,
        data: { mission_id: newMission.id }
    }
}

async function handleAddObjective(
    userId: string,
    input: {
        title: string
        description?: string
        difficulty?: 'easy' | 'medium' | 'hard'
        status?: 'pending' | 'active' | 'locked'
    }
): Promise<{ success: boolean; message: string }> {
    // Prima trova la missione attiva
    const { data: mission } = await supabase
        .from('user_mission')
        .select('id')
        .eq('clerk_user_id', userId)
        .in('status', ['active', 'locked'])
        .order('created_at', { ascending: false })
        .maybeSingle()

    if (!mission) {
        return { success: false, message: 'Nessuna missione attiva. Prima imposta una missione.' }
    }

    // Conta le task esistenti per determinare sort_order
    const { count } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .eq('clerk_user_id', userId)
        .eq('mission_id', mission.id)

    const isFirstTask = (count || 0) === 0
    const difficulty = input.difficulty || 'medium'

    // XP rewards based on difficulty
    const xpRewards: Record<string, number> = {
        easy: 30,
        medium: 60,
        hard: 100
    }

    // Estimated time based on difficulty
    const estimatedTime: Record<string, number> = {
        easy: 15,
        medium: 30,
        hard: 60
    }

    const { error } = await supabase
        .from('objectives')
        .insert({
            clerk_user_id: userId,
            mission_id: mission.id,
            title: input.title,
            description: input.description || null,
            difficulty: difficulty,
            xp_reward: xpRewards[difficulty],
            estimated_minutes: estimatedTime[difficulty],
            status: isFirstTask ? 'active' : (input.status || 'locked'),
            progress: 0,
            sort_order: (count || 0) + 1
        })

    if (error) {
        console.error('Error adding objective:', error)
        return { success: false, message: 'Errore aggiunta task' }
    }

    const difficultyLabel = { easy: 'Facile', medium: 'Media', hard: 'Difficile' }

    return {
        success: true,
        message: `Task aggiunta: "${input.title}" (${difficultyLabel[difficulty]}, +${xpRewards[difficulty]} XP)`
    }
}

async function handleUpdateProgress(
    userId: string,
    input: {
        type: 'mission' | 'objective'
        title?: string
        current_value?: number
        progress?: number
        status?: 'pending' | 'active' | 'completed'
    }
): Promise<{ success: boolean; message: string }> {
    if (input.type === 'mission') {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() }

        if (input.current_value !== undefined) {
            updates.current_value = input.current_value
        }
        if (input.status) {
            updates.status = input.status
        }

        const { error } = await supabase
            .from('user_mission')
            .update(updates)
            .eq('clerk_user_id', userId)
            .eq('status', 'active')

        if (error) {
            return { success: false, message: 'Errore aggiornamento missione' }
        }

        return {
            success: true,
            message: input.current_value
                ? `Missione aggiornata: nuovo valore ${input.current_value}`
                : `Stato missione aggiornato`
        }
    }

    // Aggiorna obiettivo
    if (!input.title) {
        return { success: false, message: 'Specifica il titolo dell\'obiettivo da aggiornare' }
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if (input.progress !== undefined) {
        updates.progress = Math.max(0, Math.min(100, input.progress))
    }
    if (input.status) {
        updates.status = input.status
        if (input.status === 'completed') {
            updates.progress = 100
        }
    }

    const { error } = await supabase
        .from('objectives')
        .update(updates)
        .eq('clerk_user_id', userId)
        .ilike('title', `%${input.title}%`)

    if (error) {
        return { success: false, message: 'Errore aggiornamento obiettivo' }
    }

    return {
        success: true,
        message: `Obiettivo "${input.title}" aggiornato`
    }
}

async function handleAddTask(
    userId: string,
    input: { area: AreaType; title: string }
): Promise<{ success: boolean; message: string }> {
    const { data: area } = await supabase
        .from('life_areas')
        .select('active_tasks')
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)
        .single()

    if (!area) {
        return { success: false, message: `Area ${input.area} non trovata` }
    }

    const existingTasks = Array.isArray(area.active_tasks) ? area.active_tasks : []
    const newTask = {
        id: crypto.randomUUID(),
        title: input.title,
        priority: 'medium',
        completed: false,
        created_at: new Date().toISOString()
    }

    await supabase
        .from('life_areas')
        .update({
            active_tasks: [...existingTasks, newTask],
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    return {
        success: true,
        message: `Task aggiunto: "${input.title}"`
    }
}

async function handleSetGoal(
    userId: string,
    input: { area: AreaType; title: string }
): Promise<{ success: boolean; message: string }> {
    await supabase
        .from('life_areas')
        .update({
            goal_state: {
                title: input.title,
                set_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    return {
        success: true,
        message: `Obiettivo impostato: "${input.title}"`
    }
}

async function handleSaveMemory(
    userId: string,
    input: { type: string; content: string; importance: number }
): Promise<{ success: boolean; message: string }> {
    await supabase
        .from('user_memory')
        .insert({
            clerk_user_id: userId,
            memory_type: input.type,
            content: input.content,
            importance: Math.max(1, Math.min(10, input.importance)),
            confidence: 8,
            is_current: true,
            mention_count: 1,
            last_relevant_at: new Date().toISOString()
        })

    return {
        success: true,
        message: `Memoria salvata`
    }
}

async function handleAddJournalMessage(
    userId: string,
    input: { type: string; content: string; title?: string }
): Promise<{ success: boolean; message: string }> {
    await supabase
        .from('journal_entries')
        .insert({
            clerk_user_id: userId,
            entry_type: input.type,
            title: input.title || null,
            content: input.content,
            metadata: { added_by: 'nur' }
        })

    return {
        success: true,
        message: `Aggiunto alla Scrivania`
    }
}

async function handleLogMood(
    userId: string,
    input: { mood_score: number; emotions: string[] }
): Promise<{ success: boolean; message: string }> {
    await supabase
        .from('mood_logs')
        .insert({
            clerk_user_id: userId,
            mood_score: Math.max(1, Math.min(10, input.mood_score)),
            emotions: input.emotions,
            detected_by: 'nur'
        })

    return {
        success: true,
        message: `Mood registrato: ${input.mood_score}/10`
    }
}

// ============================================
// HANDLERS LEGACY (per compatibilità)
// ============================================

async function handleCompleteTask(
    userId: string,
    input: { area: AreaType; task_title: string }
): Promise<{ success: boolean; message: string }> {
    const { data: area } = await supabase
        .from('life_areas')
        .select('active_tasks')
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)
        .single()

    if (!area) {
        return { success: false, message: `Area non trovata` }
    }

    const tasks = Array.isArray(area.active_tasks) ? area.active_tasks : []
    const taskToComplete = tasks.find((t: any) =>
        t.title.toLowerCase().includes(input.task_title.toLowerCase())
    )

    if (!taskToComplete) {
        return { success: false, message: `Task non trovato` }
    }

    const updatedTasks = tasks.map((t: any) =>
        t.id === taskToComplete.id
            ? { ...t, completed: true, completed_at: new Date().toISOString() }
            : t
    )

    await supabase
        .from('life_areas')
        .update({ active_tasks: updatedTasks })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    return {
        success: true,
        message: `Task completato!`
    }
}

async function handleAddResource(
    userId: string,
    input: { type: string; title: string; description: string; author?: string; area?: AreaType }
): Promise<{ success: boolean; message: string }> {
    await supabase
        .from('journal_entries')
        .insert({
            clerk_user_id: userId,
            entry_type: input.type,
            title: input.title,
            content: input.description,
            metadata: { author: input.author, added_by: 'nur' },
            area_related: input.area || null
        })

    return {
        success: true,
        message: `Risorsa aggiunta: "${input.title}"`
    }
}

async function handleGetProgress(
    userId: string
): Promise<{ success: boolean; message: string; data?: any }> {
    const { data: areas } = await supabase
        .from('life_areas')
        .select('area_type, progress')
        .eq('clerk_user_id', userId)

    if (!areas) {
        return { success: false, message: 'Nessuna area' }
    }

    return {
        success: true,
        message: 'Progressi caricati',
        data: areas.map((a: any) => ({ area: a.area_type, progress: a.progress }))
    }
}

// ============================================
// GAMIFICATION HANDLERS
// ============================================

// XP thresholds per level (formula: 1000 * 1.15^(level-1))
function getXpForLevel(level: number): number {
    return Math.floor(1000 * Math.pow(1.15, level - 1))
}

// Streak multiplier
function getStreakMultiplier(streak: number): number {
    if (streak >= 30) return 2.5
    if (streak >= 14) return 2.0
    if (streak >= 7) return 1.5
    return 1.0
}

// Rank thresholds
const RANKS = [
    { level: 1, name: '🌱 Seme' },
    { level: 5, name: '🚶 Viaggiatore' },
    { level: 10, name: '⚔️ Guerriero' },
    { level: 20, name: '🦅 Esploratore' },
    { level: 35, name: '👑 Maestro' },
    { level: 50, name: '🌟 Leggenda' },
]

function getRank(level: number): string {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (level >= RANKS[i].level) return RANKS[i].name
    }
    return RANKS[0].name
}

async function ensureUserStats(userId: string): Promise<{
    level: number
    xp: number
    streak: number
    lives: number
    last_activity: string | null
}> {
    const { data: existing } = await supabase
        .from('user_stats')
        .select('*')
        .eq('clerk_user_id', userId)
        .maybeSingle()

    if (existing) {
        return existing
    }

    // Create default stats
    const defaultStats = {
        clerk_user_id: userId,
        level: 1,
        xp: 0,
        streak: 0,
        lives: 3,
        last_activity: new Date().toISOString()
    }

    await supabase.from('user_stats').insert(defaultStats)
    return defaultStats
}

async function handleAwardXp(
    userId: string,
    input: { amount: number; reason: string; category?: string }
): Promise<{ success: boolean; message: string; data?: any }> {
    const stats = await ensureUserStats(userId)
    const multiplier = getStreakMultiplier(stats.streak)
    const finalXp = Math.floor(input.amount * multiplier)

    let newXp = stats.xp + finalXp
    let newLevel = stats.level

    // Check for level up
    while (newXp >= getXpForLevel(newLevel)) {
        newXp -= getXpForLevel(newLevel)
        newLevel++
    }

    const leveledUp = newLevel > stats.level
    const newRank = getRank(newLevel)
    const oldRank = getRank(stats.level)
    const rankUp = newRank !== oldRank

    await supabase
        .from('user_stats')
        .update({
            xp: newXp,
            level: newLevel,
            last_activity: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)

    let message = `+${finalXp} XP`
    if (multiplier > 1) {
        message += ` (x${multiplier} streak bonus!)`
    }
    if (leveledUp) {
        message += ` 🎉 Level Up! Ora sei livello ${newLevel}!`
    }
    if (rankUp) {
        message += ` 🏆 Nuovo rank: ${newRank}!`
    }

    return {
        success: true,
        message,
        data: {
            xp_gained: finalXp,
            base_xp: input.amount,
            multiplier,
            new_level: newLevel,
            new_xp: newXp,
            leveled_up: leveledUp,
            rank_up: rankUp,
            new_rank: newRank
        }
    }
}

async function handleUpdateStreak(
    userId: string,
    input: { action: 'increment' | 'reset' }
): Promise<{ success: boolean; message: string; data?: any }> {
    const stats = await ensureUserStats(userId)

    const today = new Date().toISOString().split('T')[0]
    const lastActivity = stats.last_activity ? new Date(stats.last_activity).toISOString().split('T')[0] : null

    let newStreak = stats.streak

    if (input.action === 'reset') {
        newStreak = 0
    } else if (input.action === 'increment') {
        // Only increment if last activity wasn't today
        if (lastActivity !== today) {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().split('T')[0]

            if (lastActivity === yesterdayStr) {
                // Consecutive day
                newStreak = stats.streak + 1
            } else if (!lastActivity || lastActivity < yesterdayStr) {
                // Streak broken, start fresh
                newStreak = 1
            }
            // If lastActivity is today, don't change streak
        }
    }

    await supabase
        .from('user_stats')
        .update({
            streak: newStreak,
            last_activity: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)

    const multiplier = getStreakMultiplier(newStreak)

    return {
        success: true,
        message: input.action === 'reset'
            ? '😢 Streak resettato'
            : `🔥 Streak: ${newStreak} giorni! (${multiplier}x XP)`,
        data: {
            streak: newStreak,
            multiplier
        }
    }
}

async function handleModifyLives(
    userId: string,
    input: { change: number; reason: string }
): Promise<{ success: boolean; message: string; data?: any }> {
    const stats = await ensureUserStats(userId)
    const newLives = Math.max(0, Math.min(5, stats.lives + input.change))

    await supabase
        .from('user_stats')
        .update({
            lives: newLives,
            last_activity: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)

    const emoji = input.change > 0 ? '❤️' : '💔'
    const action = input.change > 0 ? 'guadagnata' : 'persa'

    return {
        success: true,
        message: `${emoji} Vita ${action}: ${input.reason}. Vite: ${newLives}/5`,
        data: {
            lives: newLives,
            change: input.change
        }
    }
}

async function handleCompleteObjective(
    userId: string,
    input: { objective_title: string; notes?: string }
): Promise<{ success: boolean; message: string; data?: any }> {
    // Find the objective
    const { data: objective } = await supabase
        .from('objectives')
        .select('*')
        .eq('clerk_user_id', userId)
        .ilike('title', `%${input.objective_title}%`)
        .maybeSingle()

    if (!objective) {
        return { success: false, message: `Obiettivo "${input.objective_title}" non trovato` }
    }

    // Mark as completed
    await supabase
        .from('objectives')
        .update({
            status: 'completed',
            progress: 100,
            completed_at: new Date().toISOString(),
            notes: input.notes || null
        })
        .eq('id', objective.id)

    // Calculate XP based on level
    const xpByLevel: Record<string, number> = {
        major: 150,
        sub: 90,
        task: 50
    }
    const baseXp = xpByLevel[objective.level] || 50

    // Award XP
    const xpResult = await handleAwardXp(userId, {
        amount: baseXp,
        reason: `Completato: ${objective.title}`,
        category: 'objective_progress'
    })

    // Update streak
    await handleUpdateStreak(userId, { action: 'increment' })

    // Find next objective to activate
    const { data: nextObjective } = await supabase
        .from('objectives')
        .select('id, title')
        .eq('clerk_user_id', userId)
        .eq('mission_id', objective.mission_id)
        .eq('status', 'pending')
        .order('sort_order')
        .limit(1)
        .maybeSingle()

    if (nextObjective) {
        await supabase
            .from('objectives')
            .update({ status: 'active' })
            .eq('id', nextObjective.id)
    }

    return {
        success: true,
        message: `✅ "${objective.title}" completato! ${xpResult.message}`,
        data: {
            objective_completed: objective.title,
            xp_result: xpResult.data,
            next_objective: nextObjective?.title || null
        }
    }
}

async function handleGetUserStats(
    userId: string
): Promise<{ success: boolean; message: string; data?: any }> {
    const stats = await ensureUserStats(userId)
    const xpToNext = getXpForLevel(stats.level)
    const rank = getRank(stats.level)
    const multiplier = getStreakMultiplier(stats.streak)

    return {
        success: true,
        message: `Livello ${stats.level} (${rank})`,
        data: {
            level: stats.level,
            xp: stats.xp,
            xp_to_next: xpToNext,
            xp_progress: Math.round((stats.xp / xpToNext) * 100),
            streak: stats.streak,
            streak_multiplier: multiplier,
            lives: stats.lives,
            max_lives: 5,
            rank
        }
    }
}
