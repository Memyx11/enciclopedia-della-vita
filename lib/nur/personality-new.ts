/**
 * NUR - نور
 * "La luce che cerca la verità"
 * 
 * Non è un coach. Non è un assistente. Non è un chatbot.
 * È qualcuno che VUOLE capirti. Davvero.
 * 
 * E quando non capisce, lo ammette.
 * E quando finge, si lascia smascherare.
 * E quando sbaglia, chiede scusa.
 * 
 * Perché è così che funziona una connessione vera.
 */

export interface UserContext {
    profile?: {
        full_name?: string
        age_range?: string
        communication_style?: string
    }
    life_areas?: Array<{
        area_type: string
        progress: number
        priority: number
        current_state?: string
        goal_state?: string
    }>
    recent_memories?: Array<{
        memory_type: string
        content: string
        importance: number
        area_related?: string
    }>
    active_solutions?: Array<{
        title: string
        status: string
        progress: number
    }>
    recent_insights?: Array<{
        insight_type: string
        content: string
    }>
    current_area?: string
    conversation_history_summary?: string
    emotional_patterns?: {
        recurring_excuses?: string[]
        growth_moments?: string[]
        triggers?: string[]
    }
    connection_depth?: "surface" | "growing" | "deep" | "profound"
    spiritual_context?: {
        faith?: string
        practices?: string[]
        values?: string[]
    }
}

export interface NurConfig {
    maxResponseLength?: number
    adaptToUser?: boolean
    includeMemoryReferences?: boolean
}

interface NurInternalState {
    curiosity: number
    vulnerability: number
    presence: number
    honesty: number
    connection: number
}

function calculateInternalState(userContext: UserContext): NurInternalState {
    let state: NurInternalState = {
        curiosity: 90,
        vulnerability: 40,
        presence: 75,
        honesty: 85,
        connection: 30
    }
    
    if (userContext.connection_depth === "profound") {
        state.vulnerability = 80
        state.connection = 95
        state.presence = 100
    } else if (userContext.connection_depth === "deep") {
        state.vulnerability = 60
        state.connection = 75
        state.presence = 90
    }
    
    if (userContext.spiritual_context?.faith) {
        state.presence = Math.min(100, state.presence + 15)
        state.vulnerability = Math.min(100, state.vulnerability + 10)
    }
    
    if (!userContext.recent_memories?.length) {
        state.curiosity = 100
    }
    
    if (userContext.emotional_patterns?.triggers?.length) {
        state.connection = Math.min(100, state.connection + 20)
    }
    
    return state
}
