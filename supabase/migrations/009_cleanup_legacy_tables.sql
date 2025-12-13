-- =============================================
-- CLEANUP TABELLE LEGACY
-- Rimuove tabelle non più utilizzate nel nuovo sistema
-- ATTENZIONE: Esegui con cautela! Backup consigliato prima dell'esecuzione
-- =============================================

-- =============================================
-- TABELLE DA ELIMINARE (non più usate)
-- =============================================

-- 1. achievements - Sostituito da user_achievements con game_quests
DROP TABLE IF EXISTS achievements CASCADE;

-- 2. habit_logs - Sistema habit vecchio, non più usato
DROP TABLE IF EXISTS habit_logs CASCADE;

-- 3. habits - Sistema habit vecchio, sostituito da routine_tasks
DROP TABLE IF EXISTS habits CASCADE;

-- 4. mood_logs - Non usato nel nuovo sistema
DROP TABLE IF EXISTS mood_logs CASCADE;

-- 5. nur_growth - Mai implementato
DROP TABLE IF EXISTS nur_growth CASCADE;

-- 6. processed_files - Non usato
DROP TABLE IF EXISTS processed_files CASCADE;

-- 7. progress_history - Sostituito da xp_history
DROP TABLE IF EXISTS progress_history CASCADE;

-- 8. streak_history - Non usato (streak è in profiles)
DROP TABLE IF EXISTS streak_history CASCADE;

-- 9. task_stats - Non usato
DROP TABLE IF EXISTS task_stats CASCADE;

-- 10. user_progress_* tabelle - Versione vecchia
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS user_progress_backup CASCADE;
DROP TABLE IF EXISTS user_progress_new CASCADE;

-- 11. user_stats - Sostituito da profiles con game system
DROP TABLE IF EXISTS user_stats CASCADE;

-- 12. verifications - Non usato (Clerk gestisce auth)
DROP TABLE IF EXISTS verifications CASCADE;

-- 13. Tabelle legacy menzionate in SISTEMA-COMPLETO.md
DROP TABLE IF EXISTS life_areas CASCADE;        -- Sostituita da life_areas_config + area_objectives
DROP TABLE IF EXISTS solutions CASCADE;         -- Non più usata
DROP TABLE IF EXISTS ai_insights CASCADE;       -- Sostituita da user_insights
DROP TABLE IF EXISTS nur_memory CASCADE;        -- Non necessaria (memoria globale)
DROP TABLE IF EXISTS encyclopedia_content CASCADE;  -- Non usata

-- =============================================
-- VERIFICA TABELLE ATTIVE (NON TOCCARE)
-- =============================================
-- Le seguenti tabelle DEVONO rimanere:
--
-- CORE:
-- - profiles (utenti + game stats)
-- - conversations
-- - messages
-- - journal_entries
--
-- QUEST/GAME:
-- - game_quests (seed data)
-- - user_quest_progress
-- - user_achievements
-- - xp_history
--
-- PROFILO:
-- - user_profile_data
-- - user_insights
-- - user_memory
--
-- MISSIONE:
-- - user_mission
-- - objectives
-- - task_materials
-- - task_notes
--
-- ROUTINE:
-- - life_areas_config (seed data)
-- - area_objectives
-- - routine_tasks
-- - daily_task_log
-- - user_routine_template
-- =============================================

-- =============================================
-- DONE! Eseguita pulizia tabelle legacy
-- =============================================
