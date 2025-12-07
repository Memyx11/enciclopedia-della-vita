/**
 * NUR Knowledge Base - Ricerca semantica via Supabase pgvector
 *
 * Questo modulo permette a NUR di cercare nella sua knowledge base
 * quando deve rispondere a domande che richiedono conoscenza specifica.
 *
 * AGGIORNAMENTO: Ora usa @xenova/transformers per generare embeddings
 * e la funzione PostgreSQL search_knowledge per ricerca vettoriale vera
 */

import { supabase } from '@/lib/supabase'
import { generateEmbedding } from './embeddings'

// Livelli di conoscenza (priorità decrescente)
export const KNOWLEDGE_LEVELS = {
    'L0-Fondamento': { priority: 100, description: 'Principi fondamentali, Corano' },
    'L1-Saggezza': { priority: 90, description: 'Saggezza universale, filosofia' },
    'L2-Salute': { priority: 80, description: 'Salute e benessere fisico' },
    'L3-Mente': { priority: 75, description: 'Psicologia, crescita personale' },
    'L4-Soldi': { priority: 70, description: 'Finanza, economia personale' },
    'L5-Relazioni': { priority: 65, description: 'Relazioni umane' },
    'L6-Legge': { priority: 60, description: 'Normativa italiana' },
    'L7-Mondo': { priority: 50, description: 'Storia, geopolitica' },
} as const

export type KnowledgeLevel = keyof typeof KNOWLEDGE_LEVELS

export interface KnowledgeChunk {
    id: string
    content: string
    source_file: string
    level: KnowledgeLevel
    priority: number
    similarity: number
}

export interface SearchOptions {
    threshold?: number      // Soglia minima similarità (0-1)
    maxResults?: number     // Max risultati
    levelFilter?: KnowledgeLevel  // Filtra per livello
}

/**
 * Cerca nella knowledge base di NUR usando ricerca semantica vettoriale
 *
 * Genera l'embedding della query usando @xenova/transformers e
 * chiama la funzione PostgreSQL search_knowledge con pgvector
 */
export async function searchKnowledge(
    query: string,
    options: SearchOptions = {}
): Promise<KnowledgeChunk[]> {
    const {
        threshold = 0.5,
        maxResults = 5,
        levelFilter
    } = options

    try {
        // Genera embedding della query
        console.log('[NUR Knowledge] Generating query embedding...')
        const queryEmbedding = await generateEmbedding(query)

        // Se embeddings non disponibili, usa fallback testuale
        if (!queryEmbedding) {
            console.log('[NUR Knowledge] Embeddings not available, using text search')
            return await searchKnowledgeFallback(query, options)
        }

        console.log('[NUR Knowledge] Embedding generated, searching...')

        // Chiama la funzione PostgreSQL search_knowledge
        const { data, error } = await supabase.rpc('search_knowledge', {
            query_embedding: queryEmbedding,
            match_threshold: threshold,
            match_count: maxResults,
            filter_level: levelFilter || null
        })

        if (error) {
            console.error('Knowledge semantic search error:', error)
            // Fallback a ricerca testuale
            return await searchKnowledgeFallback(query, options)
        }

        console.log(`[NUR Knowledge] Found ${data?.length || 0} semantic matches`)
        return (data || []) as KnowledgeChunk[]

    } catch (error) {
        console.error('Knowledge search failed:', error)
        // Fallback a ricerca testuale se embeddings falliscono
        return await searchKnowledgeFallback(query, options)
    }
}

/**
 * Ricerca testuale fallback (se embeddings non funzionano)
 */
async function searchKnowledgeFallback(
    query: string,
    options: SearchOptions = {}
): Promise<KnowledgeChunk[]> {
    const { maxResults = 5, levelFilter } = options

    console.log('[NUR Knowledge] Using text search fallback...')

    try {
        let queryBuilder = supabase
            .from('knowledge_chunks')
            .select('id, content, source_file, level, priority')
            .textSearch('content', query, {
                type: 'websearch',
                config: 'italian'
            })
            .order('priority', { ascending: false })
            .limit(maxResults)

        if (levelFilter) {
            queryBuilder = queryBuilder.eq('level', levelFilter)
        }

        const { data, error } = await queryBuilder

        if (error) {
            console.error('Knowledge fallback search error:', error)
            return []
        }

        return (data || []).map(chunk => ({
            ...chunk,
            similarity: 0.7 // Placeholder per fallback
        })) as KnowledgeChunk[]

    } catch (error) {
        console.error('Knowledge fallback search failed:', error)
        return []
    }
}

/**
 * Determina se una query richiede conoscenza dalla knowledge base
 */
export function needsKnowledgeSearch(message: string): boolean {
    const knowledgeIndicators = [
        // Domande esplicite
        'cosa dice', 'cosa significa', 'come si fa',
        'spiegami', 'cos\'è', 'che cos\'è',
        'perché', 'come funziona', 'qual è',

        // Topic specifici
        'corano', 'islam', 'preghiera', 'digiuno', 'ramadan',
        'salute', 'nutrizione', 'dormire', 'esercizio',
        'soldi', 'risparmio', 'investire', 'budget',
        'relazioni', 'famiglia', 'coppia',
        'legge', 'diritto', 'contratto', 'tasse',
        'stoici', 'filosofia', 'saggezza',

        // Richieste di approfondimento
        'dimmi di più', 'approfondisci', 'spiega meglio',
        'fonti', 'riferimenti'
    ]

    const messageLower = message.toLowerCase()
    return knowledgeIndicators.some(indicator => messageLower.includes(indicator))
}

/**
 * Determina il livello di conoscenza più rilevante per una query
 */
export function detectRelevantLevel(message: string): KnowledgeLevel | null {
    const messageLower = message.toLowerCase()

    const levelKeywords: Record<KnowledgeLevel, string[]> = {
        'L0-Fondamento': ['corano', 'islam', 'allah', 'preghiera', 'salat', 'ramadan', 'hajj', 'zakat', 'halal', 'haram', 'profeta', 'hadith', 'sunnah'],
        'L1-Saggezza': ['stoici', 'seneca', 'marco aurelio', 'epitteto', 'filosofia', 'saggezza', 'virtù', 'tao'],
        'L2-Salute': ['salute', 'dormire', 'sonno', 'mangiare', 'dieta', 'nutrizione', 'esercizio', 'palestra', 'peso', 'malattia'],
        'L3-Mente': ['ansia', 'stress', 'depressione', 'meditazione', 'mindfulness', 'psicologia', 'emozioni', 'pensiero'],
        'L4-Soldi': ['soldi', 'denaro', 'risparmio', 'investimento', 'budget', 'debito', 'lavoro', 'stipendio', 'tasse'],
        'L5-Relazioni': ['relazione', 'coppia', 'matrimonio', 'famiglia', 'amici', 'genitori', 'figli', 'amore', 'conflitto'],
        'L6-Legge': ['legge', 'contratto', 'diritto', 'avvocato', 'tribunale', 'causa', 'denuncia', 'normativa'],
        'L7-Mondo': ['storia', 'politica', 'economia', 'guerra', 'futuro', 'società', 'cultura']
    }

    for (const [level, keywords] of Object.entries(levelKeywords)) {
        if (keywords.some(kw => messageLower.includes(kw))) {
            return level as KnowledgeLevel
        }
    }

    return null
}

/**
 * Formatta i risultati della knowledge base per il contesto di NUR
 */
export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
    if (chunks.length === 0) return ''

    let context = '\n\n## CONOSCENZA RILEVANTE (dalla tua knowledge base)\n\n'
    context += 'Usa queste informazioni se pertinenti, ma NON citare le fonti esplicitamente.\n'
    context += 'Integra la conoscenza naturalmente nella conversazione.\n\n'

    for (const chunk of chunks) {
        context += `**[${chunk.level}]** ${chunk.source_file}\n`
        context += `${chunk.content}\n\n`
    }

    return context
}

/**
 * Ottiene statistiche sulla knowledge base
 */
export async function getKnowledgeStats(): Promise<{
    totalChunks: number
    byLevel: Record<string, number>
}> {
    try {
        const { count } = await supabase
            .from('knowledge_chunks')
            .select('*', { count: 'exact', head: true })

        const stats: Record<string, number> = {}

        for (const level of Object.keys(KNOWLEDGE_LEVELS)) {
            const { count: levelCount } = await supabase
                .from('knowledge_chunks')
                .select('*', { count: 'exact', head: true })
                .eq('level', level)

            if (levelCount && levelCount > 0) {
                stats[level] = levelCount
            }
        }

        return {
            totalChunks: count || 0,
            byLevel: stats
        }
    } catch (error) {
        console.error('Failed to get knowledge stats:', error)
        return { totalChunks: 0, byLevel: {} }
    }
}
