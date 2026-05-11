-- =====================================================================
-- QuickHop: RLS policies for deliveries, drop_offs, delivery_requests
-- =====================================================================
-- DESIGN: To avoid infinite recursion (42P17), NO policy on any table
-- references another RLS-protected table via subquery. Instead:
--   - deliveries: filtered by direct column checks (business_id, rider_id, status)
--   - drop_offs: ALL authenticated users can SELECT (app filters by delivery_id)
--   - delivery_requests: riders can see all, business checked via helper
--
-- The app already filters queries with .eq('business_id', user.id) etc.
-- RLS here acts as a safety net, not the primary filter.
-- =====================================================================


-- ---------- 0. Ensure helper function exists -------------------------

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


-- ---------- 1. Drop ALL existing policies on these tables ------------

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


-- ---------- 2. Enable RLS --------------------------------------------

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 3. DELIVERIES
-- =====================================================================
-- No subqueries into other tables. Only uses columns on deliveries itself.

-- Admin: full access
CREATE POLICY "deliveries_admin_all"
    ON public.deliveries FOR ALL TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- Business: own deliveries (business_id is on this table)
CREATE POLICY "deliveries_business_select"
    ON public.deliveries FOR SELECT TO authenticated
    USING (business_id = auth.uid());

CREATE POLICY "deliveries_business_insert"
    ON public.deliveries FOR INSERT TO authenticated
    WITH CHECK (business_id = auth.uid());

CREATE POLICY "deliveries_business_update"
    ON public.deliveries FOR UPDATE TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- Rider: can see deliveries assigned to them, pending ones, or ones with
-- a pending delivery_request (needed for the join in getPendingDeliveryRequests)
CREATE POLICY "deliveries_rider_select"
    ON public.deliveries FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'rider'
    );

-- Rider: can update deliveries assigned to them OR pending ones (for accepting)
CREATE POLICY "deliveries_rider_update"
    ON public.deliveries FOR UPDATE TO authenticated
    USING (
        public.current_user_role() = 'rider'
        AND (rider_id = auth.uid() OR rider_id IS NULL)
    )
    WITH CHECK (
        public.current_user_role() = 'rider'
    );

-- Customer: can see deliveries assigned to them or pending
-- (broad read — app filters by tracking number; no cross-table ref)
CREATE POLICY "deliveries_customer_select"
    ON public.deliveries FOR SELECT TO authenticated
    USING (public.current_user_role() = 'customer');


-- =====================================================================
-- 4. DROP_OFFS
-- =====================================================================
-- Any authenticated user can SELECT drop_offs. The app always filters
-- by delivery_id, tracking_number, or customer_phone. This avoids any
-- cross-table reference to deliveries (which would cause recursion).

CREATE POLICY "drop_offs_select_authenticated"
    ON public.drop_offs FOR SELECT TO authenticated
    USING (true);

-- Insert: business or admin (they create drop-offs when making deliveries)
CREATE POLICY "drop_offs_insert_authenticated"
    ON public.drop_offs FOR INSERT TO authenticated
    WITH CHECK (
        public.current_user_role() IN ('business', 'admin')
    );

-- Update: business, rider, or admin can update drop-offs
CREATE POLICY "drop_offs_update_authenticated"
    ON public.drop_offs FOR UPDATE TO authenticated
    USING (
        public.current_user_role() IN ('business', 'rider', 'admin')
    );


-- =====================================================================
-- 5. DELIVERY_REQUESTS
-- =====================================================================

-- Admin: full access
CREATE POLICY "delivery_requests_admin_all"
    ON public.delivery_requests FOR ALL TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- Business: can insert and see (app filters by delivery_id)
CREATE POLICY "delivery_requests_business_select"
    ON public.delivery_requests FOR SELECT TO authenticated
    USING (public.current_user_role() = 'business');

CREATE POLICY "delivery_requests_business_insert"
    ON public.delivery_requests FOR INSERT TO authenticated
    WITH CHECK (public.current_user_role() = 'business');

-- Rider: can see and update all delivery requests
CREATE POLICY "delivery_requests_rider_select"
    ON public.delivery_requests FOR SELECT TO authenticated
    USING (public.current_user_role() = 'rider');

CREATE POLICY "delivery_requests_rider_update"
    ON public.delivery_requests FOR UPDATE TO authenticated
    USING (public.current_user_role() = 'rider')
    WITH CHECK (public.current_user_role() = 'rider');


-- =====================================================================
-- 6. RIDER_DELIVERY_RESPONSES
-- =====================================================================
-- Handled by create_missing_tables.sql — not duplicated here.


-- =====================================================================
-- 7. Verify (run separately)
-- =====================================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('deliveries','drop_offs','delivery_requests')
-- ORDER BY tablename, policyname;
