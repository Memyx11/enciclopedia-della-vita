-- =============================================
-- MESSAGE LIMITS - 20 messaggi/giorno
-- =============================================

-- Tabella per tracciare messaggi giornalieri
CREATE TABLE IF NOT EXISTS user_daily_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clerk_user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_messages_user ON user_daily_messages(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_messages_date ON user_daily_messages(date);

-- RLS
ALTER TABLE user_daily_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_daily_messages_policy" ON user_daily_messages FOR ALL USING (true);

-- Funzione per incrementare e verificare limite
CREATE OR REPLACE FUNCTION check_and_increment_messages(
  p_clerk_user_id TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
  v_result JSON;
BEGIN
  -- Upsert: crea o incrementa
  INSERT INTO user_daily_messages (clerk_user_id, date, count)
  VALUES (p_clerk_user_id, CURRENT_DATE, 1)
  ON CONFLICT (clerk_user_id, date)
  DO UPDATE SET count = user_daily_messages.count + 1
  RETURNING count INTO v_count;

  -- Ritorna risultato
  v_result := json_build_object(
    'allowed', v_count <= p_limit,
    'count', v_count,
    'limit', p_limit,
    'remaining', GREATEST(0, p_limit - v_count)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere stato attuale (senza incrementare)
CREATE OR REPLACE FUNCTION get_message_count(p_clerk_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(count, 0) INTO v_count
  FROM user_daily_messages
  WHERE clerk_user_id = p_clerk_user_id AND date = CURRENT_DATE;

  IF v_count IS NULL THEN v_count := 0; END IF;

  RETURN json_build_object(
    'count', v_count,
    'limit', 20,
    'remaining', 20 - v_count
  );
END;
$$ LANGUAGE plpgsql;
