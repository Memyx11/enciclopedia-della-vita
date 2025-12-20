-- ============================================
-- NUR: LIFE RPG - Database Schema v1.0.0
-- ============================================
-- Data: 2025-12-19
-- Descrizione: Schema completo per NUR Life RPG
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (Utenti + Gamification)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,

    -- Dati base
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,

    -- Dati personali
    birth_date DATE,
    city TEXT,
    bio TEXT,

    -- Orari utente
    wake_time TIME DEFAULT '07:00',
    sleep_time TIME DEFAULT '23:00',

    -- Gamification
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    title TEXT DEFAULT 'Nuovo Arrivato',
    streak_days INTEGER DEFAULT 0,
    streak_last_date DATE,
    lives INTEGER DEFAULT 3,
    lives_last_lost TIMESTAMPTZ,

    -- Stato
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0,

    -- NUR Memory (narrativa compatta per il prompt)
    nur_narrative_memory TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LIFE AREAS (10 Aree Vita)
-- ============================================

CREATE TABLE IF NOT EXISTS life_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Identificazione
    slug TEXT NOT NULL, -- finanze, carriera, formazione, salute, spiritualita, relazioni, casa, hobby, esperienze, sociale
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,

    -- Stato
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    has_primary_goal BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(clerk_user_id, slug)
);

-- ============================================
-- GOALS (Obiettivi - 3 tipi)
-- ============================================

CREATE TYPE goal_type AS ENUM ('obiettivo', 'boss', 'sogno');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'failed', 'blocked');

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES life_areas(id) ON DELETE CASCADE,

    -- Dati goal
    title TEXT NOT NULL,
    description TEXT,
    type goal_type NOT NULL DEFAULT 'obiettivo',

    -- Stato
    status goal_status DEFAULT 'active',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_primary BOOLEAN DEFAULT FALSE, -- Goal principale dell'area
    is_blocked BOOLEAN DEFAULT FALSE, -- Bloccato da dipendenze

    -- Catena
    chain_order INTEGER, -- Ordine nella catena (NULL se non in catena)

    -- Gamification
    xp_reward INTEGER DEFAULT 50,

    -- Date
    due_date DATE,
    completed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GOAL DEPENDENCIES (Sistema Catene)
-- ============================================

CREATE TABLE IF NOT EXISTS goal_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    depends_on_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(goal_id, depends_on_goal_id),
    CHECK (goal_id != depends_on_goal_id)
);

-- ============================================
-- TASKS (Task giornalieri)
-- ============================================

CREATE TYPE task_status AS ENUM ('pending', 'completed', 'failed', 'skipped');
CREATE TYPE recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly');

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Collegamento opzionale a goal
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    area_id UUID REFERENCES life_areas(id) ON DELETE SET NULL,

    -- Dati task
    title TEXT NOT NULL,
    description TEXT,

    -- Tipo
    is_boss_task BOOLEAN DEFAULT FALSE, -- Max 1 al giorno
    is_routine BOOLEAN DEFAULT FALSE,

    -- Ricorrenza
    recurrence recurrence_type DEFAULT 'none',
    recurrence_days INTEGER[], -- Per weekly: [1,3,5] = Lun, Mer, Ven

    -- Stato
    status task_status DEFAULT 'pending',
    scheduled_date DATE DEFAULT CURRENT_DATE,

    -- Gamification
    xp_reward INTEGER DEFAULT 10,

    -- Timestamps
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROUTINE ITEMS (Template routine)
-- ============================================

CREATE TABLE IF NOT EXISTS routine_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Dati routine
    title TEXT NOT NULL,
    description TEXT,

    -- Scheduling
    time_of_day TIME, -- Ora suggerita
    duration_minutes INTEGER DEFAULT 30,
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Lun, 7=Dom

    -- Collegamento
    area_id UUID REFERENCES life_areas(id) ON DELETE SET NULL,

    -- Stato
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,

    -- Gamification
    xp_reward INTEGER DEFAULT 15,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SKILLS (Abilità - 5 livelli)
-- ============================================

CREATE TYPE skill_level AS ENUM ('base', 'competente', 'esperto', 'maestro', 'leggenda');

CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Dati skill
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,

    -- Livello
    level skill_level DEFAULT 'base',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100), -- Progresso verso prossimo livello

    -- Collegamento area
    area_id UUID REFERENCES life_areas(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(clerk_user_id, name)
);

-- ============================================
-- MATERIALS (Materiali - 5 rarità)
-- ============================================

CREATE TYPE material_rarity AS ENUM ('comune', 'non_comune', 'raro', 'epico', 'leggendario');

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Dati materiale
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,

    -- Rarità
    rarity material_rarity DEFAULT 'comune',

    -- Quantità (per materiali stackabili)
    quantity INTEGER DEFAULT 1,

    -- Collegamento
    area_id UUID REFERENCES life_areas(id) ON DELETE SET NULL,

    -- Stato
    is_obtained BOOLEAN DEFAULT FALSE,
    obtained_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GOAL_SKILLS (Link Goals → Skills richieste)
-- ============================================

CREATE TABLE IF NOT EXISTS goal_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

    -- Livello minimo richiesto
    required_level skill_level DEFAULT 'base',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(goal_id, skill_id)
);

-- ============================================
-- GOAL_MATERIALS (Link Goals → Materiali richiesti)
-- ============================================

CREATE TABLE IF NOT EXISTS goal_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,

    -- Quantità richiesta
    required_quantity INTEGER DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(goal_id, material_id)
);

-- ============================================
-- NUR MEMORY (Memoria narrativa)
-- ============================================

CREATE TYPE memory_type AS ENUM (
    'fact',           -- Fatto oggettivo sull'utente
    'preference',     -- Preferenza
    'achievement',    -- Risultato raggiunto
    'struggle',       -- Difficoltà/problema
    'insight',        -- Insight emerso
    'relationship',   -- Info su relazioni
    'goal_context',   -- Contesto su obiettivi
    'emotional_state' -- Stato emotivo
);

CREATE TABLE IF NOT EXISTS nur_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Tipo memoria
    type memory_type NOT NULL,

    -- Contenuto (formato narrativo)
    content TEXT NOT NULL,

    -- Contesto
    area_id UUID REFERENCES life_areas(id) ON DELETE SET NULL,
    related_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

    -- Importanza (1-10)
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),

    -- Validità
    is_current BOOLEAN DEFAULT TRUE, -- Se l'info è ancora valida
    superseded_by UUID REFERENCES nur_memory(id), -- Se sostituita da altra memoria

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHAT MESSAGES (Storico chat)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Conversazione
    conversation_id UUID NOT NULL, -- Raggruppa messaggi della stessa sessione

    -- Messaggio
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,

    -- Metadata
    tokens_used INTEGER,
    area_context TEXT, -- Area di cui si parlava

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG (Log attività per XP/statistiche)
-- ============================================

CREATE TYPE activity_type AS ENUM (
    'task_completed',
    'goal_completed',
    'boss_task_completed',
    'routine_completed',
    'skill_leveled',
    'material_obtained',
    'achievement_unlocked',
    'test_passed',
    'test_failed',
    'streak_milestone',
    'level_up',
    'xp_gained'
);

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Tipo attività
    activity_type activity_type NOT NULL,

    -- Dettagli
    description TEXT,
    xp_gained INTEGER DEFAULT 0,

    -- Riferimenti opzionali
    related_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    related_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    related_area_id UUID REFERENCES life_areas(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACHIEVEMENTS (Achievement sbloccati)
-- ============================================

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Dati achievement
    slug TEXT NOT NULL, -- Identificatore unico (es: 'first_task', 'week_streak')
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,

    -- Gamification
    xp_reward INTEGER DEFAULT 100,

    -- Timestamps
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(clerk_user_id, slug)
);

-- ============================================
-- CURRENT ACTIVITIES (Timer attività in corso)
-- ============================================

CREATE TABLE IF NOT EXISTS current_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Attività
    title TEXT NOT NULL,

    -- Collegamento
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    routine_item_id UUID REFERENCES routine_items(id) ON DELETE CASCADE,

    -- Timer
    started_at TIMESTAMPTZ DEFAULT NOW(),
    planned_duration_minutes INTEGER,

    -- Stato
    is_active BOOLEAN DEFAULT TRUE,
    ended_at TIMESTAMPTZ,

    -- Solo una attività attiva per utente
    UNIQUE(clerk_user_id, is_active) -- Partial unique handled by trigger
);

-- ============================================
-- USER TESTS (Sistema Prove)
-- ============================================

CREATE TYPE test_type AS ENUM ('mental', 'physical');
CREATE TYPE test_status AS ENUM ('pending', 'passed', 'failed', 'expired');

CREATE TABLE IF NOT EXISTS user_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,

    -- Dati prova
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Tipo
    type test_type NOT NULL,

    -- Contesto (cosa sta verificando)
    verifies TEXT NOT NULL, -- Es: "capacità di concentrazione", "disciplina mattutina"

    -- Collegamento opzionale
    related_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    related_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,

    -- Stato
    status test_status DEFAULT 'pending',

    -- Risultato
    user_response TEXT, -- Risposta dell'utente (per physical)
    nur_evaluation TEXT, -- Valutazione di NUR

    -- Date
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Gamification
    xp_reward INTEGER DEFAULT 25,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Profiles
CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);

-- Life Areas
CREATE INDEX idx_life_areas_clerk_user_id ON life_areas(clerk_user_id);
CREATE INDEX idx_life_areas_slug ON life_areas(slug);

-- Goals
CREATE INDEX idx_goals_clerk_user_id ON goals(clerk_user_id);
CREATE INDEX idx_goals_area_id ON goals(area_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_type ON goals(type);
CREATE INDEX idx_goals_is_primary ON goals(is_primary) WHERE is_primary = TRUE;

-- Tasks
CREATE INDEX idx_tasks_clerk_user_id ON tasks(clerk_user_id);
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_is_boss ON tasks(is_boss_task) WHERE is_boss_task = TRUE;

-- Skills
CREATE INDEX idx_skills_clerk_user_id ON skills(clerk_user_id);
CREATE INDEX idx_skills_area_id ON skills(area_id);

-- Materials
CREATE INDEX idx_materials_clerk_user_id ON materials(clerk_user_id);
CREATE INDEX idx_materials_rarity ON materials(rarity);

-- NUR Memory
CREATE INDEX idx_nur_memory_clerk_user_id ON nur_memory(clerk_user_id);
CREATE INDEX idx_nur_memory_type ON nur_memory(type);
CREATE INDEX idx_nur_memory_importance ON nur_memory(importance);
CREATE INDEX idx_nur_memory_is_current ON nur_memory(is_current) WHERE is_current = TRUE;

-- Chat Messages
CREATE INDEX idx_chat_messages_clerk_user_id ON chat_messages(clerk_user_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Activity Log
CREATE INDEX idx_activity_log_clerk_user_id ON activity_log(clerk_user_id);
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- User Tests
CREATE INDEX idx_user_tests_clerk_user_id ON user_tests(clerk_user_id);
CREATE INDEX idx_user_tests_status ON user_tests(status);
CREATE INDEX idx_user_tests_type ON user_tests(type);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Funzione per calcolare il livello da XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Formula: level = floor((xp/100)^(2/3))
    -- Inverso di: xp_required = 100 * level^1.5
    RETURN GREATEST(1, FLOOR(POWER(xp_amount::float / 100, 2.0/3.0))::INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funzione per ottenere il titolo dal livello
CREATE OR REPLACE FUNCTION get_title_for_level(lvl INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN lvl <= 5 THEN 'Nuovo Arrivato'
        WHEN lvl <= 10 THEN 'Principiante'
        WHEN lvl <= 15 THEN 'Apprendista'
        WHEN lvl <= 20 THEN 'Praticante'
        WHEN lvl <= 25 THEN 'Competente'
        WHEN lvl <= 30 THEN 'Guerriero'
        WHEN lvl <= 35 THEN 'Veterano'
        WHEN lvl <= 40 THEN 'Maestro'
        ELSE 'Leggenda'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funzione per aggiungere XP e aggiornare livello
CREATE OR REPLACE FUNCTION add_xp(
    p_clerk_user_id TEXT,
    p_xp_amount INTEGER,
    p_activity_type activity_type DEFAULT 'xp_gained',
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, new_title TEXT, leveled_up BOOLEAN) AS $$
DECLARE
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_new_xp INTEGER;
    v_new_title TEXT;
BEGIN
    -- Get current level
    SELECT level INTO v_old_level FROM profiles WHERE clerk_user_id = p_clerk_user_id;

    -- Update XP
    UPDATE profiles
    SET xp = xp + p_xp_amount
    WHERE clerk_user_id = p_clerk_user_id
    RETURNING xp INTO v_new_xp;

    -- Calculate new level
    v_new_level := calculate_level(v_new_xp);
    v_new_title := get_title_for_level(v_new_level);

    -- Update level if changed
    IF v_new_level > v_old_level THEN
        UPDATE profiles
        SET level = v_new_level, title = v_new_title
        WHERE clerk_user_id = p_clerk_user_id;

        -- Log level up
        INSERT INTO activity_log (clerk_user_id, activity_type, description, xp_gained)
        VALUES (p_clerk_user_id, 'level_up', 'Livello ' || v_new_level || ': ' || v_new_title, 0);
    END IF;

    -- Log XP gain
    INSERT INTO activity_log (clerk_user_id, activity_type, description, xp_gained)
    VALUES (p_clerk_user_id, p_activity_type, COALESCE(p_description, 'XP guadagnati'), p_xp_amount);

    RETURN QUERY SELECT v_new_xp, v_new_level, v_new_title, (v_new_level > v_old_level);
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare lo streak
CREATE OR REPLACE FUNCTION update_streak(p_clerk_user_id TEXT)
RETURNS TABLE(new_streak INTEGER, streak_broken BOOLEAN) AS $$
DECLARE
    v_last_date DATE;
    v_current_streak INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT streak_last_date, streak_days INTO v_last_date, v_current_streak
    FROM profiles WHERE clerk_user_id = p_clerk_user_id;

    IF v_last_date IS NULL OR v_last_date < v_today - INTERVAL '1 day' THEN
        -- Streak broken or first time
        UPDATE profiles
        SET streak_days = 1, streak_last_date = v_today
        WHERE clerk_user_id = p_clerk_user_id;
        RETURN QUERY SELECT 1, (v_last_date IS NOT NULL AND v_last_date < v_today - INTERVAL '1 day');
    ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
        -- Continue streak
        UPDATE profiles
        SET streak_days = streak_days + 1, streak_last_date = v_today
        WHERE clerk_user_id = p_clerk_user_id
        RETURNING streak_days INTO v_current_streak;
        RETURN QUERY SELECT v_current_streak, FALSE;
    ELSE
        -- Same day, no change
        RETURN QUERY SELECT v_current_streak, FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Funzione per verificare dipendenze goal
CREATE OR REPLACE FUNCTION check_goal_dependencies(p_goal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_blocked BOOLEAN := FALSE;
BEGIN
    -- Check if any dependency is not completed
    SELECT EXISTS (
        SELECT 1 FROM goal_dependencies gd
        JOIN goals g ON g.id = gd.depends_on_goal_id
        WHERE gd.goal_id = p_goal_id
        AND g.status != 'completed'
    ) INTO v_blocked;

    -- Update goal blocked status
    UPDATE goals SET is_blocked = v_blocked WHERE id = p_goal_id;

    RETURN NOT v_blocked;
END;
$$ LANGUAGE plpgsql;

-- Funzione per completare un goal e sbloccare dipendenti
CREATE OR REPLACE FUNCTION complete_goal(p_goal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_clerk_user_id TEXT;
    v_xp_reward INTEGER;
    v_area_id UUID;
BEGIN
    -- Get goal info
    SELECT clerk_user_id, xp_reward, area_id INTO v_clerk_user_id, v_xp_reward, v_area_id
    FROM goals WHERE id = p_goal_id;

    -- Mark as completed
    UPDATE goals
    SET status = 'completed', progress = 100, completed_at = NOW()
    WHERE id = p_goal_id;

    -- Award XP
    PERFORM add_xp(v_clerk_user_id, v_xp_reward, 'goal_completed', 'Goal completato');

    -- Unblock dependent goals
    UPDATE goals g
    SET is_blocked = FALSE
    WHERE g.id IN (
        SELECT gd.goal_id FROM goal_dependencies gd WHERE gd.depends_on_goal_id = p_goal_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM goal_dependencies gd2
        JOIN goals g2 ON g2.id = gd2.depends_on_goal_id
        WHERE gd2.goal_id = g.id AND g2.status != 'completed'
    );

    -- Update area progress
    PERFORM update_area_progress(v_area_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare progresso area
CREATE OR REPLACE FUNCTION update_area_progress(p_area_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_progress INTEGER;
BEGIN
    SELECT COALESCE(
        ROUND(
            (COUNT(*) FILTER (WHERE status = 'completed')::FLOAT /
             NULLIF(COUNT(*), 0) * 100)
        )::INTEGER, 0
    ) INTO v_progress
    FROM goals WHERE area_id = p_area_id;

    UPDATE life_areas SET progress = v_progress WHERE id = p_area_id;

    RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_life_areas_updated_at BEFORE UPDATE ON life_areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_items_updated_at BEFORE UPDATE ON routine_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nur_memory_updated_at BEFORE UPDATE ON nur_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tests_updated_at BEFORE UPDATE ON user_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE nur_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tests ENABLE ROW LEVEL SECURITY;

-- Profiles: utente può vedere/modificare solo il proprio
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on profiles" ON profiles
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Life Areas
CREATE POLICY "Users can view own areas" ON life_areas
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own areas" ON life_areas
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on life_areas" ON life_areas
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Goals
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own goals" ON goals
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on goals" ON goals
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Tasks
CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own tasks" ON tasks
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on tasks" ON tasks
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Routine Items
CREATE POLICY "Users can view own routine" ON routine_items
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own routine" ON routine_items
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on routine_items" ON routine_items
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Skills
CREATE POLICY "Users can view own skills" ON skills
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own skills" ON skills
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on skills" ON skills
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Materials
CREATE POLICY "Users can view own materials" ON materials
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own materials" ON materials
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on materials" ON materials
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- NUR Memory
CREATE POLICY "Users can view own memory" ON nur_memory
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own memory" ON nur_memory
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on nur_memory" ON nur_memory
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Chat Messages
CREATE POLICY "Users can view own messages" ON chat_messages
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can insert own messages" ON chat_messages
    FOR INSERT WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on chat_messages" ON chat_messages
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Activity Log
CREATE POLICY "Users can view own activity" ON activity_log
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on activity_log" ON activity_log
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Achievements
CREATE POLICY "Users can view own achievements" ON achievements
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on achievements" ON achievements
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Current Activities
CREATE POLICY "Users can view own current activities" ON current_activities
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own current activities" ON current_activities
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on current_activities" ON current_activities
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- User Tests
CREATE POLICY "Users can view own tests" ON user_tests
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can modify own tests" ON user_tests
    FOR ALL USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Service role can do anything on user_tests" ON user_tests
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Goal Dependencies (based on goal ownership)
CREATE POLICY "Users can view own goal dependencies" ON goal_dependencies
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_id
                AND clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    );
CREATE POLICY "Users can modify own goal dependencies" ON goal_dependencies
    FOR ALL USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_id
                AND clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    );
CREATE POLICY "Service role can do anything on goal_dependencies" ON goal_dependencies
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Goal Skills (based on goal ownership)
CREATE POLICY "Users can view own goal skills" ON goal_skills
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_id
                AND clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    );
CREATE POLICY "Users can modify own goal skills" ON goal_skills
    FOR ALL USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_id
                AND clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    );
CREATE POLICY "Service role can do anything on goal_skills" ON goal_skills
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Goal Materials (based on goal ownership)
CREATE POLICY "Users can view own goal materials" ON goal_materials
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_id
                AND clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    );
CREATE POLICY "Users can modify own goal materials" ON goal_materials
    FOR ALL USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_id
                AND clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    );
CREATE POLICY "Service role can do anything on goal_materials" ON goal_materials
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- ============================================
-- SEED DATA: Achievement Definitions (reference)
-- ============================================

COMMENT ON TABLE achievements IS 'Achievement slugs disponibili:
- first_task: Primo task completato
- first_goal: Primo obiettivo completato
- first_boss: Primo boss sconfitto
- first_dream: Primo sogno realizzato
- week_streak: 7 giorni di fila
- month_streak: 30 giorni di fila
- early_bird: Task completato prima delle 8
- night_owl: Task completato dopo le 22
- multitasker: 5 task in un giorno
- focused: 3 ore di attività consecutiva
- skill_master: Skill a livello leggenda
- collector: 10 materiali ottenuti
- explorer: Tutte le 10 aree con almeno 1 goal
- champion: Livello 20 raggiunto
- legend: Livello 40 raggiunto
';
