-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: lookup tables (ingredients, kitchen_essentials, cuisine_items) must be
-- readable by the app. If RLS is enabled on a table with NO select policy,
-- PostgREST returns an empty array WITHOUT an error — which renders every
-- ingredient picker (fridge modal, AI chat, create-recipe, onboarding) empty.
--
-- Also: ai_generated_recipes is written by the ai-chat Edge Function using the
-- service role (bypasses RLS), but the APP reads it (ai-recipe-detail) and
-- updates is_saved with the user's own JWT — that needs owner policies.
--
-- Everything below is idempotent and guarded, so it is safe to run on a
-- database in any state.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Public read access for lookup/catalog tables ──
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ingredients', 'kitchen_essentials', 'cuisine_items']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      -- Keep RLS on (defense in depth), but guarantee a read policy exists.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = t
          AND cmd = 'SELECT'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "Public read access" ON public.%I FOR SELECT USING (true)',
          t
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- ── 2. ai_generated_recipes: owner can read + toggle is_saved ──
DO $$
BEGIN
  IF to_regclass('public.ai_generated_recipes') IS NOT NULL THEN
    ALTER TABLE public.ai_generated_recipes ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ai_generated_recipes' AND cmd = 'SELECT'
    ) THEN
      CREATE POLICY "Users can read own AI recipes"
        ON public.ai_generated_recipes FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ai_generated_recipes' AND cmd = 'UPDATE'
    ) THEN
      CREATE POLICY "Users can update own AI recipes"
        ON public.ai_generated_recipes FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;
