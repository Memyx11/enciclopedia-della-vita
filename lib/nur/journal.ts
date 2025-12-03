/**
 * NUR Journal System
 * Sistema per il Giornale Personalizzato dell'utente
 */

import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { JOURNAL_GENERATION_PROMPT, UserContext } from './personality'
import { buildFullUserContext } from './memory'

// ============================================
// TYPES
// ============================================

export type JournalEntryType =
    | 'nur_message'        // Messaggio diretto da NUR
    | 'insight'            // Insight generato
    | 'achievement'        // Traguardo raggiunto
    | 'suggestion'         // Suggerimento del giorno
    | 'reminder'           // Promemoria
    | 'article'            // Articolo consigliato
    | 'reflection_prompt'  // Spunto di riflessione
    | 'weekly_summary'     // Riepilogo settimanale
    | 'progress_update'    // Aggiornamento progressi
    | 'challenge'          // Sfida proposta
    | 'quote'              // Citazione motivazionale

export interface JournalEntry {
    id?: string
    clerk_user_id: string
    entry_type: JournalEntryType
    title?: string
    content: string
    metadata?: Record<string, any>
    area_related?: string
    feed_priority: number
    is_seen: boolean
    user_interacted: boolean
    interaction_type?: string
    valid_from?: string
    valid_until?: string
    is_pinned: boolean
    created_at?: string
}

export interface JournalFeedOptions {
    limit?: number
    offset?: number
    includeRead?: boolean
    entryTypes?: JournalEntryType[]
    areaFilter?: string
}

// ============================================
// JOURNAL FEED
// ============================================

/**
 * Ottiene il feed del giornale per un utente
 */
export async function getJournalFeed(
    clerkUserId: string,
    options: JournalFeedOptions = {}
): Promise<JournalEntry[]> {
    const {
        limit = 20,
        offset = 0,
        includeRead = true,
        entryTypes,
        areaFilter
    } = options

    const now = new Date().toISOString()

    let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .lte('valid_from', now)
        .or(`valid_until.is.null,valid_until.gt.${now}`)
        .order('is_pinned', { ascending: false })
        .order('feed_priority', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (!includeRead) {
        query = query.eq('is_seen', false)
    }

    if (entryTypes && entryTypes.length > 0) {
        query = query.in('entry_type', entryTypes)
    }

    if (areaFilter) {
        query = query.eq('area_related', areaFilter)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching journal feed:', error)
        return []
    }

    return data || []
}

/**
 * Conta le entry non lette
 */
export async function getUnreadCount(clerkUserId: string): Promise<number> {
    const { count, error } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('clerk_user_id', clerkUserId)
        .eq('is_seen', false)

    return error ? 0 : (count || 0)
}

// ============================================
// JOURNAL ENTRY CREATION
// ============================================

/**
 * Crea una nuova entry nel giornale
 */
export async function createJournalEntry(
    entry: Omit<JournalEntry, 'id' | 'created_at' | 'is_seen' | 'user_interacted' | 'is_pinned'>
): Promise<JournalEntry | null> {
    const { data, error } = await supabase
        .from('journal_entries')
        .insert({
            ...entry,
            is_seen: false,
            user_interacted: false,
            is_pinned: false,
            valid_from: entry.valid_from || new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating journal entry:', error)
        return null
    }

    return data
}

/**
 * Genera un messaggio giornaliero da NUR per l'utente
 */
export async function generateDailyNurMessage(clerkUserId: string): Promise<JournalEntry | null> {
    try {
        // Carica contesto utente
        const userContext = await buildFullUserContext(clerkUserId)

        if (!userContext.profile) {
            return null // Utente non ancora inizializzato
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        })

        // Prepara il contesto per la generazione
        const contextSummary = buildContextSummary(userContext)

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: JOURNAL_GENERATION_PROMPT,
            messages: [{
                role: 'user',
                content: `Genera un messaggio per il giornale di oggi.

CONTESTO UTENTE:
${contextSummary}

È ${getTimeOfDay()}. Genera un messaggio appropriato per questo momento della giornata.`
            }]
        })

        const responseText = response.content[0].type === 'text'
            ? response.content[0].text
            : null

        if (!responseText) return null

        // Parse JSON response
        const generated = JSON.parse(responseText)

        // Crea la entry
        return await createJournalEntry({
            clerk_user_id: clerkUserId,
            entry_type: generated.type || 'nur_message',
            title: generated.title,
            content: generated.content,
            area_related: generated.area,
            feed_priority: generated.priority || 7,
            metadata: { generated_at: new Date().toISOString() }
        })
    } catch (error) {
        console.error('Error generating daily message:', error)
        return null
    }
}

/**
 * Crea un insight come entry del giornale
 */
export async function createInsightEntry(
    clerkUserId: string,
    insightType: string,
    content: string,
    title?: string,
    area?: string,
    priority: number = 6
): Promise<JournalEntry | null> {
    return await createJournalEntry({
        clerk_user_id: clerkUserId,
        entry_type: 'insight',
        title: title || getInsightTitle(insightType),
        content,
        area_related: area,
        feed_priority: priority,
        metadata: { insight_type: insightType }
    })
}

/**
 * Crea una celebrazione per un achievement
 */
export async function createAchievementEntry(
    clerkUserId: string,
    achievement: string,
    area?: string
): Promise<JournalEntry | null> {
    // Genera un messaggio di celebrazione personalizzato
    const celebrations = [
        `BOOM! ${achievement} - Questo è il te che mi piace vedere!`,
        `Lo sapevo. LO SAPEVO che ce l'avresti fatta. ${achievement}`,
        `${achievement} - Tieniti stretto questo momento. Te lo sei guadagnato.`,
        `Aspetta aspetta. ${achievement}? MA DAIIII! Sono fiera di te.`
    ]

    const content = celebrations[Math.floor(Math.random() * celebrations.length)]

    return await createJournalEntry({
        clerk_user_id: clerkUserId,
        entry_type: 'achievement',
        title: 'Traguardo Raggiunto!',
        content,
        area_related: area,
        feed_priority: 9, // Alta priorità per celebrazioni
        metadata: { achievement }
    })
}

/**
 * Crea un reminder contestuale
 */
export async function createReminderEntry(
    clerkUserId: string,
    reminder: string,
    validUntil?: Date,
    area?: string
): Promise<JournalEntry | null> {
    return await createJournalEntry({
        clerk_user_id: clerkUserId,
        entry_type: 'reminder',
        title: 'Promemoria',
        content: reminder,
        area_related: area,
        feed_priority: 8,
        valid_until: validUntil?.toISOString(),
        metadata: {}
    })
}

/**
 * Crea una sfida per l'utente
 */
export async function createChallengeEntry(
    clerkUserId: string,
    challenge: string,
    description: string,
    area?: string,
    durationDays: number = 7
): Promise<JournalEntry | null> {
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + durationDays)

    return await createJournalEntry({
        clerk_user_id: clerkUserId,
        entry_type: 'challenge',
        title: `Sfida: ${challenge}`,
        content: description,
        area_related: area,
        feed_priority: 7,
        valid_until: validUntil.toISOString(),
        metadata: {
            challenge_name: challenge,
            duration_days: durationDays
        }
    })
}

/**
 * Crea un riepilogo settimanale
 */
export async function createWeeklySummary(clerkUserId: string): Promise<JournalEntry | null> {
    try {
        // Carica dati della settimana
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const [conversations, solutions, areas] = await Promise.all([
            supabase
                .from('conversations')
                .select('*', { count: 'exact' })
                .eq('clerk_user_id', clerkUserId)
                .gte('created_at', oneWeekAgo.toISOString()),
            supabase
                .from('solutions')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
                .gte('updated_at', oneWeekAgo.toISOString()),
            supabase
                .from('life_areas')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
        ])

        const conversationCount = conversations.count || 0
        const completedSolutions = solutions.data?.filter(s => s.status === 'completata').length || 0
        const areasProgress = areas.data || []

        // Genera il riepilogo
        let content = `Questa settimana:\n`
        content += `- ${conversationCount} conversazioni con me\n`

        if (completedSolutions > 0) {
            content += `- ${completedSolutions} piani completati!\n`
        }

        // Trova l'area con più progressi
        const bestArea = areasProgress.sort((a, b) => b.progress - a.progress)[0]
        if (bestArea && bestArea.progress > 0) {
            content += `- Area migliore: ${bestArea.area_type} (${bestArea.progress}%)\n`
        }

        // Trova l'area che ha bisogno di attenzione
        const needsWork = areasProgress.filter(a => a.progress < 30).sort((a, b) => a.progress - b.progress)[0]
        if (needsWork) {
            content += `\nLa prossima settimana, focalizziamoci su ${needsWork.area_type}. Che ne dici?`
        } else {
            content += `\nStai andando alla grande! Continua così.`
        }

        return await createJournalEntry({
            clerk_user_id: clerkUserId,
            entry_type: 'weekly_summary',
            title: 'Il Tuo Riepilogo Settimanale',
            content,
            feed_priority: 8,
            metadata: {
                conversation_count: conversationCount,
                completed_solutions: completedSolutions,
                week_start: oneWeekAgo.toISOString()
            }
        })
    } catch (error) {
        console.error('Error creating weekly summary:', error)
        return null
    }
}

// ============================================
// JOURNAL INTERACTIONS
// ============================================

/**
 * Marca una entry come vista
 */
export async function markEntrySeen(entryId: string): Promise<boolean> {
    const { error } = await supabase
        .from('journal_entries')
        .update({ is_seen: true })
        .eq('id', entryId)

    return !error
}

/**
 * Marca tutte le entry come viste
 */
export async function markAllSeen(clerkUserId: string): Promise<boolean> {
    const { error } = await supabase
        .from('journal_entries')
        .update({ is_seen: true })
        .eq('clerk_user_id', clerkUserId)
        .eq('is_seen', false)

    return !error
}

/**
 * Registra un'interazione dell'utente
 */
export async function recordInteraction(
    entryId: string,
    interactionType: string
): Promise<boolean> {
    const { error } = await supabase
        .from('journal_entries')
        .update({
            user_interacted: true,
            interaction_type: interactionType
        })
        .eq('id', entryId)

    return !error
}

/**
 * Toggle pin su una entry
 */
export async function togglePin(entryId: string): Promise<boolean> {
    // Prima ottieni lo stato attuale
    const { data: entry } = await supabase
        .from('journal_entries')
        .select('is_pinned')
        .eq('id', entryId)
        .single()

    if (!entry) return false

    const { error } = await supabase
        .from('journal_entries')
        .update({ is_pinned: !entry.is_pinned })
        .eq('id', entryId)

    return !error
}

/**
 * Elimina una entry
 */
export async function deleteEntry(entryId: string): Promise<boolean> {
    const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)

    return !error
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildContextSummary(context: any): string {
    let summary = ''

    if (context.profile) {
        summary += `Nome: ${context.profile.full_name || 'Non specificato'}\n`
        if (context.profile.age_range) {
            summary += `Età: ${context.profile.age_range}\n`
        }
    }

    if (context.life_areas && context.life_areas.length > 0) {
        summary += '\nAree vita:\n'
        for (const area of context.life_areas) {
            summary += `- ${area.area_type}: ${area.progress}%\n`
        }
    }

    if (context.recent_memories && context.recent_memories.length > 0) {
        summary += '\nCose che so:\n'
        for (const mem of context.recent_memories.slice(0, 5)) {
            summary += `- ${mem.content}\n`
        }
    }

    if (context.active_solutions && context.active_solutions.length > 0) {
        summary += '\nPiani attivi:\n'
        for (const sol of context.active_solutions) {
            summary += `- ${sol.title} (${sol.progress}%)\n`
        }
    }

    return summary
}

function getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 6) return 'notte fonda'
    if (hour < 12) return 'mattina'
    if (hour < 14) return 'ora di pranzo'
    if (hour < 18) return 'pomeriggio'
    if (hour < 21) return 'sera'
    return 'sera tarda'
}

function getInsightTitle(insightType: string): string {
    const titles: Record<string, string> = {
        'priority': 'Qualcosa richiede attenzione',
        'progress': 'Ho notato dei progressi',
        'suggestion': 'Un suggerimento per te',
        'alert': 'Attenzione',
        'pattern': 'Ho notato qualcosa',
        'celebration': 'Da celebrare!',
        'reminder': 'Ti ricordo',
        'reflection': 'Spunto di riflessione'
    }
    return titles[insightType] || 'Insight'
}
