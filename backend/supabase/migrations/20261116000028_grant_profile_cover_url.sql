-- Grant authenticated users permission to set and update their profile cover_url
-- (Required because 20261112000008_admin_control_center_security.sql restricts
--  INSERT/UPDATE on public.profiles to explicit column grants.)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cover_url TEXT;

GRANT INSERT (cover_url) ON public.profiles TO authenticated;
GRANT UPDATE (cover_url) ON public.profiles TO authenticated;

