-- ============================================
-- MOOD TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS mood_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    emotions TEXT[], -- Array di emozioni: ['felice', 'ansioso', 'motivato']
    notes TEXT,
    area_related TEXT,
    detected_by TEXT DEFAULT 'user', -- 'user' o 'nur' (rilevato automaticamente)
    context TEXT, -- contesto della conversazione se rilevato da NUR
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_logs_user ON mood_logs(clerk_user_id);
CREATE INDEX idx_mood_logs_created ON mood_logs(created_at DESC);

-- ============================================
-- HABIT TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    area_related TEXT,
    frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'custom'
    target_count INTEGER DEFAULT 1, -- quante volte al giorno/settimana
    is_active BOOLEAN DEFAULT true,
    streak_current INTEGER DEFAULT 0,
    streak_best INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    logged_by TEXT DEFAULT 'user' -- 'user' o 'nur'
);

CREATE INDEX idx_habits_user ON habits(clerk_user_id);
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_completed ON habit_logs(completed_at DESC);

-- ============================================
-- ACHIEVEMENTS / GAMIFICATION
-- ============================================

CREATE TABLE IF NOT EXISTS achievement_definitions (
    id TEXT PRIMARY KEY, -- es: 'first_task', 'week_streak', 'area_master'
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    emoji TEXT DEFAULT '🏆',
    category TEXT, -- 'milestone', 'streak', 'exploration', 'mastery'
    points INTEGER DEFAULT 10,
    rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    criteria JSONB -- criteri per sbloccare automaticamente
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    achievement_id TEXT REFERENCES achievement_definitions(id),
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    awarded_by TEXT DEFAULT 'system', -- 'system' o 'nur'
    context TEXT, -- motivo specifico
    is_notified BOOLEAN DEFAULT false,
    UNIQUE(clerk_user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(clerk_user_id);

-- ============================================
-- INSERT ACHIEVEMENT DEFINITIONS
-- ============================================

INSERT INTO achievement_definitions (id, name, description, emoji, category, points, rarity) VALUES
-- Milestone
('first_message', 'Primo Contatto', 'Hai parlato con NUR per la prima volta', '👋', 'milestone', 10, 'common'),
('first_task', 'Primo Passo', 'Hai completato il tuo primo task', '✅', 'milestone', 15, 'common'),
('first_goal', 'Visionario', 'Hai impostato il tuo primo obiettivo', '🎯', 'milestone', 15, 'common'),
('first_week', 'Una Settimana Insieme', 'Sei con NUR da una settimana', '📅', 'milestone', 25, 'common'),
('first_month', 'Un Mese di Crescita', 'Sei con NUR da un mese', '🌙', 'milestone', 50, 'rare'),

-- Streak
('streak_3', 'Costante', '3 giorni consecutivi di attività', '🔥', 'streak', 20, 'common'),
('streak_7', 'Settimana Perfetta', '7 giorni consecutivi', '⚡', 'streak', 40, 'rare'),
('streak_30', 'Mese Inarrestabile', '30 giorni consecutivi', '💪', 'streak', 100, 'epic'),
('streak_100', 'Leggenda', '100 giorni consecutivi', '👑', 'streak', 300, 'legendary'),

-- Exploration
('all_areas_visited', 'Esploratore', 'Hai visitato tutte le 10 aree della vita', '🗺️', 'exploration', 30, 'common'),
('deep_conversation', 'Anima Aperta', 'Hai avuto una conversazione profonda con NUR', '💜', 'exploration', 25, 'rare'),
('night_owl', 'Nottambulo', 'Hai parlato con NUR dopo mezzanotte', '🦉', 'exploration', 15, 'common'),
('early_bird', 'Mattiniero', 'Hai parlato con NUR prima delle 6', '🌅', 'exploration', 15, 'common'),

-- Mastery
('area_50', 'Progresso Notevole', 'Hai raggiunto il 50% in un''area', '📈', 'mastery', 40, 'rare'),
('area_100', 'Maestro', 'Hai completato un''area al 100%', '🏆', 'mastery', 100, 'epic'),
('tasks_10', 'Produttivo', 'Hai completato 10 task', '✨', 'mastery', 25, 'common'),
('tasks_50', 'Macchina', 'Hai completato 50 task', '🚀', 'mastery', 75, 'rare'),
('tasks_100', 'Inarrestabile', 'Hai completato 100 task', '💎', 'mastery', 150, 'epic'),

-- Special
('comeback', 'Ritorno del Guerriero', 'Sei tornato dopo più di 7 giorni di assenza', '🔄', 'milestone', 30, 'rare'),
('vulnerability', 'Coraggio', 'Hai condiviso qualcosa di vulnerabile con NUR', '❤️‍🩹', 'exploration', 35, 'rare'),
('breakthrough', 'Svolta', 'Hai avuto un momento di grande realizzazione', '💡', 'exploration', 50, 'epic')

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COMPARISON/ANALYTICS HELPER VIEW
-- ============================================

CREATE OR REPLACE VIEW user_progress_history AS
SELECT
    clerk_user_id,
    DATE_TRUNC('day', created_at) as day,
    COUNT(*) FILTER (WHERE role = 'user') as messages_sent,
    COUNT(*) as total_messages
FROM messages
GROUP BY clerk_user_id, DATE_TRUNC('day', created_at);

-- RLS Policies
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Per ora policy aperte (usano service role key)
CREATE POLICY "Allow all for mood_logs" ON mood_logs FOR ALL USING (true);
CREATE POLICY "Allow all for habits" ON habits FOR ALL USING (true);
CREATE POLICY "Allow all for habit_logs" ON habit_logs FOR ALL USING (true);
CREATE POLICY "Allow all for user_achievements" ON user_achievements FOR ALL USING (true);
