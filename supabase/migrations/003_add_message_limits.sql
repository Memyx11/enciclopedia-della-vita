-- ============================================
-- NUR: LIFE RPG - Migration 003
-- Aggiunge colonne per limite messaggi giornaliero
-- ============================================

-- Aggiungi colonne per tracking messaggi
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS messages_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Funzione per resettare il contatore messaggi
CREATE OR REPLACE FUNCTION reset_daily_messages()
RETURNS TRIGGER AS $$
BEGIN
    -- Se è passato un giorno dall'ultimo reset, resetta
    IF NEW.messages_reset_at < (NOW() - INTERVAL '1 day') THEN
        NEW.messages_today := 0;
        NEW.messages_reset_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per incrementare il contatore messaggi
CREATE OR REPLACE FUNCTION increment_message_count(p_clerk_user_id TEXT)
RETURNS TABLE(
    current_count INTEGER,
    limit_reached BOOLEAN,
    is_pro BOOLEAN
) AS $$
DECLARE
    v_profile RECORD;
    v_message_limit INTEGER;
BEGIN
    -- Prendi il profilo
    SELECT * INTO v_profile
    FROM profiles
    WHERE clerk_user_id = p_clerk_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- Reset se è passato un giorno
    IF v_profile.messages_reset_at < (NOW() - INTERVAL '1 day') THEN
        UPDATE profiles
        SET messages_today = 1, messages_reset_at = NOW()
        WHERE clerk_user_id = p_clerk_user_id;

        RETURN QUERY SELECT 1, FALSE, FALSE;
        RETURN;
    END IF;

    -- Determina il limite (3 free, 20 pro) - per ora tutti free
    v_message_limit := 20; -- TODO: implementare logica pro

    -- Verifica se ha raggiunto il limite
    IF v_profile.messages_today >= v_message_limit THEN
        RETURN QUERY SELECT v_profile.messages_today, TRUE, FALSE;
        RETURN;
    END IF;

    -- Incrementa il contatore
    UPDATE profiles
    SET messages_today = messages_today + 1
    WHERE clerk_user_id = p_clerk_user_id;

    RETURN QUERY SELECT v_profile.messages_today + 1, FALSE, FALSE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere lo stato messaggi
CREATE OR REPLACE FUNCTION get_message_status(p_clerk_user_id TEXT)
RETURNS TABLE(
    messages_used INTEGER,
    messages_limit INTEGER,
    messages_remaining INTEGER,
    resets_at TIMESTAMPTZ
) AS $$
DECLARE
    v_profile RECORD;
    v_limit INTEGER;
BEGIN
    SELECT * INTO v_profile
    FROM profiles
    WHERE clerk_user_id = p_clerk_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 20, 20, NOW() + INTERVAL '1 day';
        RETURN;
    END IF;

    -- Reset se necessario
    IF v_profile.messages_reset_at < (NOW() - INTERVAL '1 day') THEN
        UPDATE profiles
        SET messages_today = 0, messages_reset_at = NOW()
        WHERE clerk_user_id = p_clerk_user_id;

        v_profile.messages_today := 0;
        v_profile.messages_reset_at := NOW();
    END IF;

    v_limit := 20; -- TODO: logica pro/free

    RETURN QUERY SELECT
        v_profile.messages_today,
        v_limit,
        GREATEST(0, v_limit - v_profile.messages_today),
        v_profile.messages_reset_at + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Commento
COMMENT ON COLUMN profiles.messages_today IS 'Numero di messaggi NUR inviati oggi';
COMMENT ON COLUMN profiles.messages_reset_at IS 'Ultimo reset del contatore messaggi';
