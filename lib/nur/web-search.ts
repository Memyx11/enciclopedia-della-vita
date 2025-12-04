/**
 * NUR Web Search - Accesso a Internet
 * Permette a NUR di cercare informazioni online
 */

interface SearchResult {
    title: string
    url: string
    snippet: string
}

interface WebSearchResponse {
    success: boolean
    results: SearchResult[]
    error?: string
}

/**
 * Rileva se il messaggio richiede una ricerca web
 */
export function needsWebSearch(message: string): boolean {
    const searchIndicators = [
        // Richieste dirette
        'cerca', 'cercami', 'trova', 'trovami',
        'cerca su internet', 'cerca online', 'cerca sul web',
        'puoi cercare', 'potresti cercare',

        // Domande su informazioni attuali
        'qual è', 'quali sono', 'quanto costa',
        'dove posso', 'come posso',
        'ultimi', 'ultime', 'recenti', 'nuovo', 'nuova', 'nuovi',
        'notizie', 'news', 'aggiornamenti',

        // Informazioni specifiche
        'prezzo di', 'prezzi di', 'costo di',
        'recensioni', 'opinioni su',
        'migliori', 'top', 'classifica',

        // Eventi e date
        'quando è', 'quando sarà', 'data di',
        'oggi', 'domani', 'questa settimana',

        // Luoghi e contatti
        'indirizzo di', 'telefono di', 'orari di',
        'dove si trova', 'come arrivo',

        // Informazioni su persone/aziende
        'chi è', 'cos\'è', 'cosa fa'
    ]

    const lowerMessage = message.toLowerCase()
    return searchIndicators.some(indicator => lowerMessage.includes(indicator))
}

/**
 * Estrae la query di ricerca dal messaggio
 */
export function extractSearchQuery(message: string): string {
    // Rimuovi frasi comuni all'inizio
    let query = message
        .replace(/^(puoi |potresti |)cerca(mi |re | )/i, '')
        .replace(/^(puoi |potresti |)trova(mi |re | )/i, '')
        .replace(/^(dimmi |spiegami )/i, '')
        .replace(/su internet|online|sul web/gi, '')
        .replace(/per favore|per piacere/gi, '')
        .trim()

    // Se la query è troppo lunga, prendi solo le prime parole chiave
    if (query.length > 100) {
        query = query.substring(0, 100)
    }

    return query
}

/**
 * Esegue una ricerca web usando DuckDuckGo (API gratuita senza key)
 */
export async function searchWeb(query: string): Promise<WebSearchResponse> {
    try {
        // Usa DuckDuckGo Instant Answer API (gratuita)
        const encodedQuery = encodeURIComponent(query)
        const response = await fetch(
            `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
            {
                headers: {
                    'User-Agent': 'NUR-EnciclopediaDellaVita/1.0'
                }
            }
        )

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`)
        }

        const data = await response.json()
        const results: SearchResult[] = []

        // Abstract principale
        if (data.Abstract) {
            results.push({
                title: data.Heading || 'Risultato',
                url: data.AbstractURL || '',
                snippet: data.Abstract
            })
        }

        // Related topics
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
            for (const topic of data.RelatedTopics.slice(0, 5)) {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || 'Correlato',
                        url: topic.FirstURL,
                        snippet: topic.Text
                    })
                }
            }
        }

        // Infobox se presente
        if (data.Infobox?.content) {
            const infoItems = data.Infobox.content
                .filter((item: any) => item.label && item.value)
                .map((item: any) => `${item.label}: ${item.value}`)
                .join(', ')

            if (infoItems) {
                results.push({
                    title: 'Informazioni',
                    url: data.AbstractURL || '',
                    snippet: infoItems
                })
            }
        }

        return {
            success: true,
            results
        }

    } catch (error: any) {
        console.error('Web search error:', error)
        return {
            success: false,
            results: [],
            error: error.message
        }
    }
}

/**
 * Formatta i risultati della ricerca per NUR
 */
export function formatSearchResultsForNur(results: SearchResult[]): string {
    if (results.length === 0) {
        return 'Non ho trovato risultati specifici per questa ricerca.'
    }

    let formatted = '**Ecco cosa ho trovato:**\n\n'

    for (const result of results.slice(0, 4)) {
        if (result.snippet) {
            formatted += `${result.snippet}\n\n`
        }
    }

    return formatted.trim()
}

/**
 * Cerca informazioni aggiuntive usando Wikipedia API (per informazioni enciclopediche)
 */
export async function searchWikipedia(query: string): Promise<string | null> {
    try {
        const encodedQuery = encodeURIComponent(query)
        const response = await fetch(
            `https://it.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`,
            {
                headers: {
                    'User-Agent': 'NUR-EnciclopediaDellaVita/1.0'
                }
            }
        )

        if (!response.ok) {
            return null
        }

        const data = await response.json()

        if (data.extract) {
            return data.extract
        }

        return null
    } catch {
        return null
    }
}

/**
 * Cerca informazioni combinate da più fonti
 */
export async function searchAllSources(query: string): Promise<string> {
    const [duckduckgo, wikipedia] = await Promise.all([
        searchWeb(query),
        searchWikipedia(query)
    ])

    let combinedResults = ''

    // Priorità a Wikipedia per definizioni
    if (wikipedia) {
        combinedResults += wikipedia + '\n\n'
    }

    // Aggiungi risultati DuckDuckGo
    if (duckduckgo.success && duckduckgo.results.length > 0) {
        const formatted = formatSearchResultsForNur(duckduckgo.results)
        if (!wikipedia || formatted.length > 50) {
            combinedResults += formatted
        }
    }

    if (!combinedResults.trim()) {
        return 'Non sono riuscita a trovare informazioni specifiche su questo argomento.'
    }

    return combinedResults.trim()
}
