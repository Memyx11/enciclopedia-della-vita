-- ============================================
-- MIGRATION 008: Fix Quest Completion Logic
-- Corregge i bug nel sistema di completamento quest
-- ============================================

-- 1. FIX: Funzione check_quest_completion con parsing JSON corretto
CREATE OR REPLACE FUNCTION check_quest_completion(
  p_clerk_user_id TEXT,
  p_quest_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_quest game_quests%ROWTYPE;
  v_profile user_profile_data%ROWTYPE;
  v_count INT;
  v_config JSONB;
  v_required TEXT[];
  v_field TEXT;
BEGIN
  -- Carica quest
  SELECT * INTO v_quest FROM game_quests WHERE id = p_quest_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Carica profilo
  SELECT * INTO v_profile FROM user_profile_data WHERE clerk_user_id = p_clerk_user_id;

  v_config := v_quest.completion_config;

  RAISE NOTICE '[Quest Check] Quest: %, Type: %, Config: %', p_quest_id, v_quest.completion_type, v_config;

  CASE v_quest.completion_type
    WHEN 'first_message' THEN
      -- Controlla se ha inviato almeno un messaggio
      SELECT COUNT(*) INTO v_count FROM messages WHERE clerk_user_id = p_clerk_user_id;
      RAISE NOTICE '[Quest Check] first_message: count=%', v_count;
      RETURN v_count > 0;

    WHEN 'profile_fields' THEN
      -- Controlla campi profilo richiesti
      IF v_profile IS NULL THEN
        RAISE NOTICE '[Quest Check] profile_fields: NO PROFILE';
        RETURN FALSE;
      END IF;

      -- Parse dell'array JSON corretto
      IF v_config ? 'required' THEN
        -- Converti JSON array in TEXT array
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_config->'required')) INTO v_required;

        RAISE NOTICE '[Quest Check] profile_fields: required=%, profile life_phase=%, situation=%, mindset=%, skills=%',
          v_required, v_profile.life_phase, v_profile.situation, v_profile.mindset, v_profile.skills;

        -- Controlla ogni campo richiesto
        FOREACH v_field IN ARRAY v_required LOOP
          CASE v_field
            WHEN 'life_phase' THEN
              IF v_profile.life_phase IS NULL THEN
                RAISE NOTICE '[Quest Check] MISSING: life_phase';
                RETURN FALSE;
              END IF;
            WHEN 'situation' THEN
              IF v_profile.situation IS NULL OR array_length(v_profile.situation, 1) IS NULL THEN
                RAISE NOTICE '[Quest Check] MISSING: situation';
                RETURN FALSE;
              END IF;
            WHEN 'mindset' THEN
              IF v_profile.mindset IS NULL THEN
                RAISE NOTICE '[Quest Check] MISSING: mindset';
                RETURN FALSE;
              END IF;
            WHEN 'skills' THEN
              IF v_profile.skills IS NULL OR array_length(v_profile.skills, 1) IS NULL THEN
                RAISE NOTICE '[Quest Check] MISSING: skills';
                RETURN FALSE;
              END IF;
              -- Controlla min_skills se specificato
              IF (v_config->>'min_skills')::INT IS NOT NULL THEN
                IF array_length(v_profile.skills, 1) < (v_config->>'min_skills')::INT THEN
                  RAISE NOTICE '[Quest Check] NOT ENOUGH skills: % < %', array_length(v_profile.skills, 1), (v_config->>'min_skills')::INT;
                  RETURN FALSE;
                END IF;
              END IF;
            ELSE
              -- Campo non riconosciuto, ignora
              NULL;
          END CASE;
        END LOOP;
      END IF;

      RAISE NOTICE '[Quest Check] profile_fields: ALL CHECKS PASSED!';
      RETURN TRUE;

    WHEN 'has_objective' THEN
      -- Controlla se ha obiettivi area
      IF v_config ? 'area' THEN
        SELECT COUNT(*) INTO v_count FROM area_objectives
        WHERE clerk_user_id = p_clerk_user_id
          AND status = 'active'
          AND area_id = v_config->>'area';
      ELSIF v_config ? 'min_areas' THEN
        SELECT COUNT(DISTINCT area_id) INTO v_count FROM area_objectives
        WHERE clerk_user_id = p_clerk_user_id AND status = 'active';
        RETURN v_count >= (v_config->>'min_areas')::INT;
      ELSE
        SELECT COUNT(*) INTO v_count FROM area_objectives
        WHERE clerk_user_id = p_clerk_user_id AND status = 'active';
      END IF;
      RETURN v_count >= COALESCE((v_config->>'min_objectives')::INT, 1);

    WHEN 'has_routine_task' THEN
      -- Controlla se ha task nella routine
      SELECT COUNT(*) INTO v_count FROM routine_tasks
      WHERE clerk_user_id = p_clerk_user_id AND is_active = true;
      RETURN v_count >= COALESCE((v_config->>'min_tasks')::INT, 1);

    WHEN 'has_routine_template' THEN
      -- Controlla se ha definito template routine
      SELECT COUNT(*) INTO v_count FROM user_routine_template
      WHERE clerk_user_id = p_clerk_user_id;
      RETURN v_count >= COALESCE((v_config->>'min_days')::INT, 1);

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
      RAISE NOTICE '[Quest Check] Unknown completion_type: %', v_quest.completion_type;
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 2. Funzione per auto-start quest quando appropriato
-- Chiamata quando un utente interagisce con il sistema
CREATE OR REPLACE FUNCTION auto_start_available_quests(p_clerk_user_id TEXT)
RETURNS TABLE(quest_id TEXT, quest_title TEXT) AS $$
BEGIN
  -- Metti in_progress tutte le quest available
  UPDATE user_quest_progress uqp
  SET status = 'in_progress',
      started_at = NOW()
  FROM game_quests gq
  WHERE uqp.quest_id = gq.id
    AND uqp.clerk_user_id = p_clerk_user_id
    AND uqp.status = 'available';

  -- Ritorna le quest avviate
  RETURN QUERY
  SELECT gq.id, gq.title
  FROM user_quest_progress uqp
  JOIN game_quests gq ON gq.id = uqp.quest_id
  WHERE uqp.clerk_user_id = p_clerk_user_id
    AND uqp.status = 'in_progress';
END;
$$ LANGUAGE plpgsql;

-- 3. Funzione migliorata per controllare e completare quest automaticamente
CREATE OR REPLACE FUNCTION check_and_complete_all_quests(p_clerk_user_id TEXT)
RETURNS TABLE(completed_quest_id TEXT, completed_quest_title TEXT, xp_awarded INT) AS $$
DECLARE
  v_quest RECORD;
  v_can_complete BOOLEAN;
BEGIN
  -- Prima auto-start delle quest available
  PERFORM auto_start_available_quests(p_clerk_user_id);

  -- Poi controlla tutte le quest in_progress
  FOR v_quest IN
    SELECT uqp.quest_id, gq.title, gq.xp_reward
    FROM user_quest_progress uqp
    JOIN game_quests gq ON gq.id = uqp.quest_id
    WHERE uqp.clerk_user_id = p_clerk_user_id
      AND uqp.status = 'in_progress'
    ORDER BY gq.chapter, gq.sort_order
  LOOP
    v_can_complete := check_quest_completion(p_clerk_user_id, v_quest.quest_id);

    IF v_can_complete THEN
      -- Completa la quest
      UPDATE user_quest_progress
      SET status = 'completed',
          completed_at = NOW(),
          xp_awarded = v_quest.xp_reward,
          progress_percent = 100
      WHERE clerk_user_id = p_clerk_user_id
        AND quest_id = v_quest.quest_id;

      -- Assegna XP
      PERFORM add_xp(p_clerk_user_id, v_quest.xp_reward, 'Quest completata: ' || v_quest.title, NULL);

      -- Sblocca quest successive
      PERFORM unlock_next_quests(p_clerk_user_id, v_quest.quest_id);

      -- Ritorna questa quest completata
      completed_quest_id := v_quest.quest_id;
      completed_quest_title := v_quest.title;
      xp_awarded := v_quest.xp_reward;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Fix: Assicurati che le quest inizino come in_progress quando sbloccate
CREATE OR REPLACE FUNCTION unlock_next_quests(p_clerk_user_id TEXT, p_completed_quest_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Trova quest che si sbloccano dopo questa e mettile direttamente in_progress
  INSERT INTO user_quest_progress (clerk_user_id, quest_id, status, started_at)
  SELECT p_clerk_user_id, id, 'in_progress', NOW()
  FROM game_quests
  WHERE unlock_after = p_completed_quest_id
  ON CONFLICT (clerk_user_id, quest_id)
  DO UPDATE SET
    status = 'in_progress',
    started_at = COALESCE(user_quest_progress.started_at, NOW())
  WHERE user_quest_progress.status IN ('locked', 'available');
END;
$$ LANGUAGE plpgsql;

-- 5. Update esistente: Metti le quest available in in_progress
UPDATE user_quest_progress
SET status = 'in_progress',
    started_at = COALESCE(started_at, NOW())
WHERE status = 'available';

-- 6. Funzione per inizializzare quest utente con prima quest in_progress
CREATE OR REPLACE FUNCTION initialize_user_quests(p_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Inserisci la prima quest come in_progress (non available)
  INSERT INTO user_quest_progress (clerk_user_id, quest_id, status, started_at)
  VALUES (p_clerk_user_id, 'quest_0_1', 'in_progress', NOW())
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
