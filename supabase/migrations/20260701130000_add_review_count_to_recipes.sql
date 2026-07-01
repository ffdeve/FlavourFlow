-- Phase 3: reviews & ratings
--
-- `submitRecipeReview` writes both the running average and the total review
-- count back onto the recipe row so cards can show "★ 4.6 (128)" without a
-- separate count query. `average_rating` already exists; add `review_count`.

alter table public.recipes
  add column if not exists review_count integer not null default 0;

-- Backfill from any reviews that already exist.
update public.recipes r
set review_count = sub.cnt
from (
  select recipe_id, count(*)::int as cnt
  from public.reviews
  group by recipe_id
) sub
where sub.recipe_id = r.id;

-- ── reviews RLS ───────────────────────────────────────────────────────────────
-- The review form (recipe-detail "Reviews" tab) is new in Phase 3, so make sure
-- the table's policies actually allow it: anyone can read, but a user may only
-- write/update their own row. Idempotent — safe to re-run.
alter table public.reviews enable row level security;
drop policy if exists "reviews_select_all" on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_select_all" on public.reviews
  for select using (true);
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);
create policy "reviews_update_own" on public.reviews
  for update using (auth.uid() = user_id);
