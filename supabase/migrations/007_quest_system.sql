-- ============================================
-- MIGRATION 007: Quest System + User Profile + Routine
-- Sistema completo di gamification con quest infinite
-- ============================================

-- ============================================
-- 1. USER PROFILE STRUTTURATO
-- ============================================

CREATE TABLE IF NOT EXISTS user_profile_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,

  -- Info base raccolte da NUR
  name TEXT,

  -- Fase di vita
  life_phase TEXT CHECK (life_phase IN (
    'elementari', 'medie', 'superiori', 'universitario',
    'stagista', 'lavoratore', 'imprenditore', 'pensionato', 'disoccupato'
  )),

  -- Situazione attuale (array - può essere multipla)
  situation TEXT[] DEFAULT '{}',

  -- Mindset attuale
  mindset TEXT CHECK (mindset IN (
    'fragile', 'soffocato', 'in_crollo',
    'neutro', 'determinato',
    'guerriero', 'indistruttibile', 'in_decollo'
  )),

  -- Skill (array)
  skills TEXT[] DEFAULT '{}',

  -- Storico mindset per tracking evoluzione
  mindset_history JSONB DEFAULT '[]',

  -- Priorità aree
  area_priorities JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index per lookup veloce
CREATE INDEX IF NOT EXISTS idx_user_profile_clerk ON user_profile_data(clerk_user_id);

-- ============================================
-- 2. LE 10 AREE DI VITA (FISSE)
-- ============================================

CREATE TABLE IF NOT EXISTS life_areas_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  sort_order INT DEFAULT 0
);

-- Seed delle 10 aree fisse
INSERT INTO life_areas_config (id, name, emoji, description, color, sort_order) VALUES
  ('health', 'Salute', '💪', 'Fitness, alimentazione, sonno, check-up', '#22c55e', 1),
  ('finance', 'Finanze', '💰', 'Budget, risparmi, investimenti, debiti', '#eab308', 2),
  ('relationships', 'Relazioni', '❤️', 'Partner, famiglia, amicizie intime', '#ec4899', 3),
  ('career', 'Carriera', '💼', 'Lavoro, promozioni, skill professionali', '#3b82f6', 4),
  ('growth', 'Crescita', '📚', 'Studio, corsi, libri, nuove competenze', '#8b5cf6', 5),
  ('home', 'Casa', '🏠', 'Ordine, pulizie, manutenzione, traslochi', '#f97316', 6),
  ('social', 'Sociale', '👥', 'Networking, eventi, nuove conoscenze', '#06b6d4', 7),
  ('hobbies', 'Hobby', '🎨', 'Passioni, creatività, divertimento', '#a855f7', 8),
  ('spirituality', 'Spiritualità', '🧘', 'Meditazione, mindfulness, valori', '#14b8a6', 9),
  ('future', 'Futuro', '🚀', 'Progetti, sogni, pianificazione long-term', '#f43f5e', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. QUEST SYSTEM
-- ============================================

-- Quest predefinite (alcune fisse, altre template)
CREATE TABLE IF NOT EXISTS game_quests (
  id TEXT PRIMARY KEY,
  chapter INT NOT NULL,
  sort_order INT NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  long_description TEXT, -- Descrizione estesa per UI

  xp_reward INT DEFAULT 50,

  -- Unlock conditions
  unlock_after TEXT, -- ID quest precedente (NULL = sempre sbloccata)
  unlock_condition JSONB, -- Condizioni extra {"min_level": 5, "has_area": "health"}

  -- Completion logic
  completion_type TEXT NOT NULL,
  -- Tipi: first_message, profile_fields, has_objective, has_step,
  --       task_completed, streak, chapter_completed, area_task, custom
  completion_config JSONB DEFAULT '{}',

  -- Categorizzazione
  quest_type TEXT DEFAULT 'story', -- story (fisse), discovery (esplorazione), growth (crescita), challenge (sfida)
  area_id TEXT REFERENCES life_areas_config(id), -- NULL = generale

  -- UI
  icon TEXT DEFAULT '🎯',

  -- Per quest template/ripetibili
  is_template BOOLEAN DEFAULT false,
  repeatable BOOLEAN DEFAULT false,
  cooldown_days INT, -- Per quest ripetibili

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progresso quest per utente
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  quest_id TEXT REFERENCES game_quests(id),

  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),

  -- Progress tracking
  progress_data JSONB DEFAULT '{}', -- Dati specifici per tipo quest
  progress_percent INT DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  xp_awarded INT DEFAULT 0,

  -- Per quest ripetibili
  times_completed INT DEFAULT 0,
  last_completed_at TIMESTAMPTZ,

  UNIQUE(clerk_user_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON user_quest_progress(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_status ON user_quest_progress(clerk_user_id, status);

-- ============================================
-- 4. OBIETTIVI AREA (Quest personalizzate)
-- ============================================

CREATE TABLE IF NOT EXISTS area_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  area_id TEXT NOT NULL REFERENCES life_areas_config(id),

  title TEXT NOT NULL,
  description TEXT,
  why TEXT, -- Perché è importante per l'utente

  target_date DATE,

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  priority INT DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Progress
  progress_percent INT DEFAULT 0,

  -- Metriche specifiche (es: "peso_target: 75kg")
  metrics JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_area_objectives_user ON area_objectives(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_area_objectives_area ON area_objectives(clerk_user_id, area_id);

-- ============================================
-- 5. ROUTINE SYSTEM
-- ============================================

-- Template routine settimanale
CREATE TABLE IF NOT EXISTS user_routine_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=dom, 1=lun...

  wake_time TIME,
  sleep_time TIME,

  -- Obblighi fissi (lavoro, scuola, etc.)
  obligations JSONB DEFAULT '[]',
  -- Formato: [{"from": "09:00", "to": "18:00", "label": "Lavoro", "type": "work"}]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(clerk_user_id, day_of_week)
);

-- Task ricorrenti nella routine
CREATE TABLE IF NOT EXISTS routine_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,

  -- Collegamento opzionale a obiettivo area
  area_objective_id UUID REFERENCES area_objectives(id) ON DELETE SET NULL,
  area_id TEXT NOT NULL REFERENCES life_areas_config(id),

  title TEXT NOT NULL,
  description TEXT,

  -- Scheduling
  scheduled_time TIME,
  duration_minutes INT DEFAULT 30,

  -- Frequenza
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'custom')),
  frequency_days INT[] DEFAULT '{}', -- Per custom: {1,3,5} = lun,mer,ven

  -- XP e difficoltà
  difficulty TEXT DEFAULT 'media' CHECK (difficulty IN ('facile', 'media', 'difficile', 'epica', 'leggendaria')),
  xp_reward INT DEFAULT 60,

  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routine_tasks_user ON routine_tasks(clerk_user_id);

-- Log completamento task giornaliere
CREATE TABLE IF NOT EXISTS daily_task_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  routine_task_id UUID REFERENCES routine_tasks(id) ON DELETE CASCADE,

  scheduled_date DATE NOT NULL,
  scheduled_time TIME,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'missed')),

  completed_at TIMESTAMPTZ,
  xp_earned INT DEFAULT 0,

  notes TEXT,

  UNIQUE(clerk_user_id, routine_task_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_task_log_date ON daily_task_log(clerk_user_id, scheduled_date);

-- ============================================
-- 6. ACHIEVEMENT SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('streak', 'completion', 'quest', 'area', 'mindset', 'special')),

  name TEXT NOT NULL,
  description TEXT,

  icon TEXT,

  -- Condizione per sblocco
  condition_type TEXT NOT NULL,
  condition_value INT,
  condition_config JSONB DEFAULT '{}',

  xp_bonus INT DEFAULT 0,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  achievement_id TEXT REFERENCES achievements(id),

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(clerk_user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements ON user_achievements(clerk_user_id);

-- ============================================
-- 7. MATERIALI SCRIVANIA (Enhanced)
-- ============================================

-- Aggiungi colonne a task_materials se non esistono
DO $$
BEGIN
  -- Collegamento ad area
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_materials' AND column_name = 'area_id') THEN
    ALTER TABLE task_materials ADD COLUMN area_id TEXT;
  END IF;

  -- Collegamento a obiettivo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_materials' AND column_name = 'area_objective_id') THEN
    ALTER TABLE task_materials ADD COLUMN area_objective_id UUID;
  END IF;

  -- Tags per categorizzazione
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_materials' AND column_name = 'tags') THEN
    ALTER TABLE task_materials ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;

  -- Suggerito da NUR
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_materials' AND column_name = 'suggested_by_nur') THEN
    ALTER TABLE task_materials ADD COLUMN suggested_by_nur BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 8. FUNZIONI HELPER
-- ============================================

-- Funzione per calcolare XP da difficoltà
CREATE OR REPLACE FUNCTION get_xp_for_difficulty(diff TEXT)
RETURNS INT AS $$
BEGIN
  RETURN CASE diff
    WHEN 'facile' THEN 30
    WHEN 'media' THEN 60
    WHEN 'difficile' THEN 120
    WHEN 'epica' THEN 250
    WHEN 'leggendaria' THEN 500
    ELSE 60
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funzione per verificare se una quest è completabile
CREATE OR REPLACE FUNCTION check_quest_completion(
  p_clerk_user_id TEXT,
  p_quest_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_quest game_quests%ROWTYPE;
  v_profile user_profile_data%ROWTYPE;
  v_count INT;
  v_config JSONB;
BEGIN
  -- Carica quest
  SELECT * INTO v_quest FROM game_quests WHERE id = p_quest_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Carica profilo
  SELECT * INTO v_profile FROM user_profile_data WHERE clerk_user_id = p_clerk_user_id;

  v_config := v_quest.completion_config;

  CASE v_quest.completion_type
    WHEN 'first_message' THEN
      -- Controlla se ha inviato almeno un messaggio
      SELECT COUNT(*) INTO v_count FROM messages WHERE clerk_user_id = p_clerk_user_id;
      RETURN v_count > 0;

    WHEN 'profile_fields' THEN
      -- Controlla campi profilo richiesti
      IF v_config ? 'required' THEN
        FOREACH v_config IN ARRAY (v_config->>'required')::TEXT[]
        LOOP
          IF v_config = 'life_phase' AND v_profile.life_phase IS NULL THEN RETURN FALSE; END IF;
          IF v_config = 'situation' AND array_length(v_profile.situation, 1) IS NULL THEN RETURN FALSE; END IF;
          IF v_config = 'mindset' AND v_profile.mindset IS NULL THEN RETURN FALSE; END IF;
          IF v_config = 'skills' THEN
            IF array_length(v_profile.skills, 1) IS NULL OR
               array_length(v_profile.skills, 1) < COALESCE((v_config->>'min_skills')::INT, 1)
            THEN RETURN FALSE; END IF;
          END IF;
        END LOOP;
      END IF;
      RETURN TRUE;

    WHEN 'has_objective' THEN
      -- Controlla se ha obiettivi area
      SELECT COUNT(*) INTO v_count FROM area_objectives
      WHERE clerk_user_id = p_clerk_user_id AND status = 'active';
      RETURN v_count >= COALESCE((v_config->>'min_objectives')::INT, 1);

    WHEN 'has_routine_task' THEN
      -- Controlla se ha task nella routine
      SELECT COUNT(*) INTO v_count FROM routine_tasks
      WHERE clerk_user_id = p_clerk_user_id AND is_active = true;
      RETURN v_count >= COALESCE((v_config->>'min_tasks')::INT, 1);

    WHEN 'task_completed' THEN
      -- Controlla task completate
      SELECT COUNT(*) INTO v_count FROM daily_task_log
      WHERE clerk_user_id = p_clerk_user_id AND status = 'completed';
      RETURN v_count >= COALESCE((v_config->>'min_completed')::INT, 1);

    WHEN 'streak' THEN
      -- Controlla streak corrente
      SELECT current_streak INTO v_count FROM profiles WHERE clerk_user_id = p_clerk_user_id;
      RETURN COALESCE(v_count, 0) >= COALESCE((v_config->>'min_streak')::INT, 1);

    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per sbloccare quest successive
CREATE OR REPLACE FUNCTION unlock_next_quests(p_clerk_user_id TEXT, p_completed_quest_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Trova quest che si sbloccano dopo questa
  INSERT INTO user_quest_progress (clerk_user_id, quest_id, status)
  SELECT p_clerk_user_id, id, 'available'
  FROM game_quests
  WHERE unlock_after = p_completed_quest_id
  ON CONFLICT (clerk_user_id, quest_id)
  DO UPDATE SET status = 'available' WHERE user_quest_progress.status = 'locked';
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger
DROP TRIGGER IF EXISTS update_user_profile_data_updated_at ON user_profile_data;
CREATE TRIGGER update_user_profile_data_updated_at
  BEFORE UPDATE ON user_profile_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_area_objectives_updated_at ON area_objectives;
CREATE TRIGGER update_area_objectives_updated_at
  BEFORE UPDATE ON area_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_routine_tasks_updated_at ON routine_tasks;
CREATE TRIGGER update_routine_tasks_updated_at
  BEFORE UPDATE ON routine_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 9. SEED: QUEST ONBOARDING (Cap 0)
-- ============================================

INSERT INTO game_quests (id, chapter, sort_order, title, description, long_description, xp_reward, unlock_after, completion_type, completion_config, quest_type, icon) VALUES

-- CAPITOLO 0: ONBOARDING
('quest_0_1', 0, 1, 'Incontra NUR',
 'Parla per la prima volta con NUR',
 'Il tuo viaggio inizia qui. NUR è la tua guida personale - una presenza che ti accompagnerà in ogni passo.',
 30, NULL, 'first_message', '{}', 'story', '👋'),

('quest_0_2', 0, 2, 'Raccontati',
 'Fai capire a NUR chi sei',
 'NUR ha bisogno di conoscerti per aiutarti davvero. Parla della tua situazione, di cosa fai nella vita, di come ti senti.',
 60, 'quest_0_1', 'profile_fields', '{"required": ["life_phase", "situation", "mindset"]}', 'story', '📝'),

('quest_0_3', 0, 3, 'I tuoi punti di forza',
 'Scopri e condividi le tue competenze',
 'Tutti abbiamo delle qualità. Quali sono le tue? Cosa sai fare bene?',
 60, 'quest_0_2', 'profile_fields', '{"required": ["skills"], "min_skills": 2}', 'story', '💪'),

('quest_0_4', 0, 4, 'La tua settimana tipo',
 'Racconta a NUR i tuoi orari e impegni',
 'Per costruire la tua routine, NUR deve sapere quando sei libero e quando hai obblighi.',
 80, 'quest_0_3', 'has_routine_template', '{"min_days": 1}', 'story', '📅'),

('quest_0_5', 0, 5, 'Prima missione',
 'Definisci il tuo primo obiettivo',
 'È il momento di scegliere su cosa lavorare. Quale area della vita vuoi migliorare per prima?',
 120, 'quest_0_4', 'has_objective', '{"min_objectives": 1}', 'story', '🎯'),

-- CAPITOLO 1: FONDAMENTA
('quest_1_1', 1, 1, 'Mappa la tua vita',
 'Definisci obiettivi per 3 aree',
 'Non siamo fatti di una sola dimensione. Espandi la tua visione su più aree della vita.',
 100, 'quest_0_5', 'has_objective', '{"min_areas": 3}', 'story', '🗺️'),

('quest_1_2', 1, 2, 'Il piano d''azione',
 'Aggiungi la prima task alla routine',
 'Gli obiettivi senza azioni restano sogni. Crea la tua prima task giornaliera.',
 80, 'quest_1_1', 'has_routine_task', '{"min_tasks": 1}', 'story', '📋'),

('quest_1_3', 1, 3, 'Prima vittoria',
 'Completa la prima task',
 'Il primo passo è sempre il più importante. Completalo.',
 150, 'quest_1_2', 'task_completed', '{"min_completed": 1}', 'story', '🏆'),

('quest_1_4', 1, 4, 'Routine iniziale',
 'Crea almeno 3 task giornaliere',
 'Una routine solida è fatta di piccole azioni costanti. Costruiscila.',
 80, 'quest_1_3', 'has_routine_task', '{"min_tasks": 3}', 'story', '⏰'),

('quest_1_5', 1, 5, 'Consistency',
 'Mantieni uno streak di 3 giorni',
 'La costanza batte il talento. Dimostra che puoi essere costante.',
 100, 'quest_1_4', 'streak', '{"min_streak": 3}', 'story', '🔥'),

-- CAPITOLO 2: MOMENTUM
('quest_2_1', 2, 1, 'Serie vincente',
 'Raggiungi uno streak di 7 giorni',
 'Una settimana di costanza. Stai costruendo un''abitudine.',
 200, 'quest_1_5', 'streak', '{"min_streak": 7}', 'story', '🔥'),

('quest_2_2', 2, 2, 'Multi-area',
 'Completa task in 3 aree diverse in un giorno',
 'La vita è equilibrio. Lavora su più fronti contemporaneamente.',
 150, 'quest_2_1', 'areas_in_day', '{"min_areas": 3}', 'story', '⚖️'),

('quest_2_3', 2, 3, 'Primo traguardo',
 'Completa il primo obiettivo di un''area',
 'Hai raggiunto il tuo primo vero obiettivo. Questo è solo l''inizio.',
 300, 'quest_2_2', 'objective_completed', '{}', 'story', '🎖️'),

('quest_2_4', 2, 4, 'Esploratore',
 'Attiva 5 aree della vita',
 'Espandi i tuoi orizzonti. Ogni area è un pezzo del puzzle.',
 100, 'quest_2_3', 'has_objective', '{"min_areas": 5}', 'story', '🧭'),

-- CAPITOLO 3: MASTERY
('quest_3_1', 3, 1, 'Settimana perfetta',
 'Completa tutte le task per 7 giorni',
 '100% per una settimana intera. Sei una macchina.',
 400, 'quest_2_4', 'perfect_week', '{}', 'story', '💎'),

('quest_3_2', 3, 2, 'Secondo capitolo',
 'Completa 2 obiettivi in un''area',
 'Stai costruendo vera competenza in un''area.',
 250, 'quest_3_1', 'objectives_in_area', '{"min_objectives": 2}', 'story', '📖'),

('quest_3_3', 3, 3, 'Maestro della routine',
 'Mantieni uno streak di 30 giorni',
 'Un mese di costanza. Sei inarrestabile.',
 500, 'quest_3_2', 'streak', '{"min_streak": 30}', 'story', '👑'),

-- CAPITOLO 4: TRANSFORMATION
('quest_4_1', 4, 1, 'Trasformazione',
 'Completa 3 obiettivi in un''area',
 'Questa area della tua vita è trasformata.',
 600, 'quest_3_3', 'objectives_in_area', '{"min_objectives": 3}', 'story', '🦋'),

('quest_4_2', 4, 2, 'Vita bilanciata',
 'Obiettivi attivi in 7+ aree',
 'Stai lavorando su quasi tutti gli aspetti della vita.',
 400, 'quest_4_1', 'has_objective', '{"min_areas": 7}', 'story', '☯️'),

('quest_4_3', 4, 3, 'Immortale',
 'Streak di 100 giorni',
 'Cento giorni. Sei leggenda.',
 1000, 'quest_4_2', 'streak', '{"min_streak": 100}', 'story', '🌟'),

-- CAPITOLO 5: LEGACY (Quest continue/ripetibili)
('quest_5_1', 5, 1, 'Mentore',
 'Raggiungi il livello 50',
 'Hai accumulato abbastanza esperienza per essere un esempio.',
 800, 'quest_4_3', 'level', '{"min_level": 50}', 'story', '🎓'),

('quest_5_2', 5, 2, 'Completionist',
 'Completa almeno 1 obiettivo per ogni area',
 'Hai toccato ogni aspetto della vita. Sei completo.',
 1500, 'quest_5_1', 'all_areas_objective', '{}', 'story', '🌈'),

('quest_5_3', 5, 3, 'Leggenda vivente',
 'Streak di 365 giorni',
 'Un anno intero. Sei entrato nella storia.',
 5000, 'quest_5_2', 'streak', '{"min_streak": 365}', 'story', '🏛️')

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  long_description = EXCLUDED.long_description,
  xp_reward = EXCLUDED.xp_reward,
  completion_type = EXCLUDED.completion_type,
  completion_config = EXCLUDED.completion_config;

-- ============================================
-- 10. SEED: QUEST DISCOVERY (Per area)
-- ============================================

-- Quest template per ogni area - NUR le propone quando l'utente esplora
INSERT INTO game_quests (id, chapter, sort_order, title, description, xp_reward, completion_type, completion_config, quest_type, area_id, is_template, icon) VALUES

-- HEALTH
('quest_health_first', 10, 1, 'Primo passo verso la salute',
 'Definisci il tuo primo obiettivo salute',
 50, 'has_objective', '{"area": "health"}', 'discovery', 'health', true, '💪'),

-- FINANCE
('quest_finance_first', 10, 1, 'Prendi il controllo dei soldi',
 'Definisci il tuo primo obiettivo finanziario',
 50, 'has_objective', '{"area": "finance"}', 'discovery', 'finance', true, '💰'),

-- RELATIONSHIPS
('quest_relationships_first', 10, 1, 'Cura le tue relazioni',
 'Definisci il tuo primo obiettivo relazionale',
 50, 'has_objective', '{"area": "relationships"}', 'discovery', 'relationships', true, '❤️'),

-- CAREER
('quest_career_first', 10, 1, 'Costruisci la tua carriera',
 'Definisci il tuo primo obiettivo professionale',
 50, 'has_objective', '{"area": "career"}', 'discovery', 'career', true, '💼'),

-- GROWTH
('quest_growth_first', 10, 1, 'Investi in te stesso',
 'Definisci il tuo primo obiettivo di crescita',
 50, 'has_objective', '{"area": "growth"}', 'discovery', 'growth', true, '📚')

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 11. SEED: ACHIEVEMENTS
-- ============================================

INSERT INTO achievements (id, category, name, description, icon, condition_type, condition_value, xp_bonus, rarity) VALUES

-- STREAK
('streak_3', 'streak', 'Fiamma', '3 giorni di streak', '🔥', 'streak', 3, 50, 'common'),
('streak_7', 'streak', 'Fuoco', '7 giorni di streak', '🔥', 'streak', 7, 150, 'common'),
('streak_14', 'streak', 'Inferno', '14 giorni di streak', '🔥', 'streak', 14, 300, 'rare'),
('streak_30', 'streak', 'Diamante di fuoco', '30 giorni di streak', '💎', 'streak', 30, 600, 'epic'),
('streak_100', 'streak', 'Leggenda', '100 giorni di streak', '👑', 'streak', 100, 2000, 'legendary'),
('streak_365', 'streak', 'Immortale', '365 giorni di streak', '🌟', 'streak', 365, 10000, 'legendary'),

-- COMPLETION
('tasks_10', 'completion', 'Prima stella', '10 task completate', '⭐', 'tasks_completed', 10, 100, 'common'),
('tasks_50', 'completion', 'Costellazione', '50 task completate', '⭐', 'tasks_completed', 50, 300, 'common'),
('tasks_200', 'completion', 'Via Lattea', '200 task completate', '⭐', 'tasks_completed', 200, 800, 'rare'),
('tasks_1000', 'completion', 'Universo', '1000 task completate', '🌌', 'tasks_completed', 1000, 3000, 'epic'),

-- QUEST
('quest_first', 'quest', 'Arciere', 'Prima quest completata', '🎯', 'quests_completed', 1, 50, 'common'),
('quest_5', 'quest', 'Cacciatore', '5 quest completate', '🏹', 'quests_completed', 5, 200, 'common'),
('quest_chapter', 'quest', 'Campione', 'Capitolo completato', '🏆', 'chapter_completed', 1, 500, 'rare'),
('quest_10', 'quest', 'Re delle Quest', '10 quest completate', '👑', 'quests_completed', 10, 1000, 'epic'),

-- AREA
('area_1', 'area', 'Germoglio', 'Prima area attivata', '🌱', 'areas_active', 1, 30, 'common'),
('area_3', 'area', 'Pianta', '3 aree attive', '🌿', 'areas_active', 3, 100, 'common'),
('area_5', 'area', 'Albero', '5 aree attive', '🌳', 'areas_active', 5, 250, 'rare'),
('area_10', 'area', 'Foresta', 'Tutte 10 aree attive', '🌲', 'areas_active', 10, 1000, 'epic'),

-- MINDSET
('mindset_shift', 'mindset', 'Trasformazione', 'Mindset migliorato', '🔄', 'mindset_improved', 1, 200, 'rare'),
('mindset_warrior', 'mindset', 'Guerriero', 'Raggiunto mindset guerriero', '⚔️', 'mindset_level', 1, 500, 'epic'),

-- SPECIAL
('early_bird', 'special', 'Early Bird', 'Task completata prima delle 7', '🌅', 'early_completion', 1, 50, 'common'),
('night_owl', 'special', 'Night Owl', 'Task completata dopo le 23', '🦉', 'late_completion', 1, 50, 'common'),
('perfectionist', 'special', 'Perfezionista', 'Settimana perfetta', '💎', 'perfect_week', 1, 300, 'rare')

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 12. INIZIALIZZA QUEST PER NUOVI UTENTI
-- ============================================

-- Funzione per inizializzare quest utente
CREATE OR REPLACE FUNCTION initialize_user_quests(p_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Inserisci la prima quest come available
  INSERT INTO user_quest_progress (clerk_user_id, quest_id, status)
  VALUES (p_clerk_user_id, 'quest_0_1', 'available')
  ON CONFLICT (clerk_user_id, quest_id) DO NOTHING;

  -- Inserisci le altre come locked
  INSERT INTO user_quest_progress (clerk_user_id, quest_id, status)
  SELECT p_clerk_user_id, id, 'locked'
  FROM game_quests
  WHERE id != 'quest_0_1' AND NOT is_template
  ON CONFLICT (clerk_user_id, quest_id) DO NOTHING;

  -- Crea profilo se non esiste
  INSERT INTO user_profile_data (clerk_user_id)
  VALUES (p_clerk_user_id)
  ON CONFLICT (clerk_user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
