-- Paper Banana Web App — Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ═══════════════════════════════════════════════════════════════════
-- 1. Profiles table (auto-created on user signup)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    gemini_api_key_encrypted TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- 2. Generations table (one row per generation job)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Input
    source_context TEXT NOT NULL,
    communicative_intent TEXT NOT NULL,
    diagram_type TEXT NOT NULL DEFAULT 'methodology',
    raw_data JSONB,

    -- Pipeline config
    refinement_iterations INTEGER DEFAULT 3,

    -- Job status
    status TEXT NOT NULL DEFAULT 'pending',
    progress TEXT,
    error_message TEXT,

    -- Output (populated on completion)
    image_storage_path TEXT,
    image_url TEXT,
    thumbnail_storage_path TEXT,
    description TEXT,
    run_metadata JSONB,
    iterations JSONB,

    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Custom assets table (user-uploaded logos, brand images)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS custom_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_assets_user_id ON custom_assets(user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Row Level Security (users can only access their own data)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_assets ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Generations
CREATE POLICY "Users can view own generations" ON generations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generations" ON generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Custom assets
CREATE POLICY "Users can view own assets" ON custom_assets
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON custom_assets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON custom_assets
    FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 5. Storage buckets (create via Supabase Dashboard → Storage)
-- ═══════════════════════════════════════════════════════════════════
-- Create two PRIVATE buckets:
--   1. "generations" — for generated images and thumbnails
--   2. "assets"      — for user-uploaded logos and brand images
-- The backend uploads using the service role key.
-- The frontend accesses files via signed URLs provided by the backend.
