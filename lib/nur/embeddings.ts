/**
 * NUR Embeddings - Modulo per generazione embeddings
 *
 * NOTA: La ricerca semantica con embeddings richiede un servizio esterno.
 * Per ora questo modulo ritorna sempre null e il sistema usa
 * la ricerca full-text come fallback.
 *
 * In futuro si può:
 * 1. Usare Supabase Edge Function con ONNX
 * 2. Usare un servizio di embeddings esterno (OpenAI, Cohere, etc.)
 * 3. Usare @huggingface/transformers quando stabile per serverless
 */

/**
 * Genera embedding per un singolo testo
 *
 * @returns null - Gli embeddings JS non sono disponibili in questo ambiente.
 *          Il sistema userà automaticamente la ricerca full-text.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    // Embeddings non disponibili - il sistema usa ricerca testuale
    console.log('[NUR Embeddings] Semantic embeddings not available, using text search fallback')
    return null
}

/**
 * Genera embeddings per più testi in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    return texts.map(() => null)
}

/**
 * Pre-carica il modello (no-op per ora)
 */
export async function preloadEmbeddingModel(): Promise<boolean> {
    return false
}

/**
 * Controlla se gli embeddings sono disponibili
 */
export function isEmbeddingAvailable(): boolean {
    return false
}
