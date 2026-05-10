-- =====================================================================
-- QuickHop: RLS policies for deliveries, drop_offs, delivery_requests
-- =====================================================================
-- Problem: Riders can't see pending delivery requests because RLS
-- policies are missing or broken on these tables.
--
-- This script:
--   1. Drops all existing policies on the three tables (clean slate).
--   2. Creates non-recursive policies using the SECURITY DEFINER
--      helper function (public.current_user_role()) that was created
--      in fix_missing_profiles.sql.
--   3. Ensures the helper function exists (safe to re-run).
--
-- Run AFTER fix_missing_profiles.sql.
-- Safe to re-run multiple times.
-- =====================================================================


-- ---------- 0. Ensure helper function exists -------------------------
-- (Already created by fix_missing_profiles.sql, but just in case)

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


-- ---------- 1. Drop all existing policies ----------------------------

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('deliveries', 'drop_offs', 'delivery_requests')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END
$$;


-- ---------- 2. Enable RLS on all tables ------------------------------

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;


-- ---------- 3. DELIVERIES policies -----------------------------------

-- Admin: full access
CREATE POLICY "deliveries_admin_all"
    ON public.deliveries
    FOR ALL
    TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- Business: can see and manage their own deliveries
CREATE POLICY "deliveries_business_select"
    ON public.deliveries
    FOR SELECT
    TO authenticated
    USING (business_id = auth.uid());

CREATE POLICY "deliveries_business_insert"
    ON public.deliveries
    FOR INSERT
    TO authenticated
    WITH CHECK (business_id = auth.uid());

CREATE POLICY "deliveries_business_update"
    ON public.deliveries
    FOR UPDATE
    TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- Rider: can see deliveries assigned to them OR pending (for accepting)
CREATE POLICY "deliveries_rider_select"
    ON public.deliveries
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'rider'
        AND (
            rider_id = auth.uid()
            OR status = 'pending'
        )
    );

-- Rider: can update deliveries assigned to them (status changes)
CREATE POLICY "deliveries_rider_update"
    ON public.deliveries
    FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() = 'rider'
        AND rider_id = auth.uid()
    )
    WITH CHECK (
        public.current_user_role() = 'rider'
        AND rider_id = auth.uid()
    );

-- Customer: can see deliveries where they have a drop-off (via tracking)
CREATE POLICY "deliveries_customer_select"
    ON public.deliveries
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'customer'
        AND id IN (
            SELECT delivery_id FROM public.drop_offs
            WHERE customer_phone IN (
                SELECT phone FROM public.profiles WHERE id = auth.uid()
            )
        )
    );


-- ---------- 4. DROP_OFFS policies ------------------------------------

-- Admin: full access
CREATE POLICY "drop_offs_admin_all"
    ON public.drop_offs
    FOR ALL
    TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- Business: can manage drop-offs for their deliveries
CREATE POLICY "drop_offs_business_select"
    ON public.drop_offs
    FOR SELECT
    TO authenticated
    USING (
        delivery_id IN (
            SELECT id FROM public.deliveries WHERE business_id = auth.uid()
        )
    );

CREATE POLICY "drop_offs_business_insert"
    ON public.drop_offs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        delivery_id IN (
            SELECT id FROM public.deliveries WHERE business_id = auth.uid()
        )
    );

CREATE POLICY "drop_offs_business_update"
    ON public.drop_offs
    FOR UPDATE
    TO authenticated
    USING (
        delivery_id IN (
            SELECT id FROM public.deliveries WHERE business_id = auth.uid()
        )
    );

-- Rider: can see and update drop-offs for deliveries assigned to them
-- or for pending deliveries (so they can see what they're accepting)
CREATE POLICY "drop_offs_rider_select"
    ON public.drop_offs
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'rider'
        AND delivery_id IN (
            SELECT id FROM public.deliveries
            WHERE rider_id = auth.uid() OR status = 'pending'
        )
    );

CREATE POLICY "drop_offs_rider_update"
    ON public.drop_offs
    FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() = 'rider'
        AND delivery_id IN (
            SELECT id FROM public.deliveries WHERE rider_id = auth.uid()
        )
    );

-- Customer: can see their own drop-offs (by phone match or tracking)
CREATE POLICY "drop_offs_customer_select"
    ON public.drop_offs
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'customer'
        AND (
            customer_phone IN (
                SELECT phone FROM public.profiles WHERE id = auth.uid()
            )
            OR customer_email IN (
                SELECT email FROM public.profiles WHERE id = auth.uid()
            )
        )
    );


-- ---------- 5. DELIVERY_REQUESTS policies ----------------------------

-- Admin: full access
CREATE POLICY "delivery_requests_admin_all"
    ON public.delivery_requests
    FOR ALL
    TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- Business: can create and view requests for their deliveries
CREATE POLICY "delivery_requests_business_select"
    ON public.delivery_requests
    FOR SELECT
    TO authenticated
    USING (
        delivery_id IN (
            SELECT id FROM public.deliveries WHERE business_id = auth.uid()
        )
    );

CREATE POLICY "delivery_requests_business_insert"
    ON public.delivery_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        delivery_id IN (
            SELECT id FROM public.deliveries WHERE business_id = auth.uid()
        )
    );

-- Rider: can see ALL pending requests (so they can accept them)
-- and requests they've already accepted
CREATE POLICY "delivery_requests_rider_select"
    ON public.delivery_requests
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'rider'
        AND (
            status = 'pending_acceptance'
            OR accepted_by_rider_id = auth.uid()
        )
    );

-- Rider: can update requests (to accept/reject them)
CREATE POLICY "delivery_requests_rider_update"
    ON public.delivery_requests
    FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() = 'rider'
        AND status = 'pending_acceptance'
    )
    WITH CHECK (
        public.current_user_role() = 'rider'
    );


-- ---------- 6. RIDER_DELIVERY_RESPONSES policies ---------------------
-- Only created if the table exists (it may not have been set up yet)

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'rider_delivery_responses'
    ) THEN
        ALTER TABLE public.rider_delivery_responses ENABLE ROW LEVEL SECURITY;

        EXECUTE 'CREATE POLICY "rider_responses_admin_all"
            ON public.rider_delivery_responses
            FOR ALL
            TO authenticated
            USING (public.current_user_role() = ''admin'')
            WITH CHECK (public.current_user_role() = ''admin'')';

        EXECUTE 'CREATE POLICY "rider_responses_rider_insert"
            ON public.rider_delivery_responses
            FOR INSERT
            TO authenticated
            WITH CHECK (
                public.current_user_role() = ''rider''
                AND rider_id = auth.uid()
            )';

        EXECUTE 'CREATE POLICY "rider_responses_rider_select"
            ON public.rider_delivery_responses
            FOR SELECT
            TO authenticated
            USING (
                public.current_user_role() = ''rider''
                AND rider_id = auth.uid()
            )';
    END IF;
END
$$;


-- ---------- 7. Allow anonymous/public SELECT for tracking ------------
-- The TrackOrder page may be used without login (tracking by number).
-- If you want unauthenticated tracking, uncomment these:

-- CREATE POLICY "drop_offs_anon_tracking"
--     ON public.drop_offs
--     FOR SELECT
--     TO anon
--     USING (tracking_number IS NOT NULL);
--
-- CREATE POLICY "deliveries_anon_tracking"
--     ON public.deliveries
--     FOR SELECT
--     TO anon
--     USING (
--         id IN (SELECT delivery_id FROM public.drop_offs WHERE tracking_number IS NOT NULL)
--     );


-- ---------- 8. Verify ------------------------------------------------
-- Run separately to confirm:
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('deliveries','drop_offs','delivery_requests','rider_delivery_responses')
-- ORDER BY tablename, policyname;
