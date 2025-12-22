-- ============================================
-- NUR: LIFE RPG - Migration 011
-- Aggiunge subscription_tier per limite messaggi
-- ============================================

-- Aggiungi colonna subscription_tier
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'
CHECK (subscription_tier IN ('free', 'pro'));

-- Aggiorna funzioni per usare subscription_tier
CREATE OR REPLACE FUNCTION get_message_status(p_clerk_user_id TEXT)
RETURNS TABLE(
    messages_used INTEGER,
    messages_limit INTEGER,
    messages_remaining INTEGER,
    resets_at TIMESTAMPTZ,
    is_pro BOOLEAN
) AS $$
DECLARE
    v_profile RECORD;
    v_limit INTEGER;
    v_is_pro BOOLEAN;
BEGIN
    SELECT * INTO v_profile
    FROM profiles
    WHERE clerk_user_id = p_clerk_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 3, 3, NOW() + INTERVAL '1 day', FALSE;
        RETURN;
    END IF;

    -- Reset se necessario (check by date, not interval)
    IF DATE(v_profile.messages_reset_at) < CURRENT_DATE THEN
        UPDATE profiles
        SET messages_today = 0, messages_reset_at = NOW()
        WHERE clerk_user_id = p_clerk_user_id;

        v_profile.messages_today := 0;
        v_profile.messages_reset_at := NOW();
    END IF;

    -- Determina limite: 3 free, 20 pro
    v_is_pro := COALESCE(v_profile.subscription_tier, 'free') = 'pro';
    v_limit := CASE WHEN v_is_pro THEN 20 ELSE 3 END;

    RETURN QUERY SELECT
        v_profile.messages_today,
        v_limit,
        GREATEST(0, v_limit - v_profile.messages_today),
        v_profile.messages_reset_at + INTERVAL '1 day',
        v_is_pro;
END;
$$ LANGUAGE plpgsql;

-- Commento
COMMENT ON COLUMN profiles.subscription_tier IS 'Tier abbonamento: free (3 msg/day) o pro (20 msg/day)';
