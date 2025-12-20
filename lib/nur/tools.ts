/**
 * NUR: LIFE RPG - Tool System
 * Gestione dei tool che NUR può usare
 * Formato: [TOOL:nome]{json}[/TOOL]
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import {
    MemoryType, GoalType, AreaSlug, MaterialRarity, TestType,
    AREA_SLUGS, SKILL_LEVELS_ORDER
} from '@/lib/supabase/types'
import { awardXp, awardGoalXp, awardTestXp } from '@/lib/gamification/xp'
import { checkAllAchievements } from '@/lib/gamification/achievements'

// ============================================
// TYPES
// ============================================

export interface ToolResult {
    success: boolean
    message: string
    data?: any
}

export interface ToolCall {
    tool: string
    params: Record<string, any>
}

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

/**
 * Salva una memoria nella tabella nur_memory
 */
async function saveMemory(userId: string, params: {
    type: MemoryType
    content: string
    importance?: number
    area?: AreaSlug
    goal_id?: string
}): Promise<ToolResult> {
    try {
        // Get area_id if area slug provided
        let areaId: string | null = null
        if (params.area) {
            const { data: area } = await supabaseAdmin
                .from('life_areas')
                .select('id')
                .eq('clerk_user_id', userId)
                .eq('slug', params.area)
                .single()
            areaId = area?.id || null
        }

        const { error } = await supabaseAdmin
            .from('nur_memory')
            .insert({
                clerk_user_id: userId,
                type: params.type,
                content: params.content,
                importance: params.importance || 5,
                area_id: areaId,
                related_goal_id: params.goal_id || null,
                is_current: true
            })

        if (error) throw error

        // Update narrative memory in profile (compact summary)
        await updateNarrativeMemory(userId)

        console.log('[TOOL:save_memory]', params.type, '-', params.content.substring(0, 50))
        return { success: true, message: 'Memoria salvata' }
    } catch (error: any) {
        console.error('[TOOL:save_memory] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Aggiorna il profilo utente
 */
async function updateProfile(userId: string, params: {
    field: 'full_name' | 'birth_date' | 'city' | 'bio' | 'wake_time' | 'sleep_time'
    value: string
}): Promise<ToolResult> {
    try {
        const updateData: Record<string, any> = {
            [params.field]: params.value,
            updated_at: new Date().toISOString()
        }

        const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('clerk_user_id', userId)

        if (error) throw error

        console.log('[TOOL:update_profile]', params.field, '=', params.value)
        return { success: true, message: 'Profilo aggiornato' }
    } catch (error: any) {
        console.error('[TOOL:update_profile] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Crea un nuovo obiettivo
 */
async function createGoal(userId: string, params: {
    title: string
    type: GoalType
    area: AreaSlug
    description?: string
    is_primary?: boolean
    xp_reward?: number
}): Promise<ToolResult> {
    try {
        // Get area_id
        const { data: area } = await supabaseAdmin
            .from('life_areas')
            .select('id')
            .eq('clerk_user_id', userId)
            .eq('slug', params.area)
            .single()

        if (!area) {
            return { success: false, message: `Area '${params.area}' non trovata` }
        }

        // Default XP based on type
        const xpMap = { obiettivo: 50, boss: 200, sogno: 500 }
        const xpReward = params.xp_reward || xpMap[params.type]

        const { data: goal, error } = await supabaseAdmin
            .from('goals')
            .insert({
                clerk_user_id: userId,
                area_id: area.id,
                title: params.title,
                description: params.description || null,
                type: params.type,
                is_primary: params.is_primary || false,
                xp_reward: xpReward,
                status: 'active',
                progress: 0
            })
            .select()
            .single()

        if (error) throw error

        // If primary, update area
        if (params.is_primary) {
            await supabaseAdmin
                .from('life_areas')
                .update({ has_primary_goal: true })
                .eq('id', area.id)
        }

        console.log('[TOOL:create_goal]', params.title, '(', params.type, ')')
        return { success: true, message: 'Obiettivo creato!', data: goal }
    } catch (error: any) {
        console.error('[TOOL:create_goal] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Completa un obiettivo
 */
async function completeGoal(userId: string, params: {
    goal_id: string
}): Promise<ToolResult> {
    try {
        // Use SQL function for atomicity
        const { data, error } = await supabaseAdmin
            .rpc('complete_goal', { p_goal_id: params.goal_id })

        if (error) throw error

        // Check for achievements
        await checkAllAchievements(userId)

        console.log('[TOOL:complete_goal]', params.goal_id)
        return { success: true, message: 'Obiettivo completato!' }
    } catch (error: any) {
        console.error('[TOOL:complete_goal] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Crea un nuovo task
 */
async function createTask(userId: string, params: {
    title: string
    goal_id?: string
    is_boss_task?: boolean
    scheduled_date?: string
    description?: string
    xp_reward?: number
}): Promise<ToolResult> {
    try {
        // Check if there's already a boss task for today
        if (params.is_boss_task) {
            const today = new Date().toISOString().split('T')[0]
            const { data: existingBoss } = await supabaseAdmin
                .from('tasks')
                .select('id')
                .eq('clerk_user_id', userId)
                .eq('scheduled_date', today)
                .eq('is_boss_task', true)
                .single()

            if (existingBoss) {
                return { success: false, message: 'Hai già un Boss Task per oggi!' }
            }
        }

        const { data: task, error } = await supabaseAdmin
            .from('tasks')
            .insert({
                clerk_user_id: userId,
                goal_id: params.goal_id || null,
                title: params.title,
                description: params.description || null,
                is_boss_task: params.is_boss_task || false,
                scheduled_date: params.scheduled_date || new Date().toISOString().split('T')[0],
                xp_reward: params.xp_reward || (params.is_boss_task ? 100 : 10),
                status: 'pending'
            })
            .select()
            .single()

        if (error) throw error

        console.log('[TOOL:create_task]', params.title, params.is_boss_task ? '(BOSS)' : '')
        return { success: true, message: 'Task creato!', data: task }
    } catch (error: any) {
        console.error('[TOOL:create_task] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Completa un task
 */
async function completeTask(userId: string, params: {
    task_id: string
}): Promise<ToolResult> {
    try {
        // Get task info
        const { data: task, error: fetchError } = await supabaseAdmin
            .from('tasks')
            .select('*, profiles(streak_days)')
            .eq('id', params.task_id)
            .single()

        if (fetchError || !task) {
            return { success: false, message: 'Task non trovato' }
        }

        if (task.status === 'completed') {
            return { success: false, message: 'Task già completato' }
        }

        // Mark as completed
        const { error: updateError } = await supabaseAdmin
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', params.task_id)

        if (updateError) throw updateError

        // Award XP
        const streakDays = (task.profiles as any)?.streak_days || 0
        await awardXp(
            userId,
            task.xp_reward,
            task.is_boss_task ? 'boss_task_completed' : 'task_completed',
            `Task: ${task.title}`
        )

        // Update goal progress if linked
        if (task.goal_id) {
            await updateGoalProgress(task.goal_id)
        }

        // Check achievements
        await checkAllAchievements(userId)

        console.log('[TOOL:complete_task]', task.title, '+', task.xp_reward, 'XP')
        return { success: true, message: `Task completato! +${task.xp_reward} XP` }
    } catch (error: any) {
        console.error('[TOOL:complete_task] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Assegna XP manualmente
 */
async function awardXpTool(userId: string, params: {
    amount: number
    reason: string
}): Promise<ToolResult> {
    try {
        const result = await awardXp(userId, params.amount, 'xp_gained', params.reason)

        if (!result.success) {
            return { success: false, message: result.error || 'Errore' }
        }

        const levelMsg = result.leveledUp
            ? ` Level Up! Ora sei livello ${result.newLevel} (${result.newTitle})`
            : ''

        console.log('[TOOL:award_xp]', '+', params.amount, 'XP:', params.reason)
        return { success: true, message: `+${params.amount} XP!${levelMsg}`, data: result }
    } catch (error: any) {
        console.error('[TOOL:award_xp] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Aggiunge una skill all'utente
 */
async function addSkill(userId: string, params: {
    name: string
    description?: string
    area?: AreaSlug
}): Promise<ToolResult> {
    try {
        // Check if skill already exists
        const { data: existing } = await supabaseAdmin
            .from('skills')
            .select('id')
            .eq('clerk_user_id', userId)
            .eq('name', params.name)
            .single()

        if (existing) {
            return { success: false, message: `Hai già la skill '${params.name}'` }
        }

        // Get area_id if provided
        let areaId: string | null = null
        if (params.area) {
            const { data: area } = await supabaseAdmin
                .from('life_areas')
                .select('id')
                .eq('clerk_user_id', userId)
                .eq('slug', params.area)
                .single()
            areaId = area?.id || null
        }

        const { data: skill, error } = await supabaseAdmin
            .from('skills')
            .insert({
                clerk_user_id: userId,
                name: params.name,
                description: params.description || null,
                area_id: areaId,
                level: 'base',
                progress: 0
            })
            .select()
            .single()

        if (error) throw error

        // Check achievements
        await checkAllAchievements(userId)

        console.log('[TOOL:add_skill]', params.name)
        return { success: true, message: `Nuova skill: ${params.name}!`, data: skill }
    } catch (error: any) {
        console.error('[TOOL:add_skill] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Aumenta il livello di una skill
 */
async function levelUpSkill(userId: string, params: {
    skill_id: string
}): Promise<ToolResult> {
    try {
        const { data: skill, error: fetchError } = await supabaseAdmin
            .from('skills')
            .select('*')
            .eq('id', params.skill_id)
            .single()

        if (fetchError || !skill) {
            return { success: false, message: 'Skill non trovata' }
        }

        const currentIndex = SKILL_LEVELS_ORDER.indexOf(skill.level)
        if (currentIndex >= SKILL_LEVELS_ORDER.length - 1) {
            return { success: false, message: 'Skill già al livello massimo!' }
        }

        const nextLevel = SKILL_LEVELS_ORDER[currentIndex + 1]

        const { error: updateError } = await supabaseAdmin
            .from('skills')
            .update({ level: nextLevel, progress: 0 })
            .eq('id', params.skill_id)

        if (updateError) throw updateError

        // Award XP for leveling up
        await awardXp(userId, 25, 'skill_leveled', `Skill ${skill.name} → ${nextLevel}`)

        // Check achievements
        await checkAllAchievements(userId)

        console.log('[TOOL:level_up_skill]', skill.name, '->', nextLevel)
        return { success: true, message: `${skill.name} è ora ${nextLevel}!` }
    } catch (error: any) {
        console.error('[TOOL:level_up_skill] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Aggiunge un materiale all'inventario
 */
async function addMaterial(userId: string, params: {
    name: string
    description?: string
    rarity?: MaterialRarity
    area?: AreaSlug
}): Promise<ToolResult> {
    try {
        // Get area_id if provided
        let areaId: string | null = null
        if (params.area) {
            const { data: area } = await supabaseAdmin
                .from('life_areas')
                .select('id')
                .eq('clerk_user_id', userId)
                .eq('slug', params.area)
                .single()
            areaId = area?.id || null
        }

        const rarity = params.rarity || 'comune'

        const { data: material, error } = await supabaseAdmin
            .from('materials')
            .insert({
                clerk_user_id: userId,
                name: params.name,
                description: params.description || null,
                rarity,
                area_id: areaId,
                is_obtained: true,
                obtained_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        // Award XP based on rarity
        const xpMap: Record<MaterialRarity, number> = {
            comune: 5, non_comune: 10, raro: 25, epico: 50, leggendario: 100
        }
        await awardXp(userId, xpMap[rarity], 'material_obtained', `Materiale: ${params.name}`)

        // Check achievements
        await checkAllAchievements(userId)

        console.log('[TOOL:add_material]', params.name, `(${rarity})`)
        return { success: true, message: `Ottenuto: ${params.name} (${rarity})!`, data: material }
    } catch (error: any) {
        console.error('[TOOL:add_material] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Crea una prova per l'utente (Sistema Prove)
 */
async function createTest(userId: string, params: {
    title: string
    description: string
    type: TestType
    verifies: string
    due_date?: string
    goal_id?: string
    skill_id?: string
}): Promise<ToolResult> {
    try {
        const { data: test, error } = await supabaseAdmin
            .from('user_tests')
            .insert({
                clerk_user_id: userId,
                title: params.title,
                description: params.description,
                type: params.type,
                verifies: params.verifies,
                related_goal_id: params.goal_id || null,
                related_skill_id: params.skill_id || null,
                due_date: params.due_date || null,
                status: 'pending'
            })
            .select()
            .single()

        if (error) throw error

        console.log('[TOOL:create_test]', params.title, `(${params.type})`)
        return { success: true, message: `Prova creata: ${params.title}`, data: test }
    } catch (error: any) {
        console.error('[TOOL:create_test] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Verifica il risultato di una prova
 */
async function verifyTest(userId: string, params: {
    test_id: string
    passed: boolean
    evaluation: string
}): Promise<ToolResult> {
    try {
        const { data: test, error: fetchError } = await supabaseAdmin
            .from('user_tests')
            .select('*')
            .eq('id', params.test_id)
            .single()

        if (fetchError || !test) {
            return { success: false, message: 'Prova non trovata' }
        }

        const { error: updateError } = await supabaseAdmin
            .from('user_tests')
            .update({
                status: params.passed ? 'passed' : 'failed',
                nur_evaluation: params.evaluation,
                completed_at: new Date().toISOString()
            })
            .eq('id', params.test_id)

        if (updateError) throw updateError

        // Award XP if passed
        if (params.passed) {
            await awardTestXp(userId, false)
        }

        // Log activity
        await supabaseAdmin.from('activity_log').insert({
            clerk_user_id: userId,
            activity_type: params.passed ? 'test_passed' : 'test_failed',
            description: `Prova: ${test.title}`
        })

        // Check achievements
        await checkAllAchievements(userId)

        console.log('[TOOL:verify_test]', test.title, params.passed ? 'PASSATO' : 'FALLITO')
        return {
            success: true,
            message: params.passed ? 'Prova superata! 🎉' : 'Prova non superata.',
            data: { passed: params.passed }
        }
    } catch (error: any) {
        console.error('[TOOL:verify_test] Error:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Ricerca web tramite Serper API
 */
async function webSearch(userId: string, params: {
    query: string
}): Promise<ToolResult> {
    console.log('[TOOL:web_search]', params.query)

    try {
        const serperKey = process.env.SERPER_API_KEY

        if (!serperKey) {
            return {
                success: false,
                message: 'Ricerca web non configurata.'
            }
        }

        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': serperKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: params.query,
                gl: 'it',
                hl: 'it',
                num: 5
            })
        })

        if (!response.ok) {
            throw new Error('Search API error: ' + response.status)
        }

        const data = await response.json()
        const results: string[] = []

        if (data.answerBox?.answer) {
            results.push('📌 ' + data.answerBox.answer)
        }

        if (data.knowledgeGraph?.description) {
            results.push('📚 ' + data.knowledgeGraph.description)
        }

        if (data.organic) {
            data.organic.slice(0, 3).forEach((r: any) => {
                results.push(`• ${r.title}: ${r.snippet}`)
            })
        }

        return {
            success: true,
            message: 'Ricerca completata',
            data: { query: params.query, results: results.join('\n\n') }
        }
    } catch (error: any) {
        console.error('[TOOL:web_search] Error:', error)
        return { success: false, message: 'Errore ricerca: ' + error.message }
    }
}

/**
 * Query al NUR Brain (ChromaDB) - placeholder per integrazione futura
 */
async function queryBrain(userId: string, params: {
    query: string
    context?: string
}): Promise<ToolResult> {
    console.log('[TOOL:query_brain]', params.query)

    // TODO: Integrate with ChromaDB
    // Per ora ritorna un placeholder

    return {
        success: true,
        message: 'Brain query eseguita',
        data: {
            query: params.query,
            results: 'ChromaDB integration pending - using local memory for now.'
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Aggiorna il progresso di un goal basato sui task completati
 */
async function updateGoalProgress(goalId: string): Promise<void> {
    try {
        const { data: tasks } = await supabaseAdmin
            .from('tasks')
            .select('status')
            .eq('goal_id', goalId)

        if (!tasks || tasks.length === 0) return

        const completed = tasks.filter(t => t.status === 'completed').length
        const progress = Math.floor((completed / tasks.length) * 100)

        await supabaseAdmin
            .from('goals')
            .update({ progress })
            .eq('id', goalId)
    } catch (error) {
        console.error('Error updating goal progress:', error)
    }
}

/**
 * Aggiorna la memoria narrativa nel profilo (sommario compatto)
 */
async function updateNarrativeMemory(userId: string): Promise<void> {
    try {
        // Get top memories by importance
        const { data: memories } = await supabaseAdmin
            .from('nur_memory')
            .select('type, content')
            .eq('clerk_user_id', userId)
            .eq('is_current', true)
            .order('importance', { ascending: false })
            .limit(10)

        if (!memories || memories.length === 0) return

        // Build narrative summary
        const facts = memories.filter(m => m.type === 'fact').map(m => m.content)
        const struggles = memories.filter(m => m.type === 'struggle').map(m => m.content)
        const achievements = memories.filter(m => m.type === 'achievement').map(m => m.content)

        let narrative = ''
        if (facts.length > 0) narrative += `Fatti: ${facts.join('; ')}. `
        if (struggles.length > 0) narrative += `Sfide: ${struggles.join('; ')}. `
        if (achievements.length > 0) narrative += `Risultati: ${achievements.join('; ')}.`

        // Update profile
        await supabaseAdmin
            .from('profiles')
            .update({ nur_narrative_memory: narrative.trim() })
            .eq('clerk_user_id', userId)
    } catch (error) {
        console.error('Error updating narrative memory:', error)
    }
}

// ============================================
// PARSING & EXECUTION
// ============================================

/**
 * Estrae le chiamate tool dal testo della risposta NUR
 */
export function parseToolCalls(text: string): ToolCall[] {
    const regex = /\[TOOL:(\w+)\]([\s\S]*?)\[\/TOOL\]/g
    const calls: ToolCall[] = []
    let match

    while ((match = regex.exec(text)) !== null) {
        try {
            const params = JSON.parse(match[2].trim())
            calls.push({ tool: match[1], params })
        } catch (e) {
            console.error('[TOOL PARSER] Invalid JSON for tool:', match[1], match[2])
        }
    }

    return calls
}

/**
 * Esegue tutte le chiamate tool estratte
 */
export async function executeToolCalls(
    userId: string,
    toolCalls: ToolCall[]
): Promise<ToolResult[]> {
    console.log('[TOOLS] Executing', toolCalls.length, 'tools for user', userId)
    const results: ToolResult[] = []

    for (const call of toolCalls) {
        console.log('[TOOLS] →', call.tool, JSON.stringify(call.params))
        let result: ToolResult

        switch (call.tool) {
            case 'save_memory':
                result = await saveMemory(userId, call.params)
                break
            case 'update_profile':
                result = await updateProfile(userId, call.params as any)
                break
            case 'create_goal':
                result = await createGoal(userId, call.params as any)
                break
            case 'complete_goal':
                result = await completeGoal(userId, call.params)
                break
            case 'create_task':
                result = await createTask(userId, call.params as any)
                break
            case 'complete_task':
                result = await completeTask(userId, call.params)
                break
            case 'award_xp':
                result = await awardXpTool(userId, call.params as any)
                break
            case 'add_skill':
                result = await addSkill(userId, call.params as any)
                break
            case 'level_up_skill':
                result = await levelUpSkill(userId, call.params)
                break
            case 'add_material':
                result = await addMaterial(userId, call.params as any)
                break
            case 'create_test':
                result = await createTest(userId, call.params as any)
                break
            case 'verify_test':
                result = await verifyTest(userId, call.params as any)
                break
            case 'web_search':
                result = await webSearch(userId, call.params as any)
                break
            case 'query_brain':
                result = await queryBrain(userId, call.params as any)
                break
            default:
                result = { success: false, message: `Tool sconosciuto: ${call.tool}` }
        }

        console.log('[TOOLS] ←', call.tool, result.success ? '✓' : '✗', result.message)
        results.push(result)
    }

    return results
}

/**
 * Rimuove le chiamate tool dal testo per mostrare solo il messaggio all'utente
 */
export function cleanToolCalls(text: string): string {
    return text.replace(/\[TOOL:\w+\][\s\S]*?\[\/TOOL\]/g, '').trim()
}

/**
 * Verifica se il testo contiene chiamate tool
 */
export function hasToolCalls(text: string): boolean {
    return /\[TOOL:\w+\]/.test(text)
}
