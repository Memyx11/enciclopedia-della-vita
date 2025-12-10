-- ============================================
-- USER STATS TABLE - Gamification System
-- ============================================
-- Tabella per il sistema di gamification
-- Level, XP, Streak, Lives

CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL UNIQUE,

    -- Level & XP
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    total_xp INTEGER NOT NULL DEFAULT 0,

    -- Streak System
    streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    last_activity TIMESTAMPTZ,

    -- Lives System
    lives INTEGER NOT NULL DEFAULT 3,
    lives_lost_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index per query veloci
CREATE INDEX IF NOT EXISTS idx_user_stats_clerk_id ON user_stats(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_level ON user_stats(level DESC);

-- RLS Policies
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
ON user_stats FOR SELECT
USING (true);

CREATE POLICY "Users can insert own stats"
ON user_stats FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own stats"
ON user_stats FOR UPDATE
USING (true);

-- Trigger per auto-update di updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AGGIORNA TABELLA OBJECTIVES
-- ============================================
-- Aggiungi nuove colonne per gamification

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objectives' AND column_name = 'notes'
    ) THEN
        ALTER TABLE objectives ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objectives' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE objectives ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objectives' AND column_name = 'difficulty'
    ) THEN
        ALTER TABLE objectives ADD COLUMN difficulty TEXT DEFAULT 'medium';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objectives' AND column_name = 'xp_reward'
    ) THEN
        ALTER TABLE objectives ADD COLUMN xp_reward INTEGER DEFAULT 60;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objectives' AND column_name = 'estimated_minutes'
    ) THEN
        ALTER TABLE objectives ADD COLUMN estimated_minutes INTEGER DEFAULT 30;
    END IF;
END $$;

-- Aggiorna le task esistenti con valori di default basati su level
UPDATE objectives
SET
    difficulty = CASE
        WHEN level = 'major' THEN 'hard'
        WHEN level = 'sub' THEN 'medium'
        ELSE 'easy'
    END,
    xp_reward = CASE
        WHEN level = 'major' THEN 100
        WHEN level = 'sub' THEN 60
        ELSE 30
    END,
    estimated_minutes = CASE
        WHEN level = 'major' THEN 60
        WHEN level = 'sub' THEN 30
        ELSE 15
    END
WHERE difficulty IS NULL OR xp_reward IS NULL;

-- ============================================
-- XP HISTORY (opzionale per tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS xp_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    category TEXT,
    multiplier DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_date ON xp_history(created_at DESC);

ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp history"
ON xp_history FOR SELECT
USING (true);

CREATE POLICY "Users can insert own xp history"
ON xp_history FOR INSERT
WITH CHECK (true);
