/**
 * NUR Goals & Tasks System
 * Gestisce obiettivi e task giornalieri nelle Life Areas
 */

import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { AreaType } from './memory'

// ============================================
// TYPES
// ============================================

export interface Task {
    id: string
    title: string
    description?: string
    completed: boolean
    created_at: string
    completed_at?: string
    due_date?: string
    priority: 'low' | 'medium' | 'high'
}

export interface Goal {
    title: string
    description?: string
    target_date?: string
    milestones?: string[]
}

export interface LifeAreaWithGoals {
    id: string
    clerk_user_id: string
    area_type: AreaType
    current_state: {
        description?: string
        last_updated?: string
    }
    goal_state: Goal
    progress: number
    priority: number
    active_tasks: Task[]
    notes?: string
    updated_at: string
}

// ============================================
// LIFE AREAS FUNCTIONS
// ============================================

/**
 * Carica tutte le life areas di un utente con goals e tasks
 */
export async function loadUserLifeAreas(
    clerkUserId: string
): Promise<LifeAreaWithGoals[]> {
    const { data, error } = await supabase
        .from('life_areas')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .order('priority', { ascending: false })

    if (error) {
        console.error('Error loading life areas:', error)
        return []
    }

    return (data || []).map(area => ({
        ...area,
        current_state: typeof area.current_state === 'string'
            ? JSON.parse(area.current_state)
            : area.current_state || {},
        goal_state: typeof area.goal_state === 'string'
            ? JSON.parse(area.goal_state)
            : area.goal_state || {},
        active_tasks: Array.isArray(area.active_tasks)
            ? area.active_tasks
            : []
    }))
}

/**
 * Aggiorna il goal di un'area
 */
export async function setAreaGoal(
    clerkUserId: string,
    areaType: AreaType,
    goal: Goal
): Promise<boolean> {
    const { error } = await supabase
        .from('life_areas')
        .update({
            goal_state: goal,
            updated_at: new Date().toISOString(),
            last_significant_update: new Date().toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)

    if (error) {
        console.error('Error setting goal:', error)
        return false
    }
    return true
}

/**
 * Aggiorna lo stato attuale di un'area
 */
export async function setAreaCurrentState(
    clerkUserId: string,
    areaType: AreaType,
    state: { description: string }
): Promise<boolean> {
    const { error } = await supabase
        .from('life_areas')
        .update({
            current_state: {
                ...state,
                last_updated: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)

    if (error) {
        console.error('Error setting current state:', error)
        return false
    }
    return true
}

// ============================================
// TASKS FUNCTIONS
// ============================================

/**
 * Aggiunge un nuovo task a un'area
 */
export async function addTaskToArea(
    clerkUserId: string,
    areaType: AreaType,
    task: Omit<Task, 'id' | 'created_at' | 'completed' | 'completed_at'>
): Promise<Task | null> {
    // Carica tasks esistenti
    const { data: area } = await supabase
        .from('life_areas')
        .select('active_tasks')
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)
        .single()

    if (!area) return null

    const existingTasks: Task[] = Array.isArray(area.active_tasks)
        ? area.active_tasks
        : []

    const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        completed: false
    }

    const updatedTasks = [...existingTasks, newTask]

    const { error } = await supabase
        .from('life_areas')
        .update({
            active_tasks: updatedTasks,
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)

    if (error) {
        console.error('Error adding task:', error)
        return null
    }

    return newTask
}

/**
 * Completa o riapre un task
 */
export async function toggleTaskCompletion(
    clerkUserId: string,
    areaType: AreaType,
    taskId: string,
    completed: boolean
): Promise<boolean> {
    // Carica tasks esistenti
    const { data: area } = await supabase
        .from('life_areas')
        .select('active_tasks, progress')
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)
        .single()

    if (!area) return false

    const tasks: Task[] = Array.isArray(area.active_tasks)
        ? area.active_tasks
        : []

    // Trova e aggiorna il task
    const updatedTasks = tasks.map(task =>
        task.id === taskId
            ? {
                ...task,
                completed,
                completed_at: completed ? new Date().toISOString() : undefined
              }
            : task
    )

    // Calcola nuovo progresso basato sui task completati
    const completedCount = updatedTasks.filter(t => t.completed).length
    const totalCount = updatedTasks.length
    const newProgress = totalCount > 0
        ? Math.round((completedCount / totalCount) * 100)
        : area.progress

    const { error } = await supabase
        .from('life_areas')
        .update({
            active_tasks: updatedTasks,
            progress: newProgress,
            updated_at: new Date().toISOString(),
            last_significant_update: new Date().toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)

    if (error) {
        console.error('Error toggling task:', error)
        return false
    }

    return true
}

/**
 * Rimuove un task da un'area
 */
export async function removeTaskFromArea(
    clerkUserId: string,
    areaType: AreaType,
    taskId: string
): Promise<boolean> {
    const { data: area } = await supabase
        .from('life_areas')
        .select('active_tasks')
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)
        .single()

    if (!area) return false

    const tasks: Task[] = Array.isArray(area.active_tasks)
        ? area.active_tasks
        : []

    const updatedTasks = tasks.filter(t => t.id !== taskId)

    const { error } = await supabase
        .from('life_areas')
        .update({
            active_tasks: updatedTasks,
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)

    if (error) {
        console.error('Error removing task:', error)
        return false
    }

    return true
}

/**
 * Aggiorna un task esistente
 */
export async function updateTask(
    clerkUserId: string,
    areaType: AreaType,
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'created_at'>>
): Promise<boolean> {
    const { data: area } = await supabase
        .from('life_areas')
        .select('active_tasks')
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)
        .single()

    if (!area) return false

    const tasks: Task[] = Array.isArray(area.active_tasks)
        ? area.active_tasks
        : []

    const updatedTasks = tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
    )

    const { error } = await supabase
        .from('life_areas')
        .update({
            active_tasks: updatedTasks,
            updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
        .eq('area_type', areaType)

    if (error) {
        console.error('Error updating task:', error)
        return false
    }

    return true
}

// ============================================
// NUR GOAL DETECTION
// ============================================

const GOAL_DETECTION_PROMPT = `Sei NUR, analizza questo messaggio per identificare OBIETTIVI e TASK che l'utente vuole raggiungere.

Rispondi SOLO con un JSON valido in questo formato:
{
    "detected_goals": [
        {
            "area": "salute|soldi|relazioni|lavoro|hobby|crescita|casa|sociale|spirituale|futuro",
            "goal_title": "Titolo breve dell'obiettivo",
            "goal_description": "Descrizione più dettagliata",
            "suggested_tasks": [
                {
                    "title": "Task specifico e actionable",
                    "priority": "high|medium|low"
                }
            ]
        }
    ],
    "update_current_state": [
        {
            "area": "area_type",
            "description": "Stato attuale descritto dall'utente"
        }
    ]
}

Regole:
- Estrai SOLO obiettivi chiari e concreti
- I task devono essere specifici e realizzabili in 1-7 giorni
- Se non ci sono obiettivi chiari, rispondi con {"detected_goals": [], "update_current_state": []}
- Non inventare obiettivi che l'utente non ha espresso`

interface DetectedGoal {
    area: AreaType
    goal_title: string
    goal_description?: string
    suggested_tasks: Array<{
        title: string
        priority: 'low' | 'medium' | 'high'
    }>
}

interface DetectedState {
    area: AreaType
    description: string
}

interface GoalDetectionResult {
    detected_goals: DetectedGoal[]
    update_current_state: DetectedState[]
}

/**
 * Rileva obiettivi e task dal messaggio dell'utente
 */
export async function detectGoalsFromMessage(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
): Promise<GoalDetectionResult> {
    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        })

        const context = conversationHistory.slice(-4).map(m =>
            `${m.role === 'user' ? 'Utente' : 'NUR'}: ${m.content}`
        ).join('\n')

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            system: GOAL_DETECTION_PROMPT,
            messages: [{
                role: 'user',
                content: `Contesto:\n${context}\n\nMessaggio:\n"${message}"`
            }]
        })

        const responseText = response.content[0].type === 'text'
            ? response.content[0].text
            : '{"detected_goals": [], "update_current_state": []}'

        return JSON.parse(responseText)
    } catch (error) {
        console.error('Error detecting goals:', error)
        return { detected_goals: [], update_current_state: [] }
    }
}

/**
 * Processa gli obiettivi rilevati e li salva nel database
 */
export async function processDetectedGoals(
    clerkUserId: string,
    result: GoalDetectionResult
): Promise<{
    goalsCreated: number
    tasksCreated: number
    statesUpdated: number
}> {
    let goalsCreated = 0
    let tasksCreated = 0
    let statesUpdated = 0

    // Processa goals
    for (const goal of result.detected_goals) {
        const success = await setAreaGoal(clerkUserId, goal.area, {
            title: goal.goal_title,
            description: goal.goal_description
        })

        if (success) {
            goalsCreated++

            // Aggiungi i task suggeriti
            for (const task of goal.suggested_tasks) {
                const added = await addTaskToArea(clerkUserId, goal.area, {
                    title: task.title,
                    priority: task.priority
                })
                if (added) tasksCreated++
            }
        }
    }

    // Aggiorna stati attuali
    for (const state of result.update_current_state) {
        const success = await setAreaCurrentState(clerkUserId, state.area, {
            description: state.description
        })
        if (success) statesUpdated++
    }

    return { goalsCreated, tasksCreated, statesUpdated }
}

// ============================================
// PROGRESS & FEEDBACK
// ============================================

/**
 * Genera un riepilogo dei progressi per NUR
 */
export async function generateProgressSummary(
    clerkUserId: string
): Promise<string> {
    const areas = await loadUserLifeAreas(clerkUserId)

    if (areas.length === 0) {
        return 'Nessuna area della vita configurata.'
    }

    const summaries: string[] = []

    for (const area of areas) {
        const completedTasks = area.active_tasks.filter(t => t.completed).length
        const totalTasks = area.active_tasks.length
        const hasGoal = area.goal_state?.title

        if (totalTasks > 0 || hasGoal) {
            let summary = `**${area.area_type.toUpperCase()}** (priorità ${area.priority}/10)`

            if (hasGoal) {
                summary += `\n  Obiettivo: ${area.goal_state.title}`
            }

            if (totalTasks > 0) {
                summary += `\n  Task: ${completedTasks}/${totalTasks} completati (${area.progress}%)`

                // Mostra task non completati
                const pendingTasks = area.active_tasks.filter(t => !t.completed)
                if (pendingTasks.length > 0) {
                    summary += `\n  Da fare:`
                    pendingTasks.slice(0, 3).forEach(t => {
                        summary += `\n    - ${t.title}`
                    })
                }
            }

            summaries.push(summary)
        }
    }

    if (summaries.length === 0) {
        return 'Nessun obiettivo o task attivo al momento.'
    }

    return summaries.join('\n\n')
}

/**
 * Ottiene aree che richiedono attenzione (nessun progresso recente)
 */
export async function getAreasNeedingAttention(
    clerkUserId: string
): Promise<LifeAreaWithGoals[]> {
    const areas = await loadUserLifeAreas(clerkUserId)

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return areas.filter(area => {
        // Ha obiettivo ma nessun task
        const hasGoalNoTasks = area.goal_state?.title && area.active_tasks.length === 0

        // Ha task ma nessuno completato di recente
        const hasStuckTasks = area.active_tasks.length > 0 &&
            area.active_tasks.every(t => !t.completed)

        // Non aggiornata da una settimana
        const notUpdated = new Date(area.updated_at) < oneWeekAgo

        return (hasGoalNoTasks || hasStuckTasks) && notUpdated
    })
}
