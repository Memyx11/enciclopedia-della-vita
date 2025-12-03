import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// =============================================
// TYPES - Aligned with schema-completo.sql
// =============================================

// Area Types
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

// Memory Types
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

// Journal Entry Types
export type JournalEntryType =
    | 'nur_message'
    | 'insight'
    | 'achievement'
    | 'suggestion'
    | 'reminder'
    | 'article'
    | 'reflection_prompt'
    | 'weekly_summary'
    | 'progress_update'
    | 'challenge'
    | 'quote'

// =============================================
// INTERFACES
// =============================================

export interface Profile {
    id?: string
    clerk_user_id: string
    username?: string
    full_name?: string
    email?: string
    avatar_url?: string
    age_range?: '14-18' | '19-25' | '26-40' | '41-60' | '60+'
    personality_type?: string
    communication_style?: 'direct' | 'gentle' | 'humorous' | 'formal'
    onboarding_completed?: boolean
    created_at?: string
    updated_at?: string
}

export interface LifeArea {
    id?: string
    clerk_user_id: string
    area_type: AreaType
    current_state?: Record<string, any>
    goal_state?: Record<string, any>
    progress: number
    priority?: number
    last_significant_update?: string
    active_tasks?: any[]
    notes?: string
    // Legacy field for compatibility
    data?: Record<string, any>
    created_at?: string
    updated_at?: string
}

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
    mention_count?: number
    last_relevant_at?: string
    created_at?: string
    updated_at?: string
}

export interface NurMemory {
    id?: string
    learning_type: 'conversation_pattern' | 'topic_expertise' | 'user_archetype' | 'successful_approach' | 'failed_approach' | 'cultural_insight' | 'feedback_received'
    content: string
    context?: string
    confirmation_count?: number
    effectiveness_score?: number
    is_active?: boolean
    created_at?: string
    updated_at?: string
}

export interface Conversation {
    id?: string
    clerk_user_id: string
    title?: string
    main_topic?: string
    area_related?: AreaType | 'generale' | null
    overall_sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed'
    insights_extracted?: boolean
    status?: 'active' | 'archived' | 'deleted'
    message_count?: number
    created_at?: string
    updated_at?: string
}

export interface Message {
    id?: string
    conversation_id?: string
    clerk_user_id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    sentiment?: 'positive' | 'neutral' | 'negative'
    detected_emotion?: string
    contains_action_request?: boolean
    contains_solution?: boolean
    area_type?: string
    created_at?: string
}

export interface Solution {
    id?: string
    clerk_user_id: string
    conversation_id?: string
    title: string
    description?: string
    steps: string[] | Record<string, any>[]
    status: 'proposta' | 'accettata' | 'rifiutata' | 'in_corso' | 'completata' | 'abbandonata'
    area_type?: string
    progress: number
    deadline?: string
    rejection_reason?: string
    completion_feedback?: string
    final_rating?: number
    // Legacy field
    content?: string
    created_at?: string
    updated_at?: string
}

export interface AIInsight {
    id?: string
    clerk_user_id: string
    insight_type: 'priority' | 'progress' | 'suggestion' | 'alert' | 'pattern' | 'celebration' | 'reminder' | 'reflection'
    content: string
    title?: string
    area_related?: string
    priority?: number
    is_shown?: boolean
    is_read?: boolean
    action_taken?: boolean
    valid_until?: string
    source_conversation_id?: string
    created_at?: string
}

export interface JournalEntry {
    id?: string
    clerk_user_id: string
    entry_type: JournalEntryType
    content: string
    title?: string
    metadata?: Record<string, any>
    area_related?: string
    feed_priority?: number
    is_seen?: boolean
    user_interacted?: boolean
    interaction_type?: string
    valid_from?: string
    valid_until?: string
    is_pinned?: boolean
    created_at?: string
}

export interface NurGrowth {
    id?: string
    metric_type: string
    value: number
    period_type: 'daily' | 'weekly' | 'monthly'
    period_date: string
    metadata?: Record<string, any>
    created_at?: string
}

export interface EncyclopediaContent {
    id?: string
    slug: string
    title: string
    category: string
    subcategory?: string
    content: string
    summary?: string
    age_range?: string[]
    tags?: string[]
    ai_generated?: boolean
    human_reviewed?: boolean
    views?: number
    helpful_votes?: number
    reading_time?: number
    is_published?: boolean
    created_at?: string
    updated_at?: string
}
