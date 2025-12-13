-- =============================================
-- NUR - SISTEMA GIOCO DELLA VITA
-- Migrazione per aggiungere XP, Livelli, Streak, Vite
-- Data: 11 Dicembre 2025
-- =============================================

-- =============================================
-- 1. ESTENDI PROFILES CON STATS DI GIOCO
-- =============================================

-- Aggiungi colonne di gioco a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lives INTEGER DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_lives INTEGER DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'dormiente';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_bonus DECIMAL(3,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_freeze_available BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS game_over BOOLEAN DEFAULT FALSE;

-- =============================================
-- 2. TASK MATERIALS (Materiali per le Task)
-- =============================================

CREATE TABLE IF NOT EXISTS task_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    description TEXT,
    material_type TEXT NOT NULL CHECK (material_type IN (
        'document', 'link', 'video', 'checklist', 'script', 'template', 'note'
    )),

    -- Contenuto o URL
    content TEXT,
    url TEXT,
    icon TEXT DEFAULT '📄',

    -- Ordinamento
    sort_order INTEGER DEFAULT 0,

    -- Se creato da NUR o dall'utente
    created_by TEXT DEFAULT 'nur' CHECK (created_by IN ('nur', 'user')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_materials_objective ON task_materials(objective_id);
CREATE INDEX IF NOT EXISTS idx_task_materials_user ON task_materials(clerk_user_id);

-- =============================================
-- 3. TASK NOTES (Note per le Task)
-- =============================================

CREATE TABLE IF NOT EXISTS task_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_notes_objective ON task_notes(objective_id);

-- =============================================
-- 4. TASK STATS (Statistiche Task)
-- =============================================

CREATE TABLE IF NOT EXISTS task_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,

    -- Statistiche
    stat_name TEXT NOT NULL,
    stat_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    stat_target DECIMAL(10,2),
    stat_unit TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(objective_id, stat_name)
);

CREATE INDEX IF NOT EXISTS idx_task_stats_objective ON task_stats(objective_id);

-- =============================================
-- 5. XP HISTORY (Storico XP guadagnati)
-- =============================================

CREATE TABLE IF NOT EXISTS xp_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,

    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,

    -- Riferimenti opzionali
    objective_id UUID REFERENCES objectives(id) ON DELETE SET NULL,

    -- Moltiplicatori applicati
    streak_multiplier DECIMAL(3,2) DEFAULT 1.0,
    rank_multiplier DECIMAL(3,2) DEFAULT 1.0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_date ON xp_history(created_at DESC);

-- =============================================
-- 6. STREAK HISTORY (Storico Streak)
-- =============================================

CREATE TABLE IF NOT EXISTS streak_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE,
    max_streak INTEGER NOT NULL,
    reason_ended TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streak_history_user ON streak_history(clerk_user_id);

-- =============================================
-- 7. VERIFICATIONS (Verifiche NUR)
-- =============================================

CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,

    question TEXT NOT NULL,
    answer TEXT,

    result TEXT CHECK (result IN ('passed', 'failed', 'suspicious', 'pending')),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_objective ON verifications(objective_id);

-- =============================================
-- 8. ESTENDI OBJECTIVES CON CAMPI GIOCO
-- =============================================

-- Aggiungi campi per il sistema di gioco
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'media'
    CHECK (difficulty IN ('facile', 'media', 'difficile', 'epica', 'leggendaria'));
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 60;
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER;
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS verification_passed BOOLEAN;

-- =============================================
-- 9. RLS POLICIES
-- =============================================

ALTER TABLE task_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Policies permissive (da restringere in produzione)
CREATE POLICY "task_materials_policy" ON task_materials FOR ALL USING (true);
CREATE POLICY "task_notes_policy" ON task_notes FOR ALL USING (true);
CREATE POLICY "task_stats_policy" ON task_stats FOR ALL USING (true);
CREATE POLICY "xp_history_policy" ON xp_history FOR ALL USING (true);
CREATE POLICY "streak_history_policy" ON streak_history FOR ALL USING (true);
CREATE POLICY "verifications_policy" ON verifications FOR ALL USING (true);

-- =============================================
-- 10. FUNZIONI HELPER PER IL GIOCO
-- =============================================

-- Calcola XP necessari per un livello
CREATE OR REPLACE FUNCTION calculate_xp_for_level(p_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(100 * POWER(p_level, 1.5));
END;
$$ LANGUAGE plpgsql;

-- Calcola il rank basato sul livello
CREATE OR REPLACE FUNCTION get_rank_for_level(p_level INTEGER)
RETURNS TABLE(rank_name TEXT, rank_bonus DECIMAL, max_lives INTEGER) AS $$
BEGIN
    IF p_level <= 5 THEN
        RETURN QUERY SELECT 'dormiente'::TEXT, 0.00::DECIMAL, 3;
    ELSIF p_level <= 10 THEN
        RETURN QUERY SELECT 'risvegliato'::TEXT, 0.05::DECIMAL, 3;
    ELSIF p_level <= 20 THEN
        RETURN QUERY SELECT 'cercatore'::TEXT, 0.10::DECIMAL, 4;
    ELSIF p_level <= 30 THEN
        RETURN QUERY SELECT 'apprendista'::TEXT, 0.15::DECIMAL, 4;
    ELSIF p_level <= 40 THEN
        RETURN QUERY SELECT 'praticante'::TEXT, 0.20::DECIMAL, 4;
    ELSIF p_level <= 55 THEN
        RETURN QUERY SELECT 'esperto'::TEXT, 0.25::DECIMAL, 5;
    ELSIF p_level <= 70 THEN
        RETURN QUERY SELECT 'maestro'::TEXT, 0.30::DECIMAL, 5;
    ELSIF p_level <= 85 THEN
        RETURN QUERY SELECT 'saggio'::TEXT, 0.40::DECIMAL, 5;
    ELSE
        RETURN QUERY SELECT 'trasceso'::TEXT, 0.50::DECIMAL, 6;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aggiungi XP a un utente
CREATE OR REPLACE FUNCTION add_xp(
    p_clerk_user_id TEXT,
    p_amount INTEGER,
    p_reason TEXT,
    p_objective_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_final_amount INTEGER;
    v_streak_mult DECIMAL;
    v_rank_mult DECIMAL;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_leveled_up BOOLEAN := FALSE;
    v_rank_info RECORD;
BEGIN
    -- Carica profilo
    SELECT * INTO v_profile FROM profiles WHERE clerk_user_id = p_clerk_user_id;

    IF v_profile.game_over THEN
        RETURN jsonb_build_object('success', false, 'error', 'Game Over - XP congelati');
    END IF;

    -- Calcola moltiplicatori
    v_streak_mult := CASE
        WHEN v_profile.streak >= 30 THEN 2.0
        WHEN v_profile.streak >= 14 THEN 1.5
        WHEN v_profile.streak >= 7 THEN 1.25
        WHEN v_profile.streak >= 3 THEN 1.1
        ELSE 1.0
    END;

    v_rank_mult := 1.0 + COALESCE(v_profile.rank_bonus, 0);

    -- Calcola XP finale
    v_final_amount := FLOOR(p_amount * v_streak_mult * v_rank_mult);
    v_new_xp := v_profile.xp + v_final_amount;
    v_new_level := v_profile.level;

    -- Controlla level up
    WHILE v_new_xp >= calculate_xp_for_level(v_new_level) LOOP
        v_new_xp := v_new_xp - calculate_xp_for_level(v_new_level);
        v_new_level := v_new_level + 1;
        v_leveled_up := TRUE;
    END LOOP;

    -- Aggiorna rank se necessario
    SELECT * INTO v_rank_info FROM get_rank_for_level(v_new_level);

    -- Aggiorna profilo
    UPDATE profiles SET
        xp = v_new_xp,
        level = v_new_level,
        xp_to_next_level = calculate_xp_for_level(v_new_level),
        rank = v_rank_info.rank_name,
        rank_bonus = v_rank_info.rank_bonus,
        max_lives = v_rank_info.max_lives,
        last_activity_date = CURRENT_DATE
    WHERE clerk_user_id = p_clerk_user_id;

    -- Registra nella history
    INSERT INTO xp_history (clerk_user_id, amount, reason, objective_id, streak_multiplier, rank_multiplier)
    VALUES (p_clerk_user_id, v_final_amount, p_reason, p_objective_id, v_streak_mult, v_rank_mult);

    RETURN jsonb_build_object(
        'success', true,
        'xp_gained', v_final_amount,
        'base_amount', p_amount,
        'streak_multiplier', v_streak_mult,
        'rank_multiplier', v_rank_mult,
        'new_xp', v_new_xp,
        'new_level', v_new_level,
        'leveled_up', v_leveled_up,
        'new_rank', v_rank_info.rank_name
    );
END;
$$ LANGUAGE plpgsql;

-- Aggiorna streak giornaliero
CREATE OR REPLACE FUNCTION update_daily_streak(p_clerk_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_new_streak INTEGER;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE clerk_user_id = p_clerk_user_id;

    IF v_profile.last_activity_date IS NULL THEN
        -- Prima attività
        v_new_streak := 1;
    ELSIF v_profile.last_activity_date = CURRENT_DATE THEN
        -- Già attivo oggi
        RETURN jsonb_build_object('success', true, 'streak', v_profile.streak, 'already_updated', true);
    ELSIF v_profile.last_activity_date = CURRENT_DATE - 1 THEN
        -- Giorno consecutivo
        v_new_streak := v_profile.streak + 1;
    ELSE
        -- Streak interrotto
        IF v_profile.streak > 0 THEN
            -- Salva streak interrotto
            INSERT INTO streak_history (clerk_user_id, start_date, end_date, max_streak, reason_ended)
            VALUES (
                p_clerk_user_id,
                CURRENT_DATE - v_profile.streak,
                v_profile.last_activity_date,
                v_profile.streak,
                'inactivity'
            );
        END IF;
        v_new_streak := 1;
    END IF;

    UPDATE profiles SET
        streak = v_new_streak,
        last_activity_date = CURRENT_DATE
    WHERE clerk_user_id = p_clerk_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'streak', v_new_streak,
        'streak_broken', v_new_streak = 1 AND v_profile.streak > 1
    );
END;
$$ LANGUAGE plpgsql;

-- Rimuovi una vita
CREATE OR REPLACE FUNCTION remove_life(p_clerk_user_id TEXT, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_new_lives INTEGER;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE clerk_user_id = p_clerk_user_id;

    v_new_lives := GREATEST(0, v_profile.lives - 1);

    UPDATE profiles SET
        lives = v_new_lives,
        game_over = (v_new_lives = 0)
    WHERE clerk_user_id = p_clerk_user_id;

    -- Se game over, salva lo streak
    IF v_new_lives = 0 AND v_profile.streak > 0 THEN
        INSERT INTO streak_history (clerk_user_id, start_date, end_date, max_streak, reason_ended)
        VALUES (
            p_clerk_user_id,
            CURRENT_DATE - v_profile.streak,
            CURRENT_DATE,
            v_profile.streak,
            p_reason
        );

        -- Reset streak
        UPDATE profiles SET streak = 0 WHERE clerk_user_id = p_clerk_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'lives_remaining', v_new_lives,
        'game_over', v_new_lives = 0,
        'reason', p_reason
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DONE! Sistema gioco aggiunto
-- =============================================
