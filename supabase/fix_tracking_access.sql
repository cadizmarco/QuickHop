-- =====================================================================
-- QuickHop: Allow tracking to work for both logged-in and anonymous users
-- =====================================================================
-- The /track page is public (no login required). Supabase queries run
-- as 'anon' role when not logged in. All existing RLS policies are
-- TO authenticated only, so tracking fails for anonymous users.
--
-- This adds SELECT policies for the 'anon' role on the tables needed
-- for tracking: drop_offs, deliveries, and profiles.
-- =====================================================================


-- ---------- 1. drop_offs: anon can SELECT by tracking_number ---------

DROP POLICY IF EXISTS "drop_offs_anon_select" ON public.drop_offs;
CREATE POLICY "drop_offs_anon_select"
    ON public.drop_offs
    FOR SELECT
    TO anon
    USING (tracking_number IS NOT NULL);


-- ---------- 2. deliveries: anon can SELECT (needed for join) ---------

DROP POLICY IF EXISTS "deliveries_anon_select" ON public.deliveries;
CREATE POLICY "deliveries_anon_select"
    ON public.deliveries
    FOR SELECT
    TO anon
    USING (true);


-- ---------- 3. profiles: anon can SELECT (needed for business/rider info join)

DROP POLICY IF EXISTS "profiles_anon_select" ON public.profiles;
CREATE POLICY "profiles_anon_select"
    ON public.profiles
    FOR SELECT
    TO anon
    USING (true);


-- ---------- 4. Also ensure authenticated users can read all profiles --
-- (In case fix_profiles_read.sql wasn't run yet)

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);


-- ---------- 5. Verify ------------------------------------------------
-- Test as anon (no auth):
-- SELECT tracking_number, customer_name, status
-- FROM public.drop_offs
-- WHERE tracking_number = 'QH-88SBMR8Y';
