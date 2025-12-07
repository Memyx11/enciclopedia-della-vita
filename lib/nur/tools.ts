/**
 * NUR Tools System
 * Funzioni che NUR può chiamare per interagire con il sistema
 */

import { supabase } from '@/lib/supabase'
import { AreaType } from './memory'

// ============================================
// TOOL DEFINITIONS (per Claude API)
// ============================================

export const NUR_TOOLS = [
    {
        name: 'add_task',
        description: 'Aggiunge un task a un\'area della vita dell\'utente. Usa quando l\'utente esprime un obiettivo concreto o quando suggerisci un\'azione.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'L\'area della vita a cui appartiene il task'
                },
                title: {
                    type: 'string',
                    description: 'Titolo breve del task (max 100 caratteri)'
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Priorità del task'
                }
            },
            required: ['area', 'title']
        }
    },
    {
        name: 'complete_task',
        description: 'Segna un task come completato. Usa quando l\'utente dice di aver fatto qualcosa.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'L\'area del task'
                },
                task_title: {
                    type: 'string',
                    description: 'Titolo o parte del titolo del task da completare'
                }
            },
            required: ['area', 'task_title']
        }
    },
    {
        name: 'set_goal',
        description: 'Imposta l\'obiettivo principale per un\'area della vita. Usa quando l\'utente definisce chiaramente cosa vuole raggiungere.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'L\'area della vita'
                },
                title: {
                    type: 'string',
                    description: 'Obiettivo in una frase chiara'
                },
                description: {
                    type: 'string',
                    description: 'Descrizione più dettagliata (opzionale)'
                }
            },
            required: ['area', 'title']
        }
    },
    {
        name: 'update_current_state',
        description: 'Aggiorna la situazione attuale di un\'area. Usa quando l\'utente descrive come sta ora in un\'area.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'L\'area della vita'
                },
                description: {
                    type: 'string',
                    description: 'Descrizione della situazione attuale'
                }
            },
            required: ['area', 'description']
        }
    },
    {
        name: 'add_resource',
        description: 'Aggiunge un libro, film, articolo o risorsa utile per la crescita dell\'utente.',
        input_schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['book', 'movie', 'article', 'video', 'podcast', 'course', 'quote'],
                    description: 'Tipo di risorsa'
                },
                title: {
                    type: 'string',
                    description: 'Titolo della risorsa'
                },
                author: {
                    type: 'string',
                    description: 'Autore/creatore (opzionale)'
                },
                description: {
                    type: 'string',
                    description: 'Perché è utile per l\'utente'
                },
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'Area correlata (opzionale)'
                }
            },
            required: ['type', 'title', 'description']
        }
    },
    {
        name: 'get_user_progress',
        description: 'Ottiene un riepilogo dei progressi dell\'utente in tutte le aree. Usa per avere contesto.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'update_progress',
        description: 'Aggiorna la percentuale di progresso di un\'area (0-100).',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'L\'area della vita'
                },
                progress: {
                    type: 'number',
                    description: 'Percentuale di progresso (0-100)'
                },
                reason: {
                    type: 'string',
                    description: 'Motivo dell\'aggiornamento'
                }
            },
            required: ['area', 'progress']
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
            case 'add_task':
                return await handleAddTask(userId, input)
            case 'complete_task':
                return await handleCompleteTask(userId, input)
            case 'set_goal':
                return await handleSetGoal(userId, input)
            case 'update_current_state':
                return await handleUpdateCurrentState(userId, input)
            case 'add_resource':
                return await handleAddResource(userId, input)
            case 'get_user_progress':
                return await handleGetProgress(userId)
            case 'update_progress':
                return await handleUpdateProgress(userId, input)
            default:
                return { success: false, message: `Tool sconosciuto: ${toolName}` }
        }
    } catch (error: any) {
        console.error(`Tool error (${toolName}):`, error)
        return { success: false, message: error.message }
    }
}

async function handleAddTask(
    userId: string,
    input: { area: AreaType; title: string; priority?: string }
): Promise<{ success: boolean; message: string; data?: any }> {
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
        priority: input.priority || 'medium',
        completed: false,
        created_at: new Date().toISOString()
    }

    const { error } = await supabase
        .from('life_areas')
        .update({
            active_tasks: [...existingTasks, newTask],
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Task aggiunto in ${input.area}: "${input.title}"`,
        data: newTask
    }
}

async function handleCompleteTask(
    userId: string,
    input: { area: AreaType; task_title: string }
): Promise<{ success: boolean; message: string }> {
    const { data: area } = await supabase
        .from('life_areas')
        .select('active_tasks, progress')
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)
        .single()

    if (!area) {
        return { success: false, message: `Area ${input.area} non trovata` }
    }

    const tasks = Array.isArray(area.active_tasks) ? area.active_tasks : []
    const taskToComplete = tasks.find((t: any) =>
        t.title.toLowerCase().includes(input.task_title.toLowerCase())
    )

    if (!taskToComplete) {
        return { success: false, message: `Task non trovato: "${input.task_title}"` }
    }

    const updatedTasks = tasks.map((t: any) =>
        t.id === taskToComplete.id
            ? { ...t, completed: true, completed_at: new Date().toISOString() }
            : t
    )

    const completedCount = updatedTasks.filter((t: any) => t.completed).length
    const newProgress = Math.round((completedCount / updatedTasks.length) * 100)

    const { error } = await supabase
        .from('life_areas')
        .update({
            active_tasks: updatedTasks,
            progress: newProgress,
            updated_at: new Date().toISOString(),
            last_significant_update: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Task completato! "${taskToComplete.title}" - Progresso ${input.area}: ${newProgress}%`
    }
}

async function handleSetGoal(
    userId: string,
    input: { area: AreaType; title: string; description?: string }
): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
        .from('life_areas')
        .update({
            goal_state: {
                title: input.title,
                description: input.description || '',
                set_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString(),
            last_significant_update: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Obiettivo ${input.area} impostato: "${input.title}"`
    }
}

async function handleUpdateCurrentState(
    userId: string,
    input: { area: AreaType; description: string }
): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
        .from('life_areas')
        .update({
            current_state: {
                description: input.description,
                updated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Stato attuale ${input.area} aggiornato`
    }
}

async function handleAddResource(
    userId: string,
    input: { type: string; title: string; author?: string; description: string; area?: AreaType }
): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
        .from('journal_entries')
        .insert({
            clerk_user_id: userId,
            entry_type: input.type,
            title: input.title,
            content: input.description,
            metadata: {
                author: input.author,
                added_by: 'nur'
            },
            area_related: input.area || null,
            is_from_nur: true
        })

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Risorsa aggiunta: "${input.title}" (${input.type})`
    }
}

async function handleGetProgress(
    userId: string
): Promise<{ success: boolean; message: string; data?: any }> {
    const { data: areas } = await supabase
        .from('life_areas')
        .select('area_type, progress, goal_state, active_tasks, current_state')
        .eq('clerk_user_id', userId)
        .order('priority', { ascending: false })

    if (!areas) {
        return { success: false, message: 'Nessuna area trovata' }
    }

    const summary = areas.map((a: any) => {
        const tasks = Array.isArray(a.active_tasks) ? a.active_tasks : []
        const completed = tasks.filter((t: any) => t.completed).length
        const pending = tasks.filter((t: any) => !t.completed).length
        const goal = a.goal_state?.title || 'Nessun obiettivo'
        const current = a.current_state?.description || 'Non definito'

        return {
            area: a.area_type,
            progress: a.progress,
            goal,
            current_state: current,
            tasks_completed: completed,
            tasks_pending: pending,
            pending_tasks: tasks.filter((t: any) => !t.completed).map((t: any) => t.title)
        }
    })

    return {
        success: true,
        message: 'Progressi caricati',
        data: summary
    }
}

async function handleUpdateProgress(
    userId: string,
    input: { area: AreaType; progress: number; reason?: string }
): Promise<{ success: boolean; message: string }> {
    const progress = Math.max(0, Math.min(100, input.progress))

    const { error } = await supabase
        .from('life_areas')
        .update({
            progress,
            updated_at: new Date().toISOString(),
            last_significant_update: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Progresso ${input.area} aggiornato a ${progress}%${input.reason ? ` - ${input.reason}` : ''}`
    }
}
