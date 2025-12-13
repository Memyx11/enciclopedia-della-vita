/**
 * NUR Mission System
 * Gestisce la logica di costruzione progressiva della missione
 */

import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

export interface Mission {
    id: string
    title: string
    description: string | null
    why: string | null
    status: string
    start_date: string
    target_date: string | null
}

export interface Objective {
    id: string
    mission_id: string
    parent_id: string | null
    level: 'major' | 'sub' | 'task' | 'micro'
    title: string
    description: string | null
    status: 'pending' | 'active' | 'completed' | 'skipped'
    progress: number
    sort_order: number
    related_areas: string[] | null
}

export interface ChainState {
    activeChapter: string | null
    activeStep: string | null
    activeTask: string | null
}

export interface DashboardState {
    phase: 'empty' | 'mission_only' | 'has_chapters' | 'has_steps' | 'complete'
    mission: Mission | null
    objectives: Objective[]
    chain: ChainState
    activeTask: Objective | null
    activeStep: Objective | null
    activeChapter: Objective | null
    chapters: Objective[]
    completedChapters: number
    totalChapters: number
    missionProgress: number
}

export type MissionPhase =
    | 'discovery'      // Raccogliere insight
    | 'mission'        // Proporre missione
    | 'chapters'       // Creare capitoli
    | 'steps'          // Creare step per capitolo attivo
    | 'task'           // Creare task giornaliera
    | 'active'         // Task attiva, utente sta lavorando

// ============================================
// CHAIN LOGIC
// ============================================

/**
 * Calcola quale elemento è attivo per ogni livello
 * Regola: Solo UN elemento attivo per livello (il primo non completato)
 */
export function calculateChain(objectives: Objective[]): ChainState {
    // Capitoli = level 'major', ordinati per sort_order
    const chapters = objectives
        .filter(o => o.level === 'major')
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const activeChapter = chapters.find(c => c.status !== 'completed')

    if (!activeChapter) {
        return { activeChapter: null, activeStep: null, activeTask: null }
    }

    // Step = level 'sub', figli del capitolo attivo
    const steps = objectives
        .filter(o => o.level === 'sub' && o.parent_id === activeChapter.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const activeStep = steps.find(s => s.status !== 'completed')

    if (!activeStep) {
        return {
            activeChapter: activeChapter.id,
            activeStep: null,
            activeTask: null
        }
    }

    // Task = level 'task', figlie dello step attivo
    const tasks = objectives
        .filter(o => o.level === 'task' && o.parent_id === activeStep.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const activeTask = tasks.find(t => t.status !== 'completed')

    return {
        activeChapter: activeChapter.id,
        activeStep: activeStep.id,
        activeTask: activeTask?.id || null
    }
}

/**
 * Determina lo stato di visualizzazione di un obiettivo
 */
export function getDisplayState(
    obj: Objective,
    chain: ChainState
): 'done' | 'current' | 'locked' {
    if (obj.status === 'completed') return 'done'

    const isActive =
        obj.id === chain.activeChapter ||
        obj.id === chain.activeStep ||
        obj.id === chain.activeTask

    return isActive ? 'current' : 'locked'
}

// ============================================
// DASHBOARD STATE
// ============================================

/**
 * Carica lo stato completo della dashboard per un utente
 */
export async function getDashboardState(userId: string): Promise<DashboardState> {
    // Carica missione (maybeSingle perché potrebbe non esistere)
    const { data: mission } = await supabase
        .from('user_mission')
        .select('*')
        .eq('clerk_user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

    // Se non c'è missione, stato vuoto
    if (!mission) {
        return {
            phase: 'empty',
            mission: null,
            objectives: [],
            chain: { activeChapter: null, activeStep: null, activeTask: null },
            activeTask: null,
            activeStep: null,
            activeChapter: null,
            chapters: [],
            completedChapters: 0,
            totalChapters: 0,
            missionProgress: 0
        }
    }

    // Carica tutti gli obiettivi
    const { data: objectives } = await supabase
        .from('objectives')
        .select('*')
        .eq('clerk_user_id', userId)
        .eq('mission_id', mission.id)
        .order('sort_order')

    const objs = (objectives || []) as Objective[]

    // Calcola chain
    const chain = calculateChain(objs)

    // Estrai capitoli
    const chapters = objs.filter(o => o.level === 'major')
    const completedChapters = chapters.filter(c => c.status === 'completed').length
    const totalChapters = chapters.length

    // Trova elementi attivi
    const activeChapter = objs.find(o => o.id === chain.activeChapter) || null
    const activeStep = objs.find(o => o.id === chain.activeStep) || null
    const activeTask = objs.find(o => o.id === chain.activeTask) || null

    // Determina fase
    let phase: DashboardState['phase'] = 'empty'

    if (mission) {
        if (chapters.length === 0) {
            phase = 'mission_only'
        } else {
            const hasSteps = objs.some(o => o.level === 'sub')
            const hasTasks = objs.some(o => o.level === 'task')

            if (!hasSteps) {
                phase = 'has_chapters'
            } else if (!hasTasks) {
                phase = 'has_steps'
            } else {
                phase = 'complete'
            }
        }
    }

    // Calcola progresso missione
    const missionProgress = totalChapters > 0
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0

    return {
        phase,
        mission,
        objectives: objs,
        chain,
        activeTask,
        activeStep,
        activeChapter,
        chapters,
        completedChapters,
        totalChapters,
        missionProgress
    }
}

// ============================================
// MISSION PHASE (per NUR)
// ============================================

/**
 * Determina in quale fase conversazionale si trova l'utente
 * Usato da NUR per sapere cosa chiedere/proporre
 */
export async function getMissionPhase(userId: string): Promise<MissionPhase> {
    const state = await getDashboardState(userId)

    // Nessuna missione → discovery o mission
    if (!state.mission) {
        // Controlla se ci sono insight
        const { count } = await supabase
            .from('user_insights')
            .select('*', { count: 'exact', head: true })
            .eq('clerk_user_id', userId)
            .eq('used_for_mission', false)

        return (count || 0) >= 3 ? 'mission' : 'discovery'
    }

    // Ha missione ma no capitoli
    if (state.chapters.length === 0) {
        return 'chapters'
    }

    // Ha capitoli ma il capitolo attivo non ha step
    if (state.activeChapter) {
        const stepsInChapter = state.objectives.filter(
            o => o.level === 'sub' && o.parent_id === state.activeChapter?.id
        )
        if (stepsInChapter.length === 0) {
            return 'steps'
        }
    }

    // Ha step ma lo step attivo non ha task
    if (state.activeStep) {
        const tasksInStep = state.objectives.filter(
            o => o.level === 'task' && o.parent_id === state.activeStep?.id
        )
        if (tasksInStep.length === 0) {
            return 'task'
        }
    }

    // Tutto configurato, utente sta lavorando
    return 'active'
}

// ============================================
// CONTEXT BUILDER (per prompt NUR)
// ============================================

/**
 * Costruisce il contesto missione per il prompt di NUR
 */
export async function buildMissionContext(userId: string): Promise<string> {
    const state = await getDashboardState(userId)
    const phase = await getMissionPhase(userId)

    let context = `\n## STATO MISSIONE\n`
    context += `Fase: ${phase}\n\n`

    if (!state.mission) {
        // Carica insight non usati
        const { data: insights } = await supabase
            .from('user_insights')
            .select('category, content')
            .eq('clerk_user_id', userId)
            .eq('used_for_mission', false)
            .order('importance', { ascending: false })
            .limit(5)

        if (insights && insights.length > 0) {
            context += `Insight raccolti:\n`
            insights.forEach(i => {
                context += `- [${i.category}] ${i.content}\n`
            })
        } else {
            context += `Nessun insight raccolto ancora.\n`
        }

        return context
    }

    // Ha missione
    context += `MISSIONE: "${state.mission.title}"\n`
    if (state.mission.description) {
        context += `Descrizione: ${state.mission.description}\n`
    }
    context += `Progresso: ${state.missionProgress}%\n\n`

    // Capitoli
    if (state.chapters.length > 0) {
        context += `CAPITOLI:\n`
        state.chapters.forEach((ch, i) => {
            const status = ch.status === 'completed' ? '✅' :
                           ch.id === state.chain.activeChapter ? '◉' : '🔒'
            context += `${i + 1}. ${status} ${ch.title} [${ch.progress}%]\n`
        })
        context += '\n'
    }

    // Step del capitolo attivo
    if (state.activeChapter) {
        const steps = state.objectives.filter(
            o => o.level === 'sub' && o.parent_id === state.activeChapter?.id
        )
        if (steps.length > 0) {
            context += `STEP in "${state.activeChapter.title}":\n`
            steps.forEach((st, i) => {
                const status = st.status === 'completed' ? '✅' :
                               st.id === state.chain.activeStep ? '◉' : '○'
                context += `  ${i + 1}. ${status} ${st.title}\n`
            })
            context += '\n'
        }
    }

    // Task attiva
    if (state.activeTask) {
        context += `TASK ATTIVA: "${state.activeTask.title}"\n`
        if (state.activeTask.description) {
            context += `Dettaglio: ${state.activeTask.description}\n`
        }
    }

    return context
}

// ============================================
// ACTIONS (chiamate dall'API)
// ============================================

/**
 * Marca un obiettivo come completato e aggiorna la chain
 */
export async function completeObjective(
    userId: string,
    objectiveId: string
): Promise<void> {
    // Aggiorna l'obiettivo
    await supabase
        .from('objectives')
        .update({
            status: 'completed',
            progress: 100,
            completed_at: new Date().toISOString()
        })
        .eq('id', objectiveId)
        .eq('clerk_user_id', userId)

    // Ricalcola lo stato
    const state = await getDashboardState(userId)

    // Se abbiamo completato una task, controlla se lo step è completato
    const completedObj = state.objectives.find(o => o.id === objectiveId)
    if (completedObj?.level === 'task' && completedObj.parent_id) {
        const siblingTasks = state.objectives.filter(
            o => o.level === 'task' && o.parent_id === completedObj.parent_id
        )
        const allTasksComplete = siblingTasks.every(t => t.status === 'completed')

        if (allTasksComplete) {
            await supabase
                .from('objectives')
                .update({ status: 'completed', progress: 100 })
                .eq('id', completedObj.parent_id)
        }
    }

    // Se abbiamo completato uno step, controlla se il capitolo è completato
    if (completedObj?.level === 'sub' && completedObj.parent_id) {
        const siblingSteps = state.objectives.filter(
            o => o.level === 'sub' && o.parent_id === completedObj.parent_id
        )
        const allStepsComplete = siblingSteps.every(s => s.status === 'completed')

        if (allStepsComplete) {
            await supabase
                .from('objectives')
                .update({ status: 'completed', progress: 100 })
                .eq('id', completedObj.parent_id)
        }
    }

    // Aggiorna il primo elemento pending del livello appropriato ad 'active'
    const newState = await getDashboardState(userId)

    if (newState.chain.activeChapter) {
        await supabase
            .from('objectives')
            .update({ status: 'active' })
            .eq('id', newState.chain.activeChapter)
            .eq('status', 'pending')
    }

    if (newState.chain.activeStep) {
        await supabase
            .from('objectives')
            .update({ status: 'active' })
            .eq('id', newState.chain.activeStep)
            .eq('status', 'pending')
    }

    if (newState.chain.activeTask) {
        await supabase
            .from('objectives')
            .update({ status: 'active' })
            .eq('id', newState.chain.activeTask)
            .eq('status', 'pending')
    }
}

/**
 * Crea un nuovo capitolo
 */
export async function createChapter(
    userId: string,
    missionId: string,
    title: string,
    description?: string
): Promise<string> {
    // Conta capitoli esistenti per sort_order
    const { count } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .eq('clerk_user_id', userId)
        .eq('mission_id', missionId)
        .eq('level', 'major')

    const { data, error } = await supabase
        .from('objectives')
        .insert({
            clerk_user_id: userId,
            mission_id: missionId,
            level: 'major',
            title,
            description,
            status: (count || 0) === 0 ? 'active' : 'pending',
            progress: 0,
            sort_order: (count || 0) + 1
        })
        .select('id')
        .single()

    if (error) throw error
    return data.id
}

/**
 * Crea un nuovo step
 */
export async function createStep(
    userId: string,
    chapterId: string,
    title: string,
    description?: string
): Promise<string> {
    // Trova mission_id dal capitolo
    const { data: chapter } = await supabase
        .from('objectives')
        .select('mission_id')
        .eq('id', chapterId)
        .single()

    // Conta step esistenti
    const { count } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', chapterId)
        .eq('level', 'sub')

    const { data, error } = await supabase
        .from('objectives')
        .insert({
            clerk_user_id: userId,
            mission_id: chapter?.mission_id,
            parent_id: chapterId,
            level: 'sub',
            title,
            description,
            status: (count || 0) === 0 ? 'active' : 'pending',
            progress: 0,
            sort_order: (count || 0) + 1
        })
        .select('id')
        .single()

    if (error) throw error
    return data.id
}

/**
 * Crea una nuova task
 */
export async function createTask(
    userId: string,
    stepId: string,
    title: string,
    description?: string
): Promise<string> {
    // Trova mission_id dallo step
    const { data: step } = await supabase
        .from('objectives')
        .select('mission_id')
        .eq('id', stepId)
        .single()

    // Conta task esistenti
    const { count } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', stepId)
        .eq('level', 'task')

    const { data, error } = await supabase
        .from('objectives')
        .insert({
            clerk_user_id: userId,
            mission_id: step?.mission_id,
            parent_id: stepId,
            level: 'task',
            title,
            description,
            status: (count || 0) === 0 ? 'active' : 'pending',
            progress: 0,
            sort_order: (count || 0) + 1
        })
        .select('id')
        .single()

    if (error) throw error
    return data.id
}
