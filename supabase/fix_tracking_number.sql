-- =====================================================================
-- QuickHop: Fix tracking number format
-- =====================================================================
-- Changes tracking numbers from UUID/complex format to a simple
-- 8-character uppercase alphanumeric format like "QH-A3K7M2X9"
-- =====================================================================


-- ---------- 1. Create a function to generate simple tracking numbers --

DROP FUNCTION IF EXISTS public.generate_tracking_number() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INT;
BEGIN
    -- Generate 8 random characters (no ambiguous chars like 0/O, 1/I/L)
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN 'QH-' || result;
END;
$$;


-- ---------- 2. Update the default value for tracking_number ----------
-- If there's an existing trigger, replace it. Otherwise set a default.

-- Option A: Set column default (works for new inserts)
ALTER TABLE public.drop_offs
    ALTER COLUMN tracking_number SET DEFAULT public.generate_tracking_number();

-- Option B: Create/replace trigger for more control
CREATE OR REPLACE FUNCTION public.set_tracking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
        -- Keep generating until we get a unique one
        LOOP
            NEW.tracking_number := public.generate_tracking_number();
            -- Check uniqueness
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM public.drop_offs
                WHERE tracking_number = NEW.tracking_number
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tracking_number_trigger ON public.drop_offs;
CREATE TRIGGER set_tracking_number_trigger
    BEFORE INSERT ON public.drop_offs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tracking_number();


-- ---------- 3. Update existing tracking numbers to new format --------
-- (Optional) Convert existing complex tracking numbers to the new format

UPDATE public.drop_offs
SET tracking_number = public.generate_tracking_number()
WHERE tracking_number IS NOT NULL
  AND tracking_number NOT LIKE 'QH-%';


-- ---------- 4. Verify ------------------------------------------------
-- SELECT id, tracking_number FROM public.drop_offs LIMIT 10;
