-- Phase 4: ChefBoo rate limiting (AI abuse + Gemini cost guard)
--
-- Every ai-chat invocation calls check_ai_rate_limit() before any Gemini work.
-- Limits are per-user, sliding fixed windows: 30 requests/hour and 100/day.
-- The counter lives in its own table; the check + increment happens atomically
-- inside one SECURITY DEFINER function so concurrent requests can't race past
-- the limit. Only the service role (the edge function) ever calls it.

create table if not exists public.ai_rate_limits (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  hour_window_start  timestamptz not null default now(),
  hour_count         integer     not null default 0,
  day_window_start   timestamptz not null default now(),
  day_count          integer     not null default 0,
  updated_at         timestamptz not null default now()
);

-- RLS on with no policies = deny all for anon/authenticated. The edge function
-- reaches this table only through the SECURITY DEFINER function below, so no
-- client ever needs direct access.
alter table public.ai_rate_limits enable row level security;

create or replace function public.check_ai_rate_limit(
  p_user_id    uuid,
  p_hour_limit integer default 30,
  p_day_limit  integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row         public.ai_rate_limits%rowtype;
  v_now         timestamptz := now();
  v_hour_count  integer;
  v_day_count   integer;
  v_allowed     boolean;
  v_retry_after integer := 0;
begin
  -- Ensure a row exists, then lock it so concurrent requests serialize.
  insert into public.ai_rate_limits (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_row from public.ai_rate_limits
  where user_id = p_user_id
  for update;

  -- Roll each window forward if it has elapsed.
  if v_now - v_row.hour_window_start >= interval '1 hour' then
    v_row.hour_window_start := v_now;
    v_row.hour_count := 0;
  end if;
  if v_now - v_row.day_window_start >= interval '1 day' then
    v_row.day_window_start := v_now;
    v_row.day_count := 0;
  end if;

  v_hour_count := v_row.hour_count;
  v_day_count  := v_row.day_count;

  if v_hour_count >= p_hour_limit then
    v_allowed := false;
    v_retry_after := ceil(extract(epoch from (v_row.hour_window_start + interval '1 hour' - v_now)))::int;
  elsif v_day_count >= p_day_limit then
    v_allowed := false;
    v_retry_after := ceil(extract(epoch from (v_row.day_window_start + interval '1 day' - v_now)))::int;
  else
    v_allowed := true;
    v_hour_count := v_hour_count + 1;  -- count only successful (allowed) calls
    v_day_count  := v_day_count + 1;
  end if;

  update public.ai_rate_limits
  set hour_window_start = v_row.hour_window_start,
      hour_count        = v_hour_count,
      day_window_start  = v_row.day_window_start,
      day_count         = v_day_count,
      updated_at        = v_now
  where user_id = p_user_id;

  return jsonb_build_object(
    'allowed',             v_allowed,
    'hour_count',          v_hour_count,
    'day_count',           v_day_count,
    'hour_limit',          p_hour_limit,
    'day_limit',           p_day_limit,
    'retry_after_seconds', greatest(v_retry_after, 0)
  );
end;
$$;

revoke all on function public.check_ai_rate_limit(uuid, integer, integer) from public;
grant execute on function public.check_ai_rate_limit(uuid, integer, integer) to service_role;
