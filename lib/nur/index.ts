/**
 * NUR - Sistema AI Centrale
 * Entry point per tutte le funzionalità di NUR
 */

// Re-export everything
export * from './personality'
export * from './memory'
export * from './journal'
export * from './mission'

// Main NUR interface
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { generateNurPrompt, UserContext } from './personality'
import {
    buildFullUserContext,
    extractInsightsFromMessage,
    updateNurGrowthMetric,
    saveUserMemory
} from './memory'
import { createInsightEntry, createAchievementEntry } from './journal'

// ============================================
// TYPES
// ============================================

export interface NurResponse {
    message: string
    insights_extracted: number
    conversation_id?: string
    metadata?: {
        sentiment?: string
        detected_emotion?: string
        contains_solution?: boolean
        area_detected?: string
    }
}

export interface ChatOptions {
    conversationId?: string
    areaContext?: string
    extractInsights?: boolean
    saveToDb?: boolean
}

// ============================================
// MAIN NUR CLASS
// ============================================

class NurCore {
    private anthropic: Anthropic

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        })
    }

    /**
     * Invia un messaggio a NUR e ottieni risposta
     */
    async chat(
        clerkUserId: string,
        message: string,
        history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
        options: ChatOptions = {}
    ): Promise<NurResponse> {
        const {
            conversationId,
            areaContext,
            extractInsights = true,
            saveToDb = true
        } = options

        try {
            // 1. Carica contesto completo dell'utente
            const userContext = await buildFullUserContext(clerkUserId)

            // 2. Genera il system prompt personalizzato
            const systemPrompt = generateNurPrompt({
                ...userContext,
                current_area: areaContext
            })

            // 3. Prepara i messaggi per Claude
            const messages = [
                ...history.map(m => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content
                })),
                { role: 'user' as const, content: message }
            ]

            // 4. Chiama Claude
            const response = await this.anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 600,
                system: systemPrompt,
                messages
            })

            const nurMessage = response.content[0].type === 'text'
                ? response.content[0].text
                : 'Hmm, qualcosa non va. Riprova.'

            // 5. Estrai insights dal messaggio utente (in background)
            let insightsCount = 0
            if (extractInsights) {
                const insights = await extractInsightsFromMessage(
                    message,
                    history,
                    clerkUserId,
                    conversationId
                )
                insightsCount = insights.length

                // Se ci sono insight importanti, creali anche nel giornale
                for (const insight of insights) {
                    if (insight.importance >= 7) {
                        await createInsightEntry(
                            clerkUserId,
                            insight.type,
                            insight.content,
                            undefined,
                            insight.area,
                            insight.importance
                        )
                    }
                }
            }

            // 6. Salva la conversazione nel DB
            let finalConversationId = conversationId
            if (saveToDb) {
                finalConversationId = await this.saveConversation(
                    clerkUserId,
                    message,
                    nurMessage,
                    conversationId,
                    areaContext
                )
            }

            // 7. Aggiorna metriche
            await updateNurGrowthMetric('conversations_total', 1)
            if (insightsCount > 0) {
                await updateNurGrowthMetric('insights_generated', insightsCount)
            }

            // 8. Analizza la risposta per metadata
            const metadata = await this.analyzeResponse(message, nurMessage)

            // 9. Se NUR ha proposto una soluzione, salvala
            if (metadata.contains_solution) {
                await this.extractAndSaveSolution(
                    clerkUserId,
                    nurMessage,
                    finalConversationId,
                    areaContext
                )
            }

            return {
                message: nurMessage,
                insights_extracted: insightsCount,
                conversation_id: finalConversationId,
                metadata
            }
        } catch (error) {
            console.error('NUR chat error:', error)
            throw error
        }
    }

    /**
     * Salva la conversazione nel database
     */
    private async saveConversation(
        clerkUserId: string,
        userMessage: string,
        nurResponse: string,
        existingConversationId?: string,
        areaContext?: string
    ): Promise<string> {
        let conversationId = existingConversationId

        // Se non c'è una conversazione esistente, creane una nuova
        if (!conversationId) {
            const { data: conv, error } = await supabase
                .from('conversations')
                .insert({
                    clerk_user_id: clerkUserId,
                    area_related: areaContext || 'generale',
                    status: 'active',
                    message_count: 0
                })
                .select('id')
                .single()

            if (error) throw error
            conversationId = conv.id
        }

        // Salva i messaggi
        await supabase.from('messages').insert([
            {
                conversation_id: conversationId,
                clerk_user_id: clerkUserId,
                role: 'user',
                content: userMessage,
                area_type: areaContext || 'generale'
            },
            {
                conversation_id: conversationId,
                clerk_user_id: clerkUserId,
                role: 'assistant',
                content: nurResponse,
                area_type: areaContext || 'generale'
            }
        ])

        // Aggiorna il conteggio messaggi manualmente
        try {
            const { data: conv } = await supabase
                .from('conversations')
                .select('message_count')
                .eq('id', conversationId)
                .single()

            await supabase
                .from('conversations')
                .update({ message_count: (conv?.message_count || 0) + 2 })
                .eq('id', conversationId)
        } catch (e) {
            // Ignora errore aggiornamento conteggio
            console.log('Message count update skipped')
        }

        return conversationId
    }

    /**
     * Analizza messaggio e risposta per metadata
     */
    private async analyzeResponse(
        userMessage: string,
        nurResponse: string
    ): Promise<NurResponse['metadata']> {
        // Analisi semplice basata su keyword (può essere migliorata con AI)
        const metadata: NurResponse['metadata'] = {}

        // Rileva sentiment
        const negativeWords = ['triste', 'male', 'schifo', 'ansia', 'stress', 'incazzato', 'frustrato']
        const positiveWords = ['bene', 'felice', 'contento', 'riuscito', 'fatto', 'successo']

        const messageLower = userMessage.toLowerCase()
        if (negativeWords.some(w => messageLower.includes(w))) {
            metadata.sentiment = 'negative'
        } else if (positiveWords.some(w => messageLower.includes(w))) {
            metadata.sentiment = 'positive'
        } else {
            metadata.sentiment = 'neutral'
        }

        // Rileva se NUR ha proposto una soluzione
        const solutionIndicators = [
            'ecco cosa puoi fare',
            'ti propongo',
            'prova a',
            'primo step',
            'secondo step',
            'piano d\'azione',
            'inizia con',
            'potresti'
        ]
        metadata.contains_solution = solutionIndicators.some(ind =>
            nurResponse.toLowerCase().includes(ind)
        )

        // Rileva area dal contesto
        const areaKeywords: Record<string, string[]> = {
            'salute': ['peso', 'dormire', 'sonno', 'mangiare', 'palestra', 'sport', 'energia'],
            'soldi': ['soldi', 'lavoro', 'stipendio', 'risparmi', 'bollette', 'debiti'],
            'relazioni': ['ragazza', 'ragazzo', 'partner', 'famiglia', 'amici', 'fidanzata', 'fidanzato'],
            'lavoro': ['lavoro', 'capo', 'colleghi', 'carriera', 'promozione', 'cv'],
            'crescita': ['imparare', 'corso', 'libro', 'skill', 'migliorare'],
            'spirituale': ['ansia', 'stress', 'meditazione', 'pace', 'senso']
        }

        for (const [area, keywords] of Object.entries(areaKeywords)) {
            if (keywords.some(k => messageLower.includes(k))) {
                metadata.area_detected = area
                break
            }
        }

        return metadata
    }

    /**
     * Estrae e salva una soluzione proposta da NUR
     */
    private async extractAndSaveSolution(
        clerkUserId: string,
        nurResponse: string,
        conversationId?: string,
        areaContext?: string
    ): Promise<void> {
        try {
            // Estrai steps dalla risposta (cerca pattern numerati o bullet points)
            const lines = nurResponse.split('\n').filter(l => l.trim())
            const steps: string[] = []

            for (const line of lines) {
                // Cerca pattern come "1.", "1)", "- ", "• "
                if (/^[\d]+[\.\)]|\s*[-•]\s/.test(line.trim())) {
                    const cleanStep = line.replace(/^[\d]+[\.\)]\s*|\s*[-•]\s*/, '').trim()
                    if (cleanStep.length > 10) {
                        steps.push(cleanStep)
                    }
                }
            }

            if (steps.length >= 2) {
                // Genera un titolo dalla prima frase
                const title = lines[0].substring(0, 60).replace(/[^a-zA-Z0-9àèéìòù\s]/gi, '').trim() || 'Piano suggerito da NUR'

                await supabase.from('solutions').insert({
                    clerk_user_id: clerkUserId,
                    conversation_id: conversationId,
                    title,
                    description: nurResponse.substring(0, 200),
                    steps,
                    status: 'proposta',
                    area_type: areaContext || 'generale',
                    progress: 0
                })
            }
        } catch (error) {
            console.error('Error extracting solution:', error)
        }
    }

    /**
     * Ottiene il contesto utente formattato
     */
    async getUserContext(clerkUserId: string): Promise<UserContext> {
        return await buildFullUserContext(clerkUserId)
    }

    /**
     * Inizializza un nuovo utente
     */
    async initializeUser(
        clerkUserId: string,
        userData: {
            email?: string
            fullName?: string
            ageRange?: string
        }
    ): Promise<void> {
        // Crea profilo
        await supabase.from('profiles').upsert({
            clerk_user_id: clerkUserId,
            email: userData.email,
            full_name: userData.fullName,
            age_range: userData.ageRange,
            onboarding_completed: false
        })

        // Crea le 10 aree vita
        const areas = [
            'salute', 'soldi', 'relazioni', 'lavoro', 'hobby',
            'crescita', 'casa', 'sociale', 'spirituale', 'futuro'
        ]

        const areaInserts = areas.map(area => ({
            clerk_user_id: clerkUserId,
            area_type: area,
            progress: 0,
            priority: 5
        }))

        await supabase.from('life_areas').upsert(areaInserts, {
            onConflict: 'clerk_user_id,area_type'
        })

        // Crea messaggio di benvenuto nel giornale
        await createInsightEntry(
            clerkUserId,
            'suggestion',
            `Ciao! Sono NUR, la tua guida personale. Non sono un bot qualunque - sono qui per aiutarti davvero, con onestà e (a volte) un po' di sana provocazione. Inizia raccontandomi qualcosa di te.`,
            'Benvenuto!',
            undefined,
            10
        )
    }

    /**
     * Celebra un achievement
     */
    async celebrateAchievement(
        clerkUserId: string,
        achievement: string,
        area?: string
    ): Promise<void> {
        // Salva come memoria
        await saveUserMemory({
            clerk_user_id: clerkUserId,
            memory_type: 'achievement',
            content: achievement,
            area_related: area as any,
            importance: 8,
            confidence: 10,
            is_current: true
        })

        // Crea entry nel giornale
        await createAchievementEntry(clerkUserId, achievement, area)
    }
}

// Singleton instance
let nurInstance: NurCore | null = null

export function getNur(): NurCore {
    if (!nurInstance) {
        nurInstance = new NurCore()
    }
    return nurInstance
}

// Export class for testing
export { NurCore }
