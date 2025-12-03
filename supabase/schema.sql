-- =============================================
-- ENCICLOPEDIA DELLA VITA - DATABASE SCHEMA
-- Versione con CLERK per autenticazione
-- Esegui questo SQL su Supabase Dashboard > SQL Editor
-- =============================================

-- 1. PROFILES (collegato a Clerk user)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LIFE AREAS (10 aree della vita per utente)
CREATE TABLE IF NOT EXISTS life_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    area_type TEXT NOT NULL CHECK (area_type IN (
        'salute', 'soldi', 'relazioni', 'lavoro', 'hobby',
        'crescita', 'casa', 'sociale', 'spirituale', 'futuro'
    )),
    data JSONB DEFAULT '{}'::jsonb,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clerk_user_id, area_type)
);

-- 3. SOLUTIONS (piani proposti dal Coach AI)
CREATE TABLE IF NOT EXISTS solutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    steps JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'proposta' CHECK (status IN ('proposta', 'accettata', 'rifiutata')),
    area_type TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONVERSATIONS (storico chat per memoria AI)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    title TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AI INSIGHTS (insight generati dall AI)
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('priorita', 'suggerimento', 'alert', 'trend')),
    content TEXT NOT NULL,
    area_related TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ENCYCLOPEDIA CONTENT (contenuti enciclopedia)
CREATE TABLE IF NOT EXISTS encyclopedia_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    content TEXT NOT NULL,
    ai_generated BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES per performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_clerk ON profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_life_areas_clerk ON life_areas(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_solutions_clerk ON solutions(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(status);
CREATE INDEX IF NOT EXISTS idx_conversations_clerk ON conversations(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_clerk ON ai_insights(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_category ON encyclopedia_content(category);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_slug ON encyclopedia_content(slug);

-- =============================================
-- DONE! Schema ready for Clerk + Supabase
-- =============================================
