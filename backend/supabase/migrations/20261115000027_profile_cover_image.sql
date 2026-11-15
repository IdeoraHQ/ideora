-- Add optional cover_url column to profiles for user profile cover banners
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cover_url TEXT;

