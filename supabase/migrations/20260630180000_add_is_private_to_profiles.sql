-- Add is_private flag to profiles for network privacy
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
