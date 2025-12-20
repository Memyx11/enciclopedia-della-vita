-- ============================================
-- NUR: LIFE RPG - Seed Life Areas
-- ============================================
-- Questo file contiene la funzione per creare
-- le 10 aree vita quando un utente si registra
-- ============================================

-- Funzione per creare le 10 aree vita per un nuovo utente
CREATE OR REPLACE FUNCTION create_user_life_areas(p_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO life_areas (clerk_user_id, slug, name, icon, color, priority) VALUES
        (p_clerk_user_id, 'finanze', 'Finanze', '💰', '#10B981', 8),
        (p_clerk_user_id, 'carriera', 'Carriera', '💼', '#3B82F6', 8),
        (p_clerk_user_id, 'formazione', 'Formazione', '📚', '#8B5CF6', 7),
        (p_clerk_user_id, 'salute', 'Salute', '❤️', '#EF4444', 9),
        (p_clerk_user_id, 'spiritualita', 'Spiritualità', '🧘', '#F59E0B', 6),
        (p_clerk_user_id, 'relazioni', 'Relazioni', '👥', '#EC4899', 7),
        (p_clerk_user_id, 'casa', 'Casa', '🏠', '#6366F1', 5),
        (p_clerk_user_id, 'hobby', 'Hobby', '🎨', '#14B8A6', 5),
        (p_clerk_user_id, 'esperienze', 'Esperienze', '✈️', '#F97316', 6),
        (p_clerk_user_id, 'sociale', 'Sociale', '🌍', '#84CC16', 4)
    ON CONFLICT (clerk_user_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger per creare automaticamente le aree quando si crea un profilo
CREATE OR REPLACE FUNCTION on_profile_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_user_life_areas(NEW.clerk_user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_life_areas ON profiles;
CREATE TRIGGER trigger_create_life_areas
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION on_profile_created();

-- ============================================
-- ACHIEVEMENT DEFINITIONS (Reference data)
-- ============================================

-- Tabella per definizioni achievement (template)
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    xp_reward INTEGER DEFAULT 100,
    category TEXT, -- 'task', 'goal', 'streak', 'skill', 'level', 'special'
    requirement_type TEXT, -- 'count', 'streak', 'level', 'special'
    requirement_value INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed achievement definitions
INSERT INTO achievement_definitions (slug, name, description, icon, xp_reward, category, requirement_type, requirement_value) VALUES
    -- Task achievements
    ('first_task', 'Primo Passo', 'Completa il tuo primo task', '🎯', 50, 'task', 'count', 1),
    ('task_10', 'Produttivo', 'Completa 10 task', '⚡', 100, 'task', 'count', 10),
    ('task_50', 'Macchina', 'Completa 50 task', '🔥', 200, 'task', 'count', 50),
    ('task_100', 'Inarrestabile', 'Completa 100 task', '💪', 500, 'task', 'count', 100),
    ('multitasker', 'Multitasker', 'Completa 5 task in un giorno', '🎪', 100, 'task', 'special', 5),
    ('early_bird', 'Mattiniero', 'Completa un task prima delle 8:00', '🌅', 50, 'task', 'special', 8),
    ('night_owl', 'Nottambulo', 'Completa un task dopo le 22:00', '🦉', 50, 'task', 'special', 22),

    -- Goal achievements
    ('first_goal', 'Obiettivo Raggiunto', 'Completa il tuo primo obiettivo', '🏆', 100, 'goal', 'count', 1),
    ('goal_5', 'Ambizioso', 'Completa 5 obiettivi', '🎖️', 200, 'goal', 'count', 5),
    ('goal_20', 'Determinato', 'Completa 20 obiettivi', '👑', 500, 'goal', 'count', 20),
    ('first_boss', 'Boss Sconfitto', 'Completa il tuo primo boss goal', '⚔️', 200, 'goal', 'special', 1),
    ('first_dream', 'Sognatore', 'Realizza il tuo primo sogno', '✨', 500, 'goal', 'special', 1),

    -- Streak achievements
    ('week_streak', 'Settimana Perfetta', 'Mantieni lo streak per 7 giorni', '📅', 150, 'streak', 'streak', 7),
    ('month_streak', 'Mese Imbattibile', 'Mantieni lo streak per 30 giorni', '🗓️', 500, 'streak', 'streak', 30),
    ('quarter_streak', 'Trimestre d''Oro', 'Mantieni lo streak per 90 giorni', '💎', 1000, 'streak', 'streak', 90),

    -- Skill achievements
    ('first_skill', 'Apprendista', 'Ottieni la tua prima skill', '🌱', 50, 'skill', 'count', 1),
    ('skill_master', 'Maestro', 'Porta una skill a livello Maestro', '🎓', 300, 'skill', 'special', 1),
    ('skill_legend', 'Leggenda Vivente', 'Porta una skill a livello Leggenda', '🌟', 500, 'skill', 'special', 1),

    -- Level achievements
    ('level_10', 'Crescita', 'Raggiungi il livello 10', '📈', 200, 'level', 'level', 10),
    ('level_20', 'Campione', 'Raggiungi il livello 20', '🏅', 400, 'level', 'level', 20),
    ('level_30', 'Veterano', 'Raggiungi il livello 30', '🎭', 600, 'level', 'level', 30),
    ('level_40', 'Leggenda', 'Raggiungi il livello 40', '👑', 1000, 'level', 'level', 40),

    -- Special achievements
    ('explorer', 'Esploratore', 'Crea almeno un goal in tutte le 10 aree', '🧭', 300, 'special', 'count', 10),
    ('collector', 'Collezionista', 'Ottieni 10 materiali', '🎒', 150, 'special', 'count', 10),
    ('focused', 'Concentrato', 'Completa 3 ore di attività consecutiva', '🎯', 100, 'special', 'special', 180),
    ('tester', 'Provato', 'Supera 5 prove di NUR', '✅', 150, 'special', 'count', 5)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    xp_reward = EXCLUDED.xp_reward;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Funzione per sbloccare achievement
CREATE OR REPLACE FUNCTION unlock_achievement(
    p_clerk_user_id TEXT,
    p_achievement_slug TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_def RECORD;
    v_already_unlocked BOOLEAN;
BEGIN
    -- Check if already unlocked
    SELECT EXISTS (
        SELECT 1 FROM achievements
        WHERE clerk_user_id = p_clerk_user_id AND slug = p_achievement_slug
    ) INTO v_already_unlocked;

    IF v_already_unlocked THEN
        RETURN FALSE;
    END IF;

    -- Get achievement definition
    SELECT * INTO v_def FROM achievement_definitions WHERE slug = p_achievement_slug;

    IF v_def IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Unlock achievement
    INSERT INTO achievements (clerk_user_id, slug, name, description, icon, xp_reward)
    VALUES (p_clerk_user_id, v_def.slug, v_def.name, v_def.description, v_def.icon, v_def.xp_reward);

    -- Award XP
    PERFORM add_xp(p_clerk_user_id, v_def.xp_reward, 'achievement_unlocked', 'Achievement: ' || v_def.name);

    -- Log activity
    INSERT INTO activity_log (clerk_user_id, activity_type, description, xp_gained)
    VALUES (p_clerk_user_id, 'achievement_unlocked', v_def.name, v_def.xp_reward);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per controllare e sbloccare achievement automatici
CREATE OR REPLACE FUNCTION check_achievements(p_clerk_user_id TEXT)
RETURNS TEXT[] AS $$
DECLARE
    v_unlocked TEXT[] := '{}';
    v_profile RECORD;
    v_counts RECORD;
BEGIN
    -- Get profile
    SELECT * INTO v_profile FROM profiles WHERE clerk_user_id = p_clerk_user_id;

    -- Get counts
    SELECT
        (SELECT COUNT(*) FROM tasks WHERE clerk_user_id = p_clerk_user_id AND status = 'completed') as tasks_completed,
        (SELECT COUNT(*) FROM goals WHERE clerk_user_id = p_clerk_user_id AND status = 'completed') as goals_completed,
        (SELECT COUNT(*) FROM goals WHERE clerk_user_id = p_clerk_user_id AND status = 'completed' AND type = 'boss') as boss_completed,
        (SELECT COUNT(*) FROM goals WHERE clerk_user_id = p_clerk_user_id AND status = 'completed' AND type = 'sogno') as dreams_completed,
        (SELECT COUNT(*) FROM skills WHERE clerk_user_id = p_clerk_user_id) as skills_count,
        (SELECT COUNT(*) FROM materials WHERE clerk_user_id = p_clerk_user_id AND is_obtained = TRUE) as materials_count,
        (SELECT COUNT(DISTINCT area_id) FROM goals WHERE clerk_user_id = p_clerk_user_id) as areas_with_goals,
        (SELECT COUNT(*) FROM user_tests WHERE clerk_user_id = p_clerk_user_id AND status = 'passed') as tests_passed
    INTO v_counts;

    -- Check task achievements
    IF v_counts.tasks_completed >= 1 AND unlock_achievement(p_clerk_user_id, 'first_task') THEN
        v_unlocked := array_append(v_unlocked, 'first_task');
    END IF;
    IF v_counts.tasks_completed >= 10 AND unlock_achievement(p_clerk_user_id, 'task_10') THEN
        v_unlocked := array_append(v_unlocked, 'task_10');
    END IF;
    IF v_counts.tasks_completed >= 50 AND unlock_achievement(p_clerk_user_id, 'task_50') THEN
        v_unlocked := array_append(v_unlocked, 'task_50');
    END IF;
    IF v_counts.tasks_completed >= 100 AND unlock_achievement(p_clerk_user_id, 'task_100') THEN
        v_unlocked := array_append(v_unlocked, 'task_100');
    END IF;

    -- Check goal achievements
    IF v_counts.goals_completed >= 1 AND unlock_achievement(p_clerk_user_id, 'first_goal') THEN
        v_unlocked := array_append(v_unlocked, 'first_goal');
    END IF;
    IF v_counts.goals_completed >= 5 AND unlock_achievement(p_clerk_user_id, 'goal_5') THEN
        v_unlocked := array_append(v_unlocked, 'goal_5');
    END IF;
    IF v_counts.goals_completed >= 20 AND unlock_achievement(p_clerk_user_id, 'goal_20') THEN
        v_unlocked := array_append(v_unlocked, 'goal_20');
    END IF;

    -- Check boss/dream achievements
    IF v_counts.boss_completed >= 1 AND unlock_achievement(p_clerk_user_id, 'first_boss') THEN
        v_unlocked := array_append(v_unlocked, 'first_boss');
    END IF;
    IF v_counts.dreams_completed >= 1 AND unlock_achievement(p_clerk_user_id, 'first_dream') THEN
        v_unlocked := array_append(v_unlocked, 'first_dream');
    END IF;

    -- Check streak achievements
    IF v_profile.streak_days >= 7 AND unlock_achievement(p_clerk_user_id, 'week_streak') THEN
        v_unlocked := array_append(v_unlocked, 'week_streak');
    END IF;
    IF v_profile.streak_days >= 30 AND unlock_achievement(p_clerk_user_id, 'month_streak') THEN
        v_unlocked := array_append(v_unlocked, 'month_streak');
    END IF;
    IF v_profile.streak_days >= 90 AND unlock_achievement(p_clerk_user_id, 'quarter_streak') THEN
        v_unlocked := array_append(v_unlocked, 'quarter_streak');
    END IF;

    -- Check level achievements
    IF v_profile.level >= 10 AND unlock_achievement(p_clerk_user_id, 'level_10') THEN
        v_unlocked := array_append(v_unlocked, 'level_10');
    END IF;
    IF v_profile.level >= 20 AND unlock_achievement(p_clerk_user_id, 'level_20') THEN
        v_unlocked := array_append(v_unlocked, 'level_20');
    END IF;
    IF v_profile.level >= 30 AND unlock_achievement(p_clerk_user_id, 'level_30') THEN
        v_unlocked := array_append(v_unlocked, 'level_30');
    END IF;
    IF v_profile.level >= 40 AND unlock_achievement(p_clerk_user_id, 'level_40') THEN
        v_unlocked := array_append(v_unlocked, 'level_40');
    END IF;

    -- Check skill achievements
    IF v_counts.skills_count >= 1 AND unlock_achievement(p_clerk_user_id, 'first_skill') THEN
        v_unlocked := array_append(v_unlocked, 'first_skill');
    END IF;

    -- Check special achievements
    IF v_counts.areas_with_goals >= 10 AND unlock_achievement(p_clerk_user_id, 'explorer') THEN
        v_unlocked := array_append(v_unlocked, 'explorer');
    END IF;
    IF v_counts.materials_count >= 10 AND unlock_achievement(p_clerk_user_id, 'collector') THEN
        v_unlocked := array_append(v_unlocked, 'collector');
    END IF;
    IF v_counts.tests_passed >= 5 AND unlock_achievement(p_clerk_user_id, 'tester') THEN
        v_unlocked := array_append(v_unlocked, 'tester');
    END IF;

    RETURN v_unlocked;
END;
$$ LANGUAGE plpgsql;
