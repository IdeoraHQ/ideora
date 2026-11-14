-- ==============================================================================
-- IDEORA: Trim Existing Profile Usernames & Prevent Leading/Trailing Whitespace
-- Migration: 20261114000022_trim_profile_usernames_and_constraint.sql
-- Description:
--   1. Checks whether trimming leading/trailing whitespace on public.profiles.username
--      would cause any duplicate/colliding usernames. Aborts if any collision exists.
--   2. Safely trims existing usernames in public.profiles while preserving all
--      user IDs, roles, emails, ownership, and profile data.
--   3. Adds a CHECK constraint preventing future usernames with leading/trailing
--      whitespace.
-- ==============================================================================

DO $$
DECLARE
    v_collision TEXT;
BEGIN
    SELECT pg_catalog.btrim(username)
    INTO v_collision
    FROM public.profiles
    GROUP BY pg_catalog.btrim(username)
    HAVING COUNT(*) > 1
    LIMIT 1;

    IF v_collision IS NOT NULL THEN
        RAISE EXCEPTION 'Username collision detected after trimming whitespace for username: "%". Aborting migration.', v_collision;
    END IF;
END;
$$;

UPDATE public.profiles
SET username = pg_catalog.btrim(username)
WHERE username IS DISTINCT FROM pg_catalog.btrim(username);

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_username_trimmed;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_username_trimmed
    CHECK (username = pg_catalog.btrim(username));

