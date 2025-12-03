-- ============================================
-- TABELLA MESSAGES - Salva tutte le conversazioni
-- Esegui questo su Supabase SQL Editor
-- ============================================

-- Crea la tabella messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    area_type TEXT DEFAULT 'generale',
    sentiment TEXT DEFAULT 'neutro',
    topics TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indice per velocizzare le query per utente
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- RLS (Row Level Security) - ogni utente vede solo i suoi messaggi
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
CREATE POLICY "Users can insert own messages" ON messages
    FOR INSERT WITH CHECK (true);

-- ============================================
-- TABELLA USER_INSIGHTS - Memoria del bot sull'utente
-- ============================================

CREATE TABLE IF NOT EXISTS user_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern', 'goal', 'struggle', 'value', 'personality', 'preference')),
    content TEXT NOT NULL,
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    source_message_ids UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_user ON user_insights(clerk_user_id);

ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own insights" ON user_insights;
CREATE POLICY "Users can view own insights" ON user_insights
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own insights" ON user_insights;
CREATE POLICY "Users can manage own insights" ON user_insights
    FOR ALL USING (true);

-- ============================================
-- VERIFICA
-- ============================================
SELECT 'Tabelle create con successo!' as status;
