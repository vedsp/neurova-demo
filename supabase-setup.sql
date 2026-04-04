-- =========================================================
-- NEUROVA — Supabase Database Setup
-- =========================================================
-- Run this SQL in your Supabase Dashboard:
--   1. Go to https://supabase.com/dashboard
--   2. Select your project
--   3. Click "SQL Editor" in the left sidebar
--   4. Paste this entire file and click "Run"
-- =========================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  phone TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'mr')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health concerns selected during onboarding
CREATE TABLE IF NOT EXISTS public.health_concerns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  concern_key TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lifestyle data from onboarding
CREATE TABLE IF NOT EXISTS public.lifestyle_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sleep_hours_avg NUMERIC(3,1),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active')),
  diet_type TEXT,
  stress_level TEXT CHECK (stress_level IN ('low', 'moderate', 'high', 'very_high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User goals from onboarding
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goal_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- Row Level Security (RLS)
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifestyle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Health concerns: users can only manage their own
CREATE POLICY "Users can view own health concerns"
  ON public.health_concerns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health concerns"
  ON public.health_concerns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health concerns"
  ON public.health_concerns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health concerns"
  ON public.health_concerns FOR DELETE
  USING (auth.uid() = user_id);

-- Lifestyle data: users can only manage their own
CREATE POLICY "Users can view own lifestyle data"
  ON public.lifestyle_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lifestyle data"
  ON public.lifestyle_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lifestyle data"
  ON public.lifestyle_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lifestyle data"
  ON public.lifestyle_data FOR DELETE
  USING (auth.uid() = user_id);

-- User goals: users can only manage their own
CREATE POLICY "Users can view own goals"
  ON public.user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- =========================================================
-- Auto-create profile on user signup (trigger)
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
