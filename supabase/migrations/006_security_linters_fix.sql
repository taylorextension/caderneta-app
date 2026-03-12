-- 006_security_linters_fix.sql

-- 1. Function Search Path Mutable for `get_inicio`
-- The linter complains because search_path isn't defined explicitly at creation time or is vulnerable to injection.
-- We apply an empty search_path so it relies only on fully qualified schema names (e.g. public.notas) OR explicitly strictly `public`.
ALTER FUNCTION public.get_inicio() SET search_path = public;

-- 2. Function Search Path Mutable for the internal/postgREST auto-generated `count_estimate` if it exists.
-- It's inside a pg_temp schema, let's catch public count_estimate if any, but since pg_temp changes per session, 
-- usually the linter flags any function missing this. We'll explicitly alter it if it's in public. 
-- For pg_temp_56, we can't alter it directly as it's a transient schema, but we can ensure standard PostgREST functions are pinned.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_estimate' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.count_estimate() SET search_path = public;
  END IF;
END $$;

-- 3. RLS Policy Always True for `eventos` table (public_insert_eventos)
-- The linter found an old `WITH CHECK (true)` policy lingering. We drop any permissive insert policy.
DROP POLICY IF EXISTS "public_insert_eventos" ON public.eventos;
DROP POLICY IF EXISTS "public_write" ON public.eventos;

-- Ensure the proper write validation policy remains
DROP POLICY IF EXISTS "validated_write" ON public.eventos;
CREATE POLICY "validated_write" ON public.eventos FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);
