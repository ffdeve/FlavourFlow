-- ═════════════════════════════════════════════════════════════════════════
-- FlavourFlow — Supabase audit (READ ONLY, safe to run in the SQL editor)
-- Verifies the live database against everything the app code references.
-- Run each block and compare with the "expected" notes.
-- ═════════════════════════════════════════════════════════════════════════

-- ── 1. Tables the app queries — all must exist ──────────────────────────────
-- Expected 19 rows, all present = true.
SELECT t.name AS expected_table,
       to_regclass('public.' || t.name) IS NOT NULL AS present
FROM unnest(ARRAY[
  'recipes','follows','user_preferences','recipe_interactions','posts',
  'profiles','favorites','recipe_recommendations','ai_generated_recipes',
  'post_likes','recipe_translations','notifications','kitchen_essentials',
  'ingredients','comments','chefboo_events','search_history',
  'recommendation_events_queue','cuisine_items'
]) AS t(name)
ORDER BY present, expected_table;

-- ── 2. RLS status + policy counts per table ─────────────────────────────────
-- DANGER SIGN: rls_enabled = true AND select_policies = 0 → that table
-- silently returns [] to the app (this is how "ingredients disappear").
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       count(p.polname) FILTER (WHERE p.polcmd = 'r') AS select_policies,
       count(p.polname) FILTER (WHERE p.polcmd = 'a') AS insert_policies,
       count(p.polname) FILTER (WHERE p.polcmd = 'w') AS update_policies,
       count(p.polname) FILTER (WHERE p.polcmd = 'd') AS delete_policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- ── 3. Full policy definitions (review USING / WITH CHECK expressions) ──────
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ── 4. Storage buckets ───────────────────────────────────────────────────────
-- The app uploads to EXACTLY these bucket ids (note the intentional typo!):
--   'user-avartars'  (avatars + banners — yes, "avartars")
--   'post-images'
--   'recipe-images'
-- All three must exist and be PUBLIC (the app uses getPublicUrl).
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;

-- Storage RLS: authenticated users must be allowed to INSERT into those
-- buckets, or every upload fails with "new row violates row-level security".
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;

-- ── 5. RPC functions the app calls — all three must exist ────────────────────
--   search_recipes_ranked(p_user_id, p_query, p_ingredients, p_limit)  ← ai-chat
--   get_dish_categories()                                              ← app
--   claim_recommendation_events(batch_size)                            ← generate-recommendations
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('search_recipes_ranked','get_dish_categories','claim_recommendation_events')
ORDER BY p.proname;

-- ── 6. Urdu columns really dropped? ──────────────────────────────────────────
-- Migration 20260630190000 dropped these. The app no longer selects them, but
-- this confirms the DB state. Expected: 0 rows (or only cuisine_items.name_urdu
-- — the migration targeted 'cuisine_catalog', which may have been a typo for
-- 'cuisine_items').
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('name_urdu','title_urdu','instruction_urdu')
ORDER BY table_name;

-- ── 7. Realtime publication ──────────────────────────────────────────────────
-- Migration 20260630161500 DROPPED and recreated supabase_realtime with ONLY
-- 'notifications'. The app currently only subscribes to notifications, so this
-- is OK today — but if you add realtime features later (live comments, likes),
-- remember to ADD those tables here.
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ── 8. Columns the recommendation code sorts/filters on ─────────────────────
-- Expected: recipes.average_rating, recipes.allergens, recipes.image_url,
-- recipes.dish_category, recipes.tags all present.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'recipes'
  AND column_name IN ('average_rating','allergens','image_url','dish_category','tags','ingredients','steps')
ORDER BY column_name;
