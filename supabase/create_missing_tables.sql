-- =====================================================================
-- QuickHop: Create missing tables and functions
-- =====================================================================
-- The rider_delivery_responses table and get_earliest_acceptor function
-- are required for the accept/reject delivery flow.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- =====================================================================


-- ---------- 1. rider_delivery_responses table ------------------------

CREATE TABLE IF NOT EXISTS public.rider_delivery_responses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_request_id uuid NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
    rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN ('accepted', 'rejected')),
    response_timestamp timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    -- Each rider can only respond once per request
    UNIQUE (delivery_request_id, rider_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rider_responses_request
    ON public.rider_delivery_responses(delivery_request_id);
CREATE INDEX IF NOT EXISTS idx_rider_responses_rider
    ON public.rider_delivery_responses(rider_id);


-- ---------- 2. RLS for rider_delivery_responses ----------------------

ALTER TABLE public.rider_delivery_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (safe re-run)
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'rider_delivery_responses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rider_delivery_responses', pol.policyname);
    END LOOP;
END
$$;

-- Admin: full access
CREATE POLICY "rider_responses_admin_all"
    ON public.rider_delivery_responses FOR ALL TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- Rider: can insert their own responses
CREATE POLICY "rider_responses_rider_insert"
    ON public.rider_delivery_responses FOR INSERT TO authenticated
    WITH CHECK (
        public.current_user_role() = 'rider'
        AND rider_id = auth.uid()
    );

-- Rider: can see their own responses
CREATE POLICY "rider_responses_rider_select"
    ON public.rider_delivery_responses FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'rider'
        AND rider_id = auth.uid()
    );

-- Business: can see responses for their delivery requests
CREATE POLICY "rider_responses_business_select"
    ON public.rider_delivery_responses FOR SELECT TO authenticated
    USING (public.current_user_role() = 'business');


-- ---------- 3. get_earliest_acceptor function ------------------------
-- Returns the rider_id of the first rider who accepted a given request.

CREATE OR REPLACE FUNCTION public.get_earliest_acceptor(p_delivery_request_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT rider_id
    FROM public.rider_delivery_responses
    WHERE delivery_request_id = p_delivery_request_id
      AND action = 'accepted'
    ORDER BY response_timestamp ASC
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_earliest_acceptor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_earliest_acceptor(uuid) TO authenticated;


-- ---------- 4. Verify ------------------------------------------------
-- SELECT * FROM public.rider_delivery_responses LIMIT 5;
-- SELECT public.get_earliest_acceptor('some-uuid-here');
