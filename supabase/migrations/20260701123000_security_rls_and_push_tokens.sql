-- Security hardening (RLS audit fixes)
--
-- Audit (anon/publishable key probe) found two tables readable by anonymous
-- users that should be private, plus push tokens needed a non-public home.

-- ── 1. favorites: a user's likes are private to them ──────────────────────────
alter table public.favorites enable row level security;
drop policy if exists "Enable read access for all users" on public.favorites;
drop policy if exists "favorites_select_all" on public.favorites;
drop policy if exists "Public favorites are viewable by everyone" on public.favorites;
drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

-- ── 2. recipe_interactions: behavior tracking is private to the owner ─────────
--    (the recommendation engine reads these via the service role, bypassing RLS)
alter table public.recipe_interactions enable row level security;
drop policy if exists "Enable read access for all users" on public.recipe_interactions;
drop policy if exists "interactions_select_all" on public.recipe_interactions;
drop policy if exists "interactions_select_own" on public.recipe_interactions;
drop policy if exists "interactions_insert_own" on public.recipe_interactions;
create policy "interactions_select_own" on public.recipe_interactions
  for select using (auth.uid() = user_id);
create policy "interactions_insert_own" on public.recipe_interactions
  for insert with check (auth.uid() = user_id);

-- ── 3. push tokens in their own owner-private table ───────────────────────────
--    NOT a column on the public `profiles` table (which is world-readable and
--    queried with select=*), so a token can never leak via a profile read.
drop table if exists public.user_push_tokens;
create table public.user_push_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now()
);
alter table public.user_push_tokens enable row level security;
create policy "push_tokens_select_own" on public.user_push_tokens
  for select using (auth.uid() = user_id);
create policy "push_tokens_insert_own" on public.user_push_tokens
  for insert with check (auth.uid() = user_id);
create policy "push_tokens_update_own" on public.user_push_tokens
  for update using (auth.uid() = user_id);

-- Clean up the earlier (unapplied) attempt to keep tokens on profiles.
alter table public.profiles drop column if exists push_token;
