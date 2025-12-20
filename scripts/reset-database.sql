-- =====================================================
-- NUR: LIFE RPG - Database Reset Script
-- =====================================================
-- Questo script rimuove TUTTO il vecchio schema e
-- prepara il database per le nuove migrazioni.
--
-- ATTENZIONE: Eseguire questo PRIMA delle nuove migrazioni!
-- =====================================================

-- Disabilita temporaneamente i trigger
SET session_replication_role = replica;

-- =====================================================
-- 1. DROP TUTTE LE TABELLE (CASCADE rimuove trigger e policies)
-- =====================================================

-- Tabelle con dipendenze (drop prima)
DROP TABLE IF EXISTS habit_logs CASCADE;
DROP TABLE IF EXISTS habit_completions CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS mood_logs CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS achievement_definitions CASCADE;
DROP TABLE IF EXISTS quest_reflections CASCADE;
DROP TABLE IF EXISTS quest_tasks CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS insights CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS nur_memory CASCADE;
DROP TABLE IF EXISTS current_activities CASCADE;
DROP TABLE IF EXISTS user_tests CASCADE;
DROP TABLE IF EXISTS goal_materials CASCADE;
DROP TABLE IF EXISTS goal_skills CASCADE;
DROP TABLE IF EXISTS goal_dependencies CASCADE;
DROP TABLE IF EXISTS routine_items CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS life_areas CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Tabelle legacy aggiuntive
DROP TABLE IF EXISTS knowledge_embeddings CASCADE;
DROP TABLE IF EXISTS user_files CASCADE;
DROP TABLE IF EXISTS message_limits CASCADE;

-- =====================================================
-- 2. DROP TUTTE LE FUNZIONI
-- =====================================================

-- Funzioni vecchio sistema
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS add_xp(TEXT, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_xp(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_streak(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_streak(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_user_life_areas(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_area_progress(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_goal_dependencies(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_goal(UUID) CASCADE;
DROP FUNCTION IF EXISTS unlock_achievement(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_achievements(TEXT) CASCADE;
DROP FUNCTION IF EXISTS calculate_level(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_title_for_level(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Quest system functions (vecchio)
DROP FUNCTION IF EXISTS get_or_create_active_quest(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_quest_progress(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS complete_quest(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_quests(TEXT) CASCADE;
DROP FUNCTION IF EXISTS reset_user_data(TEXT) CASCADE;

-- =====================================================
-- 3. DROP TUTTI GLI ENUM TYPES
-- =====================================================

DROP TYPE IF EXISTS goal_type CASCADE;
DROP TYPE IF EXISTS goal_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS recurrence_type CASCADE;
DROP TYPE IF EXISTS skill_level CASCADE;
DROP TYPE IF EXISTS material_rarity CASCADE;
DROP TYPE IF EXISTS memory_type CASCADE;
DROP TYPE IF EXISTS activity_type CASCADE;
DROP TYPE IF EXISTS test_type CASCADE;
DROP TYPE IF EXISTS test_status CASCADE;

-- Vecchi enum types
DROP TYPE IF EXISTS quest_status CASCADE;
DROP TYPE IF EXISTS quest_type CASCADE;
DROP TYPE IF EXISTS mood_type CASCADE;
DROP TYPE IF EXISTS habit_frequency CASCADE;

-- =====================================================
-- 4. RIABILITA I TRIGGER
-- =====================================================

SET session_replication_role = DEFAULT;

-- =====================================================
-- FATTO! Ora puoi eseguire le nuove migrazioni:
-- 1. 001_nur_life_v1.sql
-- 2. 002_seed_life_areas.sql
-- =====================================================

SELECT 'Database reset completato! Esegui ora le nuove migrazioni.' as message;
