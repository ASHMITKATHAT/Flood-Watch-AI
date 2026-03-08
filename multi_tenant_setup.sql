-- ==============================================================================
-- EQUINOX: District-Level Multi-Tenancy Setup
-- Phase 2: Supabase Auth & Multi-Tenancy
-- ==============================================================================

-- 1. Create the `profiles` table to store User metadata mapped to Supabase Auth UUID
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    district_id TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'authority',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING ( auth.uid() = id );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING ( auth.uid() = id );

-- ==============================================================================

-- 2. Add `district_id` column to all existing data tables to enforce data isolation
-- For 'sensor_data'
ALTER TABLE public.sensor_data 
ADD COLUMN IF NOT EXISTS district_id TEXT DEFAULT 'jaipur_01';

-- For 'active_alerts'
ALTER TABLE public.active_alerts 
ADD COLUMN IF NOT EXISTS district_id TEXT DEFAULT 'jaipur_01';

-- For 'civilian_reports'
ALTER TABLE public.civilian_reports 
ADD COLUMN IF NOT EXISTS district_id TEXT DEFAULT 'jaipur_01';

-- ==============================================================================

-- Optional instructions for the user:
-- A) After running this script in the Supabase SQL Editor, go to Auth -> Users.
-- B) Invite or create a new user (e.g., cmdr@equinox.local).
-- C) Copy the UUID of that new user.
-- D) Run this INSERT to manually create a profile for them:
--
-- INSERT INTO public.profiles (id, district_id, full_name, role)
-- VALUES ('<PASTE-NEW-USER-UUID-HERE>', 'jaipur_01', 'Commander Ashmit', 'authority');
--
-- E) In your backend/app.py logic or when inserting new data manually into sensor_data 
-- and active_alerts, ensure you specify `district_id = 'jaipur_01'` or else the frontend will not see it!
