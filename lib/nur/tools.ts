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
    // ============================================
    // TOOLS DI VISIONE - Per vedere tutto
    // ============================================
    {
        name: 'get_full_dashboard',
        description: 'Ottiene una visione COMPLETA della situazione dell\'utente: tutte le aree, tutti i task, obiettivi, progressi, soluzioni attive, e journal recente. USA QUESTO per avere il quadro completo.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'get_area_details',
        description: 'Ottiene i dettagli completi di una specifica area della vita: stato attuale, obiettivo, tutti i task, note, ultimo aggiornamento.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'L\'area da visualizzare'
                }
            },
            required: ['area']
        }
    },
    {
        name: 'get_journal_entries',
        description: 'Ottiene le risorse salvate nel journal: libri, film, articoli, citazioni aggiunti per la crescita dell\'utente.',
        input_schema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Numero massimo di entry (default 20)'
                },
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'Filtra per area (opzionale)'
                },
                type: {
                    type: 'string',
                    enum: ['book', 'movie', 'article', 'video', 'podcast', 'course', 'quote'],
                    description: 'Filtra per tipo (opzionale)'
                }
            },
            required: []
        }
    },
    {
        name: 'get_solutions',
        description: 'Ottiene i piani/soluzioni dell\'utente con il loro stato e progresso.',
        input_schema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['proposta', 'accettata', 'in_corso', 'completata', 'abbandonata'],
                    description: 'Filtra per stato (opzionale)'
                }
            },
            required: []
        }
    },
    {
        name: 'get_user_memories',
        description: 'Ottiene le memorie salvate sull\'utente: fatti, preferenze, pattern, achievement, struggle.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'Filtra per area (opzionale)'
                },
                type: {
                    type: 'string',
                    enum: ['fact', 'preference', 'goal', 'struggle', 'achievement', 'pattern', 'emotion', 'relationship', 'trigger', 'value'],
                    description: 'Filtra per tipo (opzionale)'
                }
            },
            required: []
        }
    },

    // ============================================
    // TOOLS DI AZIONE - Per modificare
    // ============================================
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
    },
    {
        name: 'save_memory',
        description: 'Salva un fatto importante sull\'utente che hai appreso dalla conversazione.',
        input_schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['fact', 'preference', 'goal', 'struggle', 'achievement', 'pattern', 'emotion', 'relationship', 'trigger', 'value'],
                    description: 'Tipo di memoria'
                },
                content: {
                    type: 'string',
                    description: 'Il contenuto della memoria (breve e chiaro)'
                },
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'Area correlata (opzionale)'
                },
                importance: {
                    type: 'number',
                    description: 'Importanza da 1 a 10'
                }
            },
            required: ['type', 'content', 'importance']
        }
    },
    {
        name: 'add_journal_message',
        description: 'Aggiunge un messaggio/nota nel journal dell\'utente. Usa per insight, promemoria, riflessioni.',
        input_schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['nur_message', 'insight', 'suggestion', 'reminder', 'reflection_prompt', 'challenge', 'achievement'],
                    description: 'Tipo di entry'
                },
                title: {
                    type: 'string',
                    description: 'Titolo breve (opzionale)'
                },
                content: {
                    type: 'string',
                    description: 'Contenuto del messaggio'
                },
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'Area correlata (opzionale)'
                },
                priority: {
                    type: 'number',
                    description: 'Priorità nel feed (1-10, default 5)'
                }
            },
            required: ['type', 'content']
        }
    },
    {
        name: 'update_solution_status',
        description: 'Aggiorna lo stato di una soluzione/piano.',
        input_schema: {
            type: 'object',
            properties: {
                solution_title: {
                    type: 'string',
                    description: 'Titolo o parte del titolo della soluzione'
                },
                new_status: {
                    type: 'string',
                    enum: ['proposta', 'accettata', 'in_corso', 'completata', 'abbandonata'],
                    description: 'Nuovo stato'
                },
                progress: {
                    type: 'number',
                    description: 'Percentuale di completamento (0-100)'
                }
            },
            required: ['solution_title', 'new_status']
        }
    },
    {
        name: 'set_area_priority',
        description: 'Imposta la priorità di un\'area della vita (1-10). Aree con priorità alta appaiono più in evidenza.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'L\'area della vita'
                },
                priority: {
                    type: 'number',
                    description: 'Priorità da 1 a 10'
                }
            },
            required: ['area', 'priority']
        }
    },
    {
        name: 'add_area_note',
        description: 'Aggiunge una nota personale a un\'area della vita.',
        input_schema: {
            type: 'object',
            properties: {
                area: {
                    type: 'string',
                    enum: ['salute', 'soldi', 'relazioni', 'lavoro', 'hobby', 'crescita', 'casa', 'sociale', 'spirituale', 'futuro'],
                    description: 'L\'area della vita'
                },
                note: {
                    type: 'string',
                    description: 'Nota da aggiungere'
                }
            },
            required: ['area', 'note']
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
            // === TOOLS DI VISIONE ===
            case 'get_full_dashboard':
                return await handleGetFullDashboard(userId)
            case 'get_area_details':
                return await handleGetAreaDetails(userId, input)
            case 'get_journal_entries':
                return await handleGetJournalEntries(userId, input)
            case 'get_solutions':
                return await handleGetSolutions(userId, input)
            case 'get_user_memories':
                return await handleGetUserMemories(userId, input)
            case 'get_user_progress':
                return await handleGetProgress(userId)

            // === TOOLS DI AZIONE ===
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
            case 'update_progress':
                return await handleUpdateProgress(userId, input)
            case 'save_memory':
                return await handleSaveMemory(userId, input)
            case 'add_journal_message':
                return await handleAddJournalMessage(userId, input)
            case 'update_solution_status':
                return await handleUpdateSolutionStatus(userId, input)
            case 'set_area_priority':
                return await handleSetAreaPriority(userId, input)
            case 'add_area_note':
                return await handleAddAreaNote(userId, input)

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

// ============================================
// NUOVI HANDLERS - VISIONE
// ============================================

async function handleGetFullDashboard(
    userId: string
): Promise<{ success: boolean; message: string; data?: any }> {
    // Esegui tutte le query in parallelo
    const [areasResult, solutionsResult, journalResult, memoriesResult, profileResult] = await Promise.all([
        supabase
            .from('life_areas')
            .select('*')
            .eq('clerk_user_id', userId)
            .order('priority', { ascending: false }),
        supabase
            .from('solutions')
            .select('*')
            .eq('clerk_user_id', userId)
            .in('status', ['proposta', 'accettata', 'in_corso'])
            .order('created_at', { ascending: false })
            .limit(10),
        supabase
            .from('journal_entries')
            .select('*')
            .eq('clerk_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),
        supabase
            .from('user_memory')
            .select('*')
            .eq('clerk_user_id', userId)
            .eq('is_current', true)
            .order('importance', { ascending: false })
            .limit(15),
        supabase
            .from('profiles')
            .select('*')
            .eq('clerk_user_id', userId)
            .maybeSingle()
    ])

    const areas = areasResult.data || []
    const totalProgress = areas.length > 0
        ? Math.round(areas.reduce((sum: number, a: any) => sum + (a.progress || 0), 0) / areas.length)
        : 0

    const dashboard = {
        profile: profileResult.data,
        total_progress: totalProgress,
        areas: areas.map((a: any) => ({
            area: a.area_type,
            progress: a.progress || 0,
            priority: a.priority || 5,
            goal: a.goal_state?.title || null,
            current_state: a.current_state?.description || null,
            tasks_total: Array.isArray(a.active_tasks) ? a.active_tasks.length : 0,
            tasks_completed: Array.isArray(a.active_tasks) ? a.active_tasks.filter((t: any) => t.completed).length : 0,
            pending_tasks: Array.isArray(a.active_tasks)
                ? a.active_tasks.filter((t: any) => !t.completed).map((t: any) => t.title)
                : [],
            notes: a.notes || null,
            last_update: a.last_significant_update
        })),
        active_solutions: (solutionsResult.data || []).map((s: any) => ({
            title: s.title,
            status: s.status,
            progress: s.progress,
            area: s.area_type
        })),
        recent_journal: (journalResult.data || []).map((j: any) => ({
            type: j.entry_type,
            title: j.title,
            content: j.content?.substring(0, 100),
            area: j.area_related
        })),
        memories: (memoriesResult.data || []).map((m: any) => ({
            type: m.memory_type,
            content: m.content,
            area: m.area_related,
            importance: m.importance
        }))
    }

    return {
        success: true,
        message: 'Dashboard completa caricata',
        data: dashboard
    }
}

async function handleGetAreaDetails(
    userId: string,
    input: { area: AreaType }
): Promise<{ success: boolean; message: string; data?: any }> {
    const { data: area, error } = await supabase
        .from('life_areas')
        .select('*')
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)
        .single()

    if (error || !area) {
        return { success: false, message: `Area ${input.area} non trovata` }
    }

    const tasks = Array.isArray(area.active_tasks) ? area.active_tasks : []

    const details = {
        area: area.area_type,
        progress: area.progress || 0,
        priority: area.priority || 5,
        current_state: area.current_state?.description || 'Non definito',
        goal: area.goal_state?.title || 'Nessun obiettivo',
        goal_description: area.goal_state?.description || null,
        notes: area.notes || null,
        last_update: area.last_significant_update,
        tasks: {
            total: tasks.length,
            completed: tasks.filter((t: any) => t.completed).length,
            pending: tasks.filter((t: any) => !t.completed).length,
            list: tasks.map((t: any) => ({
                title: t.title,
                priority: t.priority,
                completed: t.completed,
                created_at: t.created_at,
                completed_at: t.completed_at
            }))
        }
    }

    return {
        success: true,
        message: `Dettagli ${input.area} caricati`,
        data: details
    }
}

async function handleGetJournalEntries(
    userId: string,
    input: { limit?: number; area?: AreaType; type?: string }
): Promise<{ success: boolean; message: string; data?: any }> {
    let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('clerk_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(input.limit || 20)

    if (input.area) {
        query = query.eq('area_related', input.area)
    }
    if (input.type) {
        query = query.eq('entry_type', input.type)
    }

    const { data: entries, error } = await query

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `${entries?.length || 0} entry trovate`,
        data: (entries || []).map((e: any) => ({
            type: e.entry_type,
            title: e.title,
            content: e.content,
            area: e.area_related,
            metadata: e.metadata,
            is_pinned: e.is_pinned,
            created_at: e.created_at
        }))
    }
}

async function handleGetSolutions(
    userId: string,
    input: { status?: string }
): Promise<{ success: boolean; message: string; data?: any }> {
    let query = supabase
        .from('solutions')
        .select('*')
        .eq('clerk_user_id', userId)
        .order('created_at', { ascending: false })

    if (input.status) {
        query = query.eq('status', input.status)
    }

    const { data: solutions, error } = await query

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `${solutions?.length || 0} soluzioni trovate`,
        data: (solutions || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            status: s.status,
            progress: s.progress,
            area: s.area_type,
            steps: s.steps,
            created_at: s.created_at
        }))
    }
}

async function handleGetUserMemories(
    userId: string,
    input: { area?: AreaType; type?: string }
): Promise<{ success: boolean; message: string; data?: any }> {
    let query = supabase
        .from('user_memory')
        .select('*')
        .eq('clerk_user_id', userId)
        .eq('is_current', true)
        .order('importance', { ascending: false })
        .limit(30)

    if (input.area) {
        query = query.eq('area_related', input.area)
    }
    if (input.type) {
        query = query.eq('memory_type', input.type)
    }

    const { data: memories, error } = await query

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `${memories?.length || 0} memorie trovate`,
        data: (memories || []).map((m: any) => ({
            type: m.memory_type,
            content: m.content,
            area: m.area_related,
            importance: m.importance,
            confidence: m.confidence,
            mention_count: m.mention_count,
            created_at: m.created_at
        }))
    }
}

// ============================================
// NUOVI HANDLERS - AZIONE
// ============================================

async function handleSaveMemory(
    userId: string,
    input: { type: string; content: string; area?: AreaType; importance: number }
): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
        .from('user_memory')
        .insert({
            clerk_user_id: userId,
            memory_type: input.type,
            content: input.content,
            area_related: input.area || null,
            importance: Math.max(1, Math.min(10, input.importance)),
            confidence: 8,
            is_current: true,
            mention_count: 1,
            last_relevant_at: new Date().toISOString()
        })

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Memoria salvata: "${input.content.substring(0, 50)}..."`
    }
}

async function handleAddJournalMessage(
    userId: string,
    input: { type: string; title?: string; content: string; area?: AreaType; priority?: number }
): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
        .from('journal_entries')
        .insert({
            clerk_user_id: userId,
            entry_type: input.type,
            title: input.title || null,
            content: input.content,
            area_related: input.area || null,
            feed_priority: input.priority || 5,
            is_seen: false,
            user_interacted: false,
            is_pinned: false,
            is_from_nur: true
        })

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Messaggio aggiunto al journal: "${input.title || input.content.substring(0, 30)}..."`
    }
}

async function handleUpdateSolutionStatus(
    userId: string,
    input: { solution_title: string; new_status: string; progress?: number }
): Promise<{ success: boolean; message: string }> {
    // Trova la soluzione
    const { data: solutions } = await supabase
        .from('solutions')
        .select('id, title')
        .eq('clerk_user_id', userId)
        .ilike('title', `%${input.solution_title}%`)
        .limit(1)

    if (!solutions || solutions.length === 0) {
        return { success: false, message: `Soluzione "${input.solution_title}" non trovata` }
    }

    const updateData: any = {
        status: input.new_status,
        updated_at: new Date().toISOString()
    }

    if (input.progress !== undefined) {
        updateData.progress = Math.max(0, Math.min(100, input.progress))
    }

    const { error } = await supabase
        .from('solutions')
        .update(updateData)
        .eq('id', solutions[0].id)

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Soluzione "${solutions[0].title}" aggiornata a ${input.new_status}`
    }
}

async function handleSetAreaPriority(
    userId: string,
    input: { area: AreaType; priority: number }
): Promise<{ success: boolean; message: string }> {
    const priority = Math.max(1, Math.min(10, input.priority))

    const { error } = await supabase
        .from('life_areas')
        .update({
            priority,
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Priorità ${input.area} impostata a ${priority}/10`
    }
}

async function handleAddAreaNote(
    userId: string,
    input: { area: AreaType; note: string }
): Promise<{ success: boolean; message: string }> {
    // Prima ottieni la nota esistente
    const { data: area } = await supabase
        .from('life_areas')
        .select('notes')
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)
        .single()

    const existingNotes = area?.notes || ''
    const timestamp = new Date().toLocaleDateString('it-IT')
    const newNote = existingNotes
        ? `${existingNotes}\n\n[${timestamp}] ${input.note}`
        : `[${timestamp}] ${input.note}`

    const { error } = await supabase
        .from('life_areas')
        .update({
            notes: newNote,
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
        .eq('area_type', input.area)

    if (error) {
        return { success: false, message: error.message }
    }

    return {
        success: true,
        message: `Nota aggiunta a ${input.area}`
    }
}
