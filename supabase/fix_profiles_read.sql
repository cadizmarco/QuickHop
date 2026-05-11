-- =====================================================================
-- QuickHop: Allow all authenticated users to read profiles
-- =====================================================================
-- Problem: Tracking queries join deliveries -> profiles (for business
-- name, rider name/phone). RLS on profiles only allows reading your
-- OWN row, so the join fails and tracking returns "not found".
--
-- Fix: Replace the restrictive "own row only" SELECT policy with one
-- that allows any authenticated user to read any profile. The profiles
-- table only contains name, email, phone, role — not sensitive data.
-- =====================================================================

-- Drop existing SELECT policies on profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

-- Allow any authenticated user to read any profile
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Keep insert/update restricted to own row
-- (These should already exist, but ensure they do)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin can also update any profile
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');
