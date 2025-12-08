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
