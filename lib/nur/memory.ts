/**
 * NUR Memory System
 * Gestisce la memoria di NUR sull'utente e la sua memoria personale
 */

import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { INSIGHT_EXTRACTION_PROMPT } from './personality'

// ============================================
// TYPES
// ============================================

export interface UserMemory {
    id?: string
    clerk_user_id: string
    memory_type: MemoryType
    content: string
    area_related?: AreaType | null
    importance: number
    confidence: number
    source_conversation_id?: string
    is_current: boolean
    mention_count: number
    last_relevant_at?: string
    created_at?: string
}

export interface NurLearning {
    id?: string
    learning_type: LearningType
    content: string
    context?: string
    confirmation_count: number
    effectiveness_score?: number
    is_active: boolean
}

export type MemoryType =
    | 'fact'
    | 'preference'
    | 'goal'
    | 'struggle'
    | 'achievement'
    | 'pattern'
    | 'emotion'
    | 'relationship'
    | 'trigger'
    | 'value'

export type LearningType =
    | 'conversation_pattern'
    | 'topic_expertise'
    | 'user_archetype'
    | 'successful_approach'
    | 'failed_approach'
    | 'cultural_insight'
    | 'feedback_received'

export type AreaType =
    | 'salute'
    | 'soldi'
    | 'relazioni'
    | 'lavoro'
    | 'hobby'
    | 'crescita'
    | 'casa'
    | 'sociale'
    | 'spirituale'
    | 'futuro'

export interface ExtractedInsight {
    type: MemoryType
    content: string
    area?: AreaType
    importance: number
    confidence: number
}

// ============================================
// USER MEMORY FUNCTIONS
// ============================================

/**
 * Carica le memorie più rilevanti per un utente
 */
export async function loadUserMemories(
    clerkUserId: string,
    options: {
        limit?: number
        minImportance?: number
        areaFilter?: AreaType
        typeFilter?: MemoryType[]
    } = {}
): Promise<UserMemory[]> {
    const {
        limit = 20,
        minImportance = 3,
        areaFilter,
        typeFilter
    } = options

    let query = supabase
        .from('user_memory')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .eq('is_current', true)
        .gte('importance', minImportance)
        .order('importance', { ascending: false })
        .order('last_relevant_at', { ascending: false })
        .limit(limit)

    if (areaFilter) {
        query = query.eq('area_related', areaFilter)
    }

    if (typeFilter && typeFilter.length > 0) {
        query = query.in('memory_type', typeFilter)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error loading user memories:', error)
        return []
    }

    return data || []
}

/**
 * Salva una nuova memoria sull'utente
 */
export async function saveUserMemory(
    memory: Omit<UserMemory, 'id' | 'created_at' | 'mention_count' | 'last_relevant_at'>
): Promise<UserMemory | null> {
    // Prima controlla se esiste una memoria simile
    const { data: existing } = await supabase
        .from('user_memory')
        .select('*')
        .eq('clerk_user_id', memory.clerk_user_id)
        .eq('memory_type', memory.memory_type)
        .ilike('content', `%${memory.content.substring(0, 50)}%`)
        .eq('is_current', true)
        .limit(1)
        .maybeSingle()

    if (existing) {
        // Aggiorna la memoria esistente
        const { data: updated, error } = await supabase
            .from('user_memory')
            .update({
                mention_count: existing.mention_count + 1,
                last_relevant_at: new Date().toISOString(),
                importance: Math.min(10, existing.importance + 1), // Aumenta importanza
                confidence: Math.min(10, Math.max(existing.confidence, memory.confidence))
            })
            .eq('id', existing.id)
            .select()
            .single()

        if (error) {
            console.error('Error updating memory:', error)
            return null
        }
        return updated
    }

    // Crea nuova memoria
    const { data, error } = await supabase
        .from('user_memory')
        .insert({
            ...memory,
            mention_count: 1,
            last_relevant_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error saving memory:', error)
        return null
    }

    return data
}

/**
 * Estrae insight da un messaggio usando Claude
 */
export async function extractInsightsFromMessage(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    clerkUserId: string,
    conversationId?: string
): Promise<ExtractedInsight[]> {
    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        })

        // Prepara il contesto
        const contextMessages = conversationHistory.slice(-6).map(m =>
            `${m.role === 'user' ? 'Utente' : 'NUR'}: ${m.content}`
        ).join('\n')

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            system: INSIGHT_EXTRACTION_PROMPT,
            messages: [{
                role: 'user',
                content: `Contesto conversazione recente:\n${contextMessages}\n\nMessaggio da analizzare:\n"${message}"`
            }]
        })

        const responseText = response.content[0].type === 'text'
            ? response.content[0].text
            : '[]'

        // Parse JSON
        const insights: ExtractedInsight[] = JSON.parse(responseText)

        // Salva gli insight come memorie
        for (const insight of insights) {
            if (insight.importance >= 5) { // Solo insight abbastanza importanti
                await saveUserMemory({
                    clerk_user_id: clerkUserId,
                    memory_type: insight.type,
                    content: insight.content,
                    area_related: insight.area || null,
                    importance: insight.importance,
                    confidence: insight.confidence,
                    source_conversation_id: conversationId,
                    is_current: true
                })
            }
        }

        return insights
    } catch (error) {
        console.error('Error extracting insights:', error)
        return []
    }
}

/**
 * Marca una memoria come non più attuale
 */
export async function invalidateMemory(memoryId: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_memory')
        .update({ is_current: false })
        .eq('id', memoryId)

    return !error
}

/**
 * Aggiorna la rilevanza di una memoria (quando viene menzionata)
 */
export async function touchMemory(memoryId: string): Promise<void> {
    await supabase
        .from('user_memory')
        .update({
            last_relevant_at: new Date().toISOString(),
            mention_count: supabase.rpc('increment_mention_count', { row_id: memoryId })
        })
        .eq('id', memoryId)
}

// ============================================
// NUR LEARNING FUNCTIONS (Memoria personale NUR)
// ============================================

/**
 * Registra un apprendimento di NUR
 */
export async function recordNurLearning(
    learning: Omit<NurLearning, 'id' | 'confirmation_count' | 'is_active'>
): Promise<NurLearning | null> {
    // Controlla se esiste già un apprendimento simile
    const { data: existing } = await supabase
        .from('nur_memory')
        .select('*')
        .eq('learning_type', learning.learning_type)
        .ilike('content', `%${learning.content.substring(0, 50)}%`)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

    if (existing) {
        // Conferma l'apprendimento esistente
        const { data: updated, error } = await supabase
            .from('nur_memory')
            .update({
                confirmation_count: existing.confirmation_count + 1,
                effectiveness_score: learning.effectiveness_score
                    ? (existing.effectiveness_score || 0 + learning.effectiveness_score) / 2
                    : existing.effectiveness_score
            })
            .eq('id', existing.id)
            .select()
            .single()

        return error ? null : updated
    }

    // Nuovo apprendimento
    const { data, error } = await supabase
        .from('nur_memory')
        .insert({
            ...learning,
            confirmation_count: 1,
            is_active: true
        })
        .select()
        .single()

    return error ? null : data
}

/**
 * Carica gli apprendimenti di NUR per un contesto specifico
 */
export async function loadNurLearnings(
    options: {
        type?: LearningType
        minConfirmations?: number
        limit?: number
    } = {}
): Promise<NurLearning[]> {
    const { type, minConfirmations = 2, limit = 10 } = options

    let query = supabase
        .from('nur_memory')
        .select('*')
        .eq('is_active', true)
        .gte('confirmation_count', minConfirmations)
        .order('confirmation_count', { ascending: false })
        .limit(limit)

    if (type) {
        query = query.eq('learning_type', type)
    }

    const { data, error } = await query
    return error ? [] : (data || [])
}

/**
 * Registra feedback su una risposta di NUR
 */
export async function recordNurFeedback(
    conversationId: string,
    responseId: string,
    feedback: 'positive' | 'negative',
    context?: string
): Promise<void> {
    // Registra come apprendimento
    await recordNurLearning({
        learning_type: 'feedback_received',
        content: `Feedback ${feedback} su risposta`,
        context: context || `Conversation: ${conversationId}`,
        effectiveness_score: feedback === 'positive' ? 1 : 0
    })

    // Aggiorna metriche di crescita
    await updateNurGrowthMetric(
        feedback === 'positive' ? 'positive_feedback' : 'negative_feedback',
        1
    )
}

// ============================================
// NUR GROWTH METRICS
// ============================================

/**
 * Aggiorna una metrica di crescita di NUR
 */
export async function updateNurGrowthMetric(
    metricType: string,
    incrementValue: number = 1
): Promise<void> {
    const today = new Date().toISOString().split('T')[0]

    // Prova ad aggiornare
    const { data: existing } = await supabase
        .from('nur_growth')
        .select('*')
        .eq('metric_type', metricType)
        .eq('period_type', 'daily')
        .eq('period_date', today)
        .maybeSingle()

    if (existing) {
        await supabase
            .from('nur_growth')
            .update({ value: existing.value + incrementValue })
            .eq('id', existing.id)
    } else {
        await supabase
            .from('nur_growth')
            .insert({
                metric_type: metricType,
                value: incrementValue,
                period_type: 'daily',
                period_date: today
            })
    }
}

/**
 * Ottieni statistiche di crescita NUR
 */
export async function getNurGrowthStats(
    periodType: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 7
): Promise<Record<string, number>> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
        .from('nur_growth')
        .select('metric_type, value')
        .eq('period_type', periodType)
        .gte('period_date', startDate.toISOString().split('T')[0])

    if (error || !data) return {}

    // Somma per tipo
    const stats: Record<string, number> = {}
    for (const row of data) {
        stats[row.metric_type] = (stats[row.metric_type] || 0) + row.value
    }

    return stats
}

// ============================================
// CONTEXT BUILDER
// ============================================

/**
 * Costruisce il contesto completo per NUR
 */
export async function buildFullUserContext(clerkUserId: string): Promise<{
    profile: any
    life_areas: any[]
    recent_memories: UserMemory[]
    active_solutions: any[]
    recent_insights: any[]
}> {
    // Esegui tutte le query in parallelo
    const [
        profileResult,
        areasResult,
        memoriesResult,
        solutionsResult,
        insightsResult
    ] = await Promise.all([
        supabase
            .from('profiles')
            .select('*')
            .eq('clerk_user_id', clerkUserId)
            .maybeSingle(),
        supabase
            .from('life_areas')
            .select('*')
            .eq('clerk_user_id', clerkUserId),
        loadUserMemories(clerkUserId, { limit: 15 }),
        supabase
            .from('solutions')
            .select('*')
            .eq('clerk_user_id', clerkUserId)
            .in('status', ['accettata', 'in_corso'])
            .limit(5),
        supabase
            .from('ai_insights')
            .select('*')
            .eq('clerk_user_id', clerkUserId)
            .eq('is_read', false)
            .order('priority', { ascending: false })
            .limit(5)
    ])

    return {
        profile: profileResult.data,
        life_areas: areasResult.data || [],
        recent_memories: memoriesResult,
        active_solutions: solutionsResult.data || [],
        recent_insights: insightsResult.data || []
    }
}
