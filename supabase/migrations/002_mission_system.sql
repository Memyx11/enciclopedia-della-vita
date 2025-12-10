-- =============================================
-- ENCICLOPEDIA DELLA VITA - SISTEMA MISSIONE
-- Esegui in Supabase SQL Editor
-- =============================================

-- 1. MISSIONE PRINCIPALE
CREATE TABLE IF NOT EXISTS user_mission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  why TEXT,

  start_value NUMERIC,
  target_value NUMERIC,
  current_value NUMERIC,
  unit TEXT,

  start_date DATE DEFAULT CURRENT_DATE,
  target_date DATE,

  status TEXT DEFAULT 'active',
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. OBIETTIVI (gerarchia)
CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  mission_id UUID REFERENCES user_mission(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES objectives(id) ON DELETE CASCADE,

  level TEXT NOT NULL CHECK (level IN ('major', 'sub', 'task', 'micro')),

  title TEXT NOT NULL,
  description TEXT,

  related_areas TEXT[],

  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,

  sort_order INTEGER DEFAULT 0,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  due_date DATE,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objectives_user ON objectives(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_objectives_mission ON objectives(mission_id);
CREATE INDEX IF NOT EXISTS idx_objectives_parent ON objectives(parent_id);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);

-- 3. INSIGHT RACCOLTI DA NUR
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,

  category TEXT NOT NULL CHECK (category IN ('problem', 'desire', 'fear', 'strength', 'weakness', 'context')),

  content TEXT NOT NULL,
  source TEXT,

  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),

  used_for_mission BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_user ON user_insights(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_insights_category ON user_insights(category);

-- 4. CHECK-IN GIORNALIERO
CREATE TABLE IF NOT EXISTS daily_checkin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  mood TEXT,
  mood_emoji TEXT,

  daily_task_id UUID REFERENCES objectives(id),
  daily_task_completed BOOLEAN DEFAULT FALSE,
  daily_task_notes TEXT,

  wins TEXT,
  struggles TEXT,
  tomorrow_focus TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(clerk_user_id, date)
);

-- 5. PROGRESSI STORICI
CREATE TABLE IF NOT EXISTS progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  value NUMERIC NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(objective_id, date)
);

CREATE INDEX IF NOT EXISTS idx_progress_objective ON progress_history(objective_id);
CREATE INDEX IF NOT EXISTS idx_progress_date ON progress_history(date);

-- 6. AGGIUNGI COLONNE A JOURNAL_ENTRIES
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES objectives(id);

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE;

-- 7. RLS POLICIES (opzionali ma raccomandate)
ALTER TABLE user_mission ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_history ENABLE ROW LEVEL SECURITY;

-- Policy per user_mission
CREATE POLICY "Users can view own mission" ON user_mission
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own mission" ON user_mission
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own mission" ON user_mission
  FOR UPDATE USING (true);

-- Policy per objectives
CREATE POLICY "Users can view own objectives" ON objectives
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own objectives" ON objectives
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own objectives" ON objectives
  FOR UPDATE USING (true);
CREATE POLICY "Users can delete own objectives" ON objectives
  FOR DELETE USING (true);

-- Policy per user_insights
CREATE POLICY "Users can view own insights" ON user_insights
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own insights" ON user_insights
  FOR INSERT WITH CHECK (true);

-- Policy per daily_checkin
CREATE POLICY "Users can view own checkins" ON daily_checkin
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own checkins" ON daily_checkin
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own checkins" ON daily_checkin
  FOR UPDATE USING (true);

-- Policy per progress_history
CREATE POLICY "Users can view own progress" ON progress_history
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own progress" ON progress_history
  FOR INSERT WITH CHECK (true);
