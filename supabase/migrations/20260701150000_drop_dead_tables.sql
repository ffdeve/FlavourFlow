-- Schema cleanup: drop two abandoned tables.
--
-- Both are empty (0 rows) and have zero references anywhere in the app:
--   • recipe_appliances    — an earlier join-table design for appliances that
--                            was replaced by the `kitchen_essentials` catalog
--                            table + a `recipes.kitchen_essentials[]` column.
--   • application_settings  — never used; app/assistant settings live in
--                            `profiles.assistant_settings` (jsonb) and
--                            `user_preferences`.

drop table if exists public.recipe_appliances cascade;
drop table if exists public.application_settings cascade;
