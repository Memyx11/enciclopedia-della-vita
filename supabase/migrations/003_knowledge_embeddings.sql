-- ============================================
-- NUR KNOWLEDGE BASE - pgvector per embeddings
-- ============================================

-- Abilita estensione pgvector (se non già abilitata)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabella per i chunks di conoscenza con embeddings
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contenuto
    content TEXT NOT NULL,

    -- Embedding (1536 dimensioni per OpenAI, 384 per MiniLM)
    -- Usiamo 384 per sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
    embedding vector(384),

    -- Metadata
    source_file TEXT NOT NULL,           -- Nome file originale
    level TEXT NOT NULL,                  -- L0-Fondamento, L1-Saggezza, etc.
    priority INTEGER DEFAULT 50,          -- 0-100, più alto = più importante
    chunk_index INTEGER DEFAULT 0,        -- Posizione nel documento
    total_chunks INTEGER DEFAULT 1,       -- Totale chunks del documento

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indici per ricerca
    CONSTRAINT valid_level CHECK (level IN (
        'L0-Fondamento', 'L1-Saggezza', 'L2-Salute', 'L3-Mente',
        'L4-Soldi', 'L5-Relazioni', 'L6-Legge', 'L7-Mondo'
    ))
);

-- Indice per ricerca vettoriale (IVFFlat per performance)
-- Nota: richiede almeno 100 righe per funzionare bene
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
ON knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Indice per filtro per livello
CREATE INDEX IF NOT EXISTS knowledge_chunks_level_idx ON knowledge_chunks(level);

-- Indice per priorità
CREATE INDEX IF NOT EXISTS knowledge_chunks_priority_idx ON knowledge_chunks(priority DESC);

-- Funzione per ricerca semantica
CREATE OR REPLACE FUNCTION search_knowledge(
    query_embedding vector(384),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_level TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    source_file TEXT,
    level TEXT,
    priority INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.source_file,
        kc.level,
        kc.priority,
        1 - (kc.embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks kc
    WHERE
        (filter_level IS NULL OR kc.level = filter_level)
        AND 1 - (kc.embedding <=> query_embedding) > match_threshold
    ORDER BY
        kc.priority DESC,
        kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Tabella per tracciare file processati
CREATE TABLE IF NOT EXISTS processed_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT UNIQUE NOT NULL,
    file_hash TEXT,                       -- Hash MD5 per verificare modifiche
    chunks_count INTEGER DEFAULT 0,
    level TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commenti
COMMENT ON TABLE knowledge_chunks IS 'Knowledge base di NUR con embeddings vettoriali';
COMMENT ON COLUMN knowledge_chunks.embedding IS 'Embedding 384-dim da paraphrase-multilingual-MiniLM-L12-v2';
COMMENT ON FUNCTION search_knowledge IS 'Ricerca semantica nella knowledge base di NUR';
