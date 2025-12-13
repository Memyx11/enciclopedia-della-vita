-- =============================================
-- RESET COMPLETO DATI UTENTE NUR
-- Esegui in Supabase SQL Editor
-- ATTENZIONE: Elimina TUTTI i dati utente!
-- Data: 11 Dicembre 2025
-- =============================================

-- Funzione per eliminare dati in modo sicuro (ignora se tabella non esiste)
DO $$
BEGIN
    -- Disabilita FK checks
    SET session_replication_role = 'replica';

    -- Tabelle sistema gioco
    BEGIN DELETE FROM task_materials; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM task_notes; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM task_stats; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM xp_history; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM streak_history; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM verifications; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Tabelle sistema missione
    BEGIN DELETE FROM progress_history; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM daily_checkin; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM user_insights; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM objectives; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM user_mission; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Conversazioni e messaggi
    BEGIN DELETE FROM messages; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM conversations; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Journal e aree vita
    BEGIN DELETE FROM journal_entries; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM life_areas; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Memoria NUR
    BEGIN DELETE FROM user_memory; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Altre tabelle utente (se esistono)
    BEGIN DELETE FROM mood_history; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM daily_habits; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM achievements; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM solutions; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Reset campi gioco su profiles (se esistono le colonne)
    BEGIN
        UPDATE profiles SET
            level = 1,
            xp = 0,
            xp_to_next_level = 100,
            streak = 0,
            lives = 3,
            max_lives = 3,
            rank = 'dormiente',
            rank_bonus = 0,
            last_activity_date = NULL,
            streak_freeze_available = TRUE,
            game_over = FALSE;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;

    -- Riabilita FK checks
    SET session_replication_role = 'origin';

    RAISE NOTICE 'Reset completato!';
END $$;

-- Verifica conteggi
SELECT 'user_mission' as table_name, COUNT(*) as rows FROM user_mission
UNION ALL SELECT 'objectives', COUNT(*) FROM objectives
UNION ALL SELECT 'user_insights', COUNT(*) FROM user_insights
UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'journal_entries', COUNT(*) FROM journal_entries;
