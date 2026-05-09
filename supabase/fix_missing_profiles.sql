-- =====================================================================
-- QuickHop: Fix missing profiles + broken RLS (infinite recursion)
-- =====================================================================
-- Problems addressed:
--   A) auth.users has rows but public.profiles is empty -> "failed to
--      load profile" after successful login.
--   B) Existing RLS policies on public.profiles self-reference the
--      profiles table (e.g. admin check), causing Postgres error
--      42P17 "infinite recursion detected in policy for relation
--      'profiles'" on every SELECT.
--
-- This script:
--   1. Drops ALL existing policies on public.profiles (clean slate).
--   2. Creates a SECURITY DEFINER helper that returns the caller's role
--      without going through RLS (breaks the recursion cycle).
--   3. Creates minimal, non-recursive policies (own-row + admin-all).
--   4. Installs/refreshes a trigger so every new auth user gets a
--      profile row automatically.
--   5. Backfills profiles for all existing auth.users.
--
-- How to run:
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.
-- =====================================================================


-- ---------- 0. Extensions we rely on ----------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------- 1. Drop every existing policy on public.profiles ----------
-- This is what actually breaks the recursion. We don't know what was
-- defined before, so we drop them all, then recreate clean ones.

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END
$$;


-- ---------- 2. Helper: get current user's role WITHOUT hitting RLS ----
-- SECURITY DEFINER makes the function run with the function owner's
-- privileges, bypassing RLS on profiles. This is the standard pattern
-- for fixing "policy references its own table" recursion.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;


-- ---------- 3. Recreate minimum, NON-recursive RLS policies ----------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Own row
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin: full read/update across all profiles, via SECURITY DEFINER
-- helper so it does NOT re-trigger RLS on profiles.
CREATE POLICY "profiles_select_admin"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.current_user_role() = 'admin');

CREATE POLICY "profiles_update_admin"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');


-- ---------- 4. Auto-create profile on new auth user ------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resolved_role TEXT;
    resolved_name TEXT;
    resolved_phone TEXT;
BEGIN
    resolved_role  := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    resolved_name  := COALESCE(NEW.raw_user_meta_data->>'name',
                               split_part(NEW.email, '@', 1));
    resolved_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');

    IF resolved_role NOT IN ('admin','customer','business','rider') THEN
        resolved_role := 'customer';
    END IF;

    INSERT INTO public.profiles (id, email, name, role, phone, is_available)
    VALUES (
        NEW.id,
        NEW.email,
        resolved_name,
        resolved_role,
        resolved_phone,
        CASE WHEN resolved_role = 'rider' THEN true ELSE NULL END
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ---------- 5. Backfill profiles for existing auth users -------------

INSERT INTO public.profiles (id, email, name, role, phone, is_available)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS name,
    CASE
        WHEN COALESCE(u.raw_user_meta_data->>'role','customer')
             IN ('admin','customer','business','rider')
        THEN u.raw_user_meta_data->>'role'
        ELSE 'customer'
    END AS role,
    NULLIF(u.raw_user_meta_data->>'phone', '') AS phone,
    CASE WHEN u.raw_user_meta_data->>'role' = 'rider' THEN true ELSE NULL END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;


-- ---------- 6. Sanity checks (run separately if you want) -------------
-- SELECT policyname FROM pg_policies
--   WHERE schemaname='public' AND tablename='profiles';
--
-- SELECT u.email, p.role, p.name
--   FROM auth.users u
--   LEFT JOIN public.profiles p ON p.id = u.id
--   ORDER BY u.created_at;
