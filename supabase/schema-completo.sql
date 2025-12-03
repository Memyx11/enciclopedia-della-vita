-- =============================================
-- ENCICLOPEDIA DELLA VITA - SCHEMA DATABASE COMPLETO
-- Sistema NUR con Memoria, Giornale, Crescita
-- Versione: 3.0
-- Data: 3 Dicembre 2025
-- =============================================

-- =============================================
-- PULIZIA (opzionale - decommentare per reset)
-- =============================================
-- DROP TABLE IF EXISTS journal_entries CASCADE;
-- DROP TABLE IF EXISTS nur_memory CASCADE;
-- DROP TABLE IF EXISTS user_memory CASCADE;
-- DROP TABLE IF EXISTS nur_growth CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS ai_insights CASCADE;
-- DROP TABLE IF EXISTS solutions CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;
-- DROP TABLE IF EXISTS life_areas CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS encyclopedia_content CASCADE;

-- =============================================
-- 1. PROFILES (Profilo utente - sync con Clerk)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    age_range TEXT CHECK (age_range IN ('14-18', '19-25', '26-40', '41-60', '60+')),
    personality_type TEXT, -- introvert/extrovert, etc
    communication_style TEXT CHECK (communication_style IN ('direct', 'gentle', 'humorous', 'formal')),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. LIFE AREAS (10 Aree della Vita)
-- =============================================
CREATE TABLE IF NOT EXISTS life_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    area_type TEXT NOT NULL CHECK (area_type IN (
        'salute', 'soldi', 'relazioni', 'lavoro', 'hobby',
        'crescita', 'casa', 'sociale', 'spirituale', 'futuro'
    )),
    -- Stato attuale
    current_state JSONB DEFAULT '{}'::jsonb,
    -- Obiettivo desiderato
    goal_state JSONB DEFAULT '{}'::jsonb,
    -- Progressi
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    -- Priorità per l'utente (1-10)
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    -- Ultimo aggiornamento significativo
    last_significant_update TIMESTAMPTZ,
    -- Tasks attivi per questa area
    active_tasks JSONB DEFAULT '[]'::jsonb,
    -- Note personali
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clerk_user_id, area_type)
);

-- =============================================
-- 3. USER MEMORY (Memoria di NUR sull'utente)
-- Cosa NUR sa e ricorda dell'utente
-- =============================================
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    -- Tipo di memoria
    memory_type TEXT NOT NULL CHECK (memory_type IN (
        'fact',           -- Fatto concreto (es. "ha 2 figli")
        'preference',     -- Preferenza (es. "odia svegliarsi presto")
        'goal',           -- Obiettivo dichiarato
        'struggle',       -- Difficoltà/problema ricorrente
        'achievement',    -- Traguardo raggiunto
        'pattern',        -- Pattern comportamentale notato
        'emotion',        -- Stato emotivo significativo
        'relationship',   -- Info su relazioni importanti
        'trigger',        -- Cosa lo motiva/demotiva
        'value'           -- Valore importante per lui/lei
    )),
    -- Contenuto della memoria
    content TEXT NOT NULL,
    -- Area della vita correlata (opzionale)
    area_related TEXT CHECK (area_related IN (
        'salute', 'soldi', 'relazioni', 'lavoro', 'hobby',
        'crescita', 'casa', 'sociale', 'spirituale', 'futuro', NULL
    )),
    -- Importanza (1-10) - quanto è importante ricordarlo
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    -- Confidenza (1-10) - quanto NUR è sicura di questa info
    confidence INTEGER DEFAULT 7 CHECK (confidence >= 1 AND confidence <= 10),
    -- Da quale conversazione deriva
    source_conversation_id UUID,
    -- Se è ancora attuale
    is_current BOOLEAN DEFAULT TRUE,
    -- Quante volte è stata confermata/menzionata
    mention_count INTEGER DEFAULT 1,
    -- Ultima volta che è stata rilevante
    last_relevant_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. NUR MEMORY (Memoria personale di NUR)
-- Come NUR evolve e cosa impara globalmente
-- =============================================
CREATE TABLE IF NOT EXISTS nur_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Tipo di apprendimento
    learning_type TEXT NOT NULL CHECK (learning_type IN (
        'conversation_pattern',  -- Pattern conversazionali efficaci
        'topic_expertise',       -- Argomenti in cui NUR è diventata esperta
        'user_archetype',        -- Archetipi di utente identificati
        'successful_approach',   -- Approcci che hanno funzionato
        'failed_approach',       -- Approcci da evitare
        'cultural_insight',      -- Insight culturali/contestuali
        'feedback_received'      -- Feedback espliciti ricevuti
    )),
    -- Contenuto dell'apprendimento
    content TEXT NOT NULL,
    -- Contesto in cui si applica
    context TEXT,
    -- Quante volte confermato
    confirmation_count INTEGER DEFAULT 1,
    -- Efficacia misurata (se applicabile)
    effectiveness_score DECIMAL(3,2) CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
    -- Attivo
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. CONVERSATIONS (Conversazioni con NUR)
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    -- Titolo auto-generato
    title TEXT,
    -- Topic principale
    main_topic TEXT,
    -- Area correlata
    area_related TEXT CHECK (area_related IN (
        'salute', 'soldi', 'relazioni', 'lavoro', 'hobby',
        'crescita', 'casa', 'sociale', 'spirituale', 'futuro', 'generale', NULL
    )),
    -- Sentiment generale della conversazione
    overall_sentiment TEXT CHECK (overall_sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    -- Se NUR ha estratto insights
    insights_extracted BOOLEAN DEFAULT FALSE,
    -- Stato
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    -- Conteggio messaggi
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. MESSAGES (Messaggi nelle conversazioni)
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    -- Ruolo
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    -- Contenuto
    content TEXT NOT NULL,
    -- Sentiment del messaggio (per messaggi utente)
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    -- Emozione dominante rilevata
    detected_emotion TEXT,
    -- Se contiene una richiesta di azione
    contains_action_request BOOLEAN DEFAULT FALSE,
    -- Se NUR ha proposto una soluzione
    contains_solution BOOLEAN DEFAULT FALSE,
    -- Area correlata
    area_type TEXT DEFAULT 'generale',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. SOLUTIONS (Piani e soluzioni proposti)
-- =============================================
CREATE TABLE IF NOT EXISTS solutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    conversation_id UUID REFERENCES conversations(id),
    -- Dettagli soluzione
    title TEXT NOT NULL,
    description TEXT,
    -- Steps strutturati
    steps JSONB DEFAULT '[]'::jsonb,
    -- Stato
    status TEXT DEFAULT 'proposta' CHECK (status IN ('proposta', 'accettata', 'rifiutata', 'in_corso', 'completata', 'abbandonata')),
    -- Area correlata
    area_type TEXT,
    -- Progresso (0-100)
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    -- Deadline (opzionale)
    deadline TIMESTAMPTZ,
    -- Motivazione del rifiuto/abbandono
    rejection_reason TEXT,
    -- Feedback finale
    completion_feedback TEXT,
    -- Rating finale (1-5)
    final_rating INTEGER CHECK (final_rating >= 1 AND final_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. AI INSIGHTS (Insight estratti da NUR)
-- =============================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    -- Tipo di insight
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'priority',       -- Area che richiede attenzione
        'progress',       -- Progressi notati
        'suggestion',     -- Suggerimento proattivo
        'alert',          -- Allarme (es. stress alto)
        'pattern',        -- Pattern identificato
        'celebration',    -- Vittoria da celebrare
        'reminder',       -- Promemoria contestuale
        'reflection'      -- Spunto di riflessione
    )),
    -- Contenuto
    content TEXT NOT NULL,
    -- Titolo breve
    title TEXT,
    -- Area correlata
    area_related TEXT,
    -- Priorità (1-10)
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    -- Se mostrato all'utente
    is_shown BOOLEAN DEFAULT FALSE,
    -- Se letto
    is_read BOOLEAN DEFAULT FALSE,
    -- Se l'utente ha agito
    action_taken BOOLEAN DEFAULT FALSE,
    -- Valido fino a
    valid_until TIMESTAMPTZ,
    -- Conversazione sorgente
    source_conversation_id UUID REFERENCES conversations(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. JOURNAL ENTRIES (Il Giornale Personalizzato)
-- Feed personalizzato per ogni utente
-- =============================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    -- Tipo di entry
    entry_type TEXT NOT NULL CHECK (entry_type IN (
        'nur_message',        -- Messaggio diretto da NUR
        'insight',            -- Insight generato
        'achievement',        -- Traguardo raggiunto
        'suggestion',         -- Suggerimento del giorno
        'reminder',           -- Promemoria
        'article',            -- Articolo consigliato
        'reflection_prompt',  -- Spunto di riflessione
        'weekly_summary',     -- Riepilogo settimanale
        'progress_update',    -- Aggiornamento progressi
        'challenge',          -- Sfida proposta
        'quote'               -- Citazione motivazionale
    )),
    -- Contenuto principale
    content TEXT NOT NULL,
    -- Titolo
    title TEXT,
    -- Metadata aggiuntivi (es. link articolo, dati grafico)
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Area correlata
    area_related TEXT,
    -- Priorità nel feed (più alto = più visibile)
    feed_priority INTEGER DEFAULT 5 CHECK (feed_priority >= 1 AND feed_priority <= 10),
    -- Se è stato visto
    is_seen BOOLEAN DEFAULT FALSE,
    -- Se l'utente ha interagito
    user_interacted BOOLEAN DEFAULT FALSE,
    -- Tipo di interazione
    interaction_type TEXT,
    -- Valido da/a (per entry temporizzate)
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    -- Se è pinnato dall'utente
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 10. NUR GROWTH (Sistema di crescita NUR)
-- Traccia come NUR migliora nel tempo
-- =============================================
CREATE TABLE IF NOT EXISTS nur_growth (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Metrica
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'conversations_total',
        'insights_generated',
        'solutions_accepted',
        'solutions_completed',
        'positive_feedback',
        'negative_feedback',
        'returning_users',
        'engagement_score',
        'helpfulness_rating'
    )),
    -- Valore
    value DECIMAL(10,2) NOT NULL,
    -- Periodo (daily, weekly, monthly)
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    -- Data del periodo
    period_date DATE NOT NULL,
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(metric_type, period_type, period_date)
);

-- =============================================
-- 11. ENCYCLOPEDIA CONTENT (Contenuti enciclopedia)
-- =============================================
CREATE TABLE IF NOT EXISTS encyclopedia_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    -- Contenuto completo (Markdown)
    content TEXT NOT NULL,
    -- Riassunto breve
    summary TEXT,
    -- Per quale fascia d'età
    age_range TEXT[],
    -- Tag
    tags TEXT[],
    -- Se generato da AI
    ai_generated BOOLEAN DEFAULT FALSE,
    -- Se revisionato da umano
    human_reviewed BOOLEAN DEFAULT FALSE,
    -- Visualizzazioni
    views INTEGER DEFAULT 0,
    -- Voti positivi
    helpful_votes INTEGER DEFAULT 0,
    -- Tempo lettura stimato (minuti)
    reading_time INTEGER DEFAULT 5,
    -- Pubblicato
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES per Performance
-- =============================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_clerk ON profiles(clerk_user_id);

-- Life Areas
CREATE INDEX IF NOT EXISTS idx_life_areas_clerk ON life_areas(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_life_areas_type ON life_areas(area_type);

-- User Memory
CREATE INDEX IF NOT EXISTS idx_user_memory_clerk ON user_memory(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_type ON user_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memory_area ON user_memory(area_related);
CREATE INDEX IF NOT EXISTS idx_user_memory_importance ON user_memory(clerk_user_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_user_memory_current ON user_memory(clerk_user_id, is_current);

-- NUR Memory
CREATE INDEX IF NOT EXISTS idx_nur_memory_type ON nur_memory(learning_type);
CREATE INDEX IF NOT EXISTS idx_nur_memory_active ON nur_memory(is_active);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_clerk ON conversations(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_date ON conversations(created_at DESC);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_clerk ON messages(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(created_at DESC);

-- Solutions
CREATE INDEX IF NOT EXISTS idx_solutions_clerk ON solutions(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(status);
CREATE INDEX IF NOT EXISTS idx_solutions_conversation ON solutions(conversation_id);

-- AI Insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_clerk ON ai_insights(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_unread ON ai_insights(clerk_user_id, is_read);

-- Journal Entries
CREATE INDEX IF NOT EXISTS idx_journal_clerk ON journal_entries(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_journal_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_unseen ON journal_entries(clerk_user_id, is_seen);
CREATE INDEX IF NOT EXISTS idx_journal_feed ON journal_entries(clerk_user_id, valid_from DESC, feed_priority DESC);

-- Encyclopedia
CREATE INDEX IF NOT EXISTS idx_encyclopedia_slug ON encyclopedia_content(slug);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_category ON encyclopedia_content(category);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_published ON encyclopedia_content(is_published);

-- =============================================
-- TRIGGERS per updated_at automatico
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applica trigger a tutte le tabelle con updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Abilita RLS su tutte le tabelle utente
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti vedono solo i propri dati
-- NOTA: Queste policy richiedono che clerk_user_id sia passato via JWT o context
-- Per ora usiamo anon key quindi le policy sono permissive

CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (true);
CREATE POLICY "Users can view own life_areas" ON life_areas FOR ALL USING (true);
CREATE POLICY "Users can view own user_memory" ON user_memory FOR ALL USING (true);
CREATE POLICY "Users can view own conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Users can view own messages" ON messages FOR ALL USING (true);
CREATE POLICY "Users can view own solutions" ON solutions FOR ALL USING (true);
CREATE POLICY "Users can view own ai_insights" ON ai_insights FOR ALL USING (true);
CREATE POLICY "Users can view own journal" ON journal_entries FOR ALL USING (true);

-- Encyclopedia è pubblica
CREATE POLICY "Encyclopedia is public" ON encyclopedia_content FOR SELECT USING (is_published = true);

-- =============================================
-- FUNZIONI HELPER
-- =============================================

-- Funzione per ottenere il contesto completo di un utente per NUR
CREATE OR REPLACE FUNCTION get_user_context(p_clerk_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'profile', (SELECT row_to_json(p.*) FROM profiles p WHERE p.clerk_user_id = p_clerk_user_id),
        'life_areas', (SELECT jsonb_agg(row_to_json(la.*)) FROM life_areas la WHERE la.clerk_user_id = p_clerk_user_id),
        'recent_memories', (
            SELECT jsonb_agg(row_to_json(um.*))
            FROM (
                SELECT * FROM user_memory
                WHERE clerk_user_id = p_clerk_user_id AND is_current = true
                ORDER BY importance DESC, last_relevant_at DESC
                LIMIT 20
            ) um
        ),
        'active_solutions', (
            SELECT jsonb_agg(row_to_json(s.*))
            FROM solutions s
            WHERE s.clerk_user_id = p_clerk_user_id AND s.status IN ('accettata', 'in_corso')
        ),
        'recent_insights', (
            SELECT jsonb_agg(row_to_json(ai.*))
            FROM (
                SELECT * FROM ai_insights
                WHERE clerk_user_id = p_clerk_user_id AND is_read = false
                ORDER BY priority DESC, created_at DESC
                LIMIT 5
            ) ai
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Funzione per creare entry giornale automatiche
CREATE OR REPLACE FUNCTION create_journal_entry(
    p_clerk_user_id TEXT,
    p_entry_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_area_related TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_priority INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO journal_entries (
        clerk_user_id, entry_type, title, content,
        area_related, metadata, feed_priority
    ) VALUES (
        p_clerk_user_id, p_entry_type, p_title, p_content,
        p_area_related, p_metadata, p_priority
    ) RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DONE! Schema completo per NUR
-- =============================================
