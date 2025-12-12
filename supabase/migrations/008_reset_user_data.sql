-- =============================================
-- RESET DATI UTENTE PER TEST FRESH
-- Esegui questo script per pulire tutti i dati utente
-- mantenendo la struttura delle tabelle
-- =============================================

-- Pulisci dati gioco/quest
DELETE FROM daily_task_log;
DELETE FROM routine_tasks;
DELETE FROM user_routine_template;
DELETE FROM area_objectives;
DELETE FROM user_quest_progress;
DELETE FROM user_achievements;
DELETE FROM user_profile_data;

-- Pulisci dati missione vecchio sistema
DELETE FROM task_materials;
DELETE FROM task_notes;
DELETE FROM objectives;
DELETE FROM user_mission;

-- Pulisci memorie NUR
DELETE FROM user_memory;
DELETE FROM user_insights;
DELETE FROM nur_memory;

-- Pulisci conversazioni
DELETE FROM messages;
DELETE FROM conversations;

-- Pulisci journal
DELETE FROM journal_entries;

-- Pulisci soluzioni e insight AI
DELETE FROM solutions;
DELETE FROM ai_insights;

-- Pulisci storico XP
DELETE FROM xp_history;

-- Pulisci life_areas (ma mantieni le configurazioni)
DELETE FROM life_areas;

-- Reset profili (onboarding_completed = false)
UPDATE profiles SET
    onboarding_completed = FALSE,
    level = 1,
    xp = 0,
    xp_to_next_level = 100,
    streak = 0,
    lives = 3,
    max_lives = 3,
    rank = 'dormiente',
    rank_bonus = 0,
    game_over = FALSE,
    last_activity_date = NULL;

-- Re-inizializza quest per tutti gli utenti
INSERT INTO user_quest_progress (clerk_user_id, quest_id, status, progress_percent)
SELECT p.clerk_user_id, q.id,
    CASE
        WHEN q.unlock_after IS NULL THEN 'available'
        ELSE 'locked'
    END,
    0
FROM profiles p
CROSS JOIN game_quests q
ON CONFLICT (clerk_user_id, quest_id) DO UPDATE SET
    status = EXCLUDED.status,
    progress_percent = 0,
    started_at = NULL,
    completed_at = NULL,
    xp_awarded = 0;

-- =============================================
-- DONE! Tutti i dati utente sono stati resettati
-- =============================================
