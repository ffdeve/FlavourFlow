-- Phase 0 DB cleanup — drop the unused, empty `cooking_sessions` table.
--
-- Origin: introduced in commit 23a92ff ("cooking mode sync") as an early
-- attempt at SERVER-SIDE cooking-progress persistence (columns: id, user_id,
-- recipe_id, current_step).
--
-- Why it is safe to drop:
--   * 0 rows in production.
--   * Referenced NOWHERE in the app (no `.from("cooking_sessions")`).
--   * Cooking resume is fully implemented LOCALLY via AsyncStorage in
--     src/app/cooking-mode.tsx (keys `cooking:resume:*` and
--     `cooking:steplog:*`, with a "You left off at Step N" resume modal).
--   * Cross-device cooking recovery is explicitly out of scope (plan.md).
--
-- No data or functionality is lost; the documented "Cooking Session" state
-- transitions are satisfied by the in-app local flow, not this table.

drop table if exists public.cooking_sessions;
