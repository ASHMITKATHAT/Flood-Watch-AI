-- ============================================================
-- RLS Policy: Allow authenticated users to SELECT their own row
-- from the `profiles` table.
--
-- Run this in the Supabase Dashboard → SQL Editor.
-- This fixes the lockout issue for local_admin accounts.
-- ============================================================

-- Step 1: Enable RLS on the profiles table (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create the policy (users can only read their own profile row)
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);
