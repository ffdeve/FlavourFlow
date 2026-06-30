-- Phase 2c: store each user's Expo push token so the notifications webhook can
-- deliver background pushes. Nullable; populated on app start after permission.
alter table public.profiles add column if not exists push_token text;
