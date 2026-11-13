-- ==============================================================================
-- IDEORA: Fix Signup Profile Creation with Email Verification & Role Safety
-- Migration: 20261113000009_fix_signup_profile_creation.sql
--
-- Root Cause Fixed:
--   When email verification is enabled in Supabase Auth, signUp() returns
--   session = NULL (client operates as 'anon'). Migration 008 revoked INSERT
--   and UPDATE on public.profiles from 'anon' (correctly, for security), so
--   the frontend's post-signup .from('profiles').upsert(...) failed with:
--     42501: permission denied for table profiles
--
-- Fix:
--   Keep all existing column-level grants, RLS policies, and role protections
--   intact (do NOT grant INSERT/UPDATE on public.profiles to anon).
--   Instead, public.handle_new_user() (SECURITY DEFINER on auth.users) is
--   the single authoritative creator of public.profiles rows, safely reading
--   validated founder/collaborator role (never 'admin'), skills, and bio from
--   raw_user_meta_data.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    raw_username TEXT;
    clean_username TEXT;
    raw_name TEXT;
    raw_bio TEXT;
    raw_skills TEXT[];
    v_requested_role TEXT;
    v_safe_role public.user_role;
BEGIN
    raw_username := COALESCE(
        NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'username'), ''),
        SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
        'builder'
    );

    clean_username := pg_catalog.regexp_replace(
        pg_catalog.lower(raw_username),
        '[^a-z0-9_]',
        '',
        'g'
    );

    IF pg_catalog.char_length(clean_username) < 3 THEN
        clean_username := 'user_' || pg_catalog.substr(pg_catalog.replace(NEW.id::TEXT, '-', ''), 1, 6);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.username = clean_username
          AND p.id <> NEW.id
    ) THEN
        clean_username := clean_username || '_' || pg_catalog.substr(pg_catalog.replace(NEW.id::TEXT, '-', ''), 1, 4);
    END IF;

    raw_name := COALESCE(
        NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
        clean_username
    );

    raw_bio := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'bio'), '');

    IF pg_catalog.jsonb_typeof(NEW.raw_user_meta_data->'skills') = 'array' THEN
        SELECT COALESCE(
            ARRAY(
                SELECT pg_catalog.btrim(val)
                FROM pg_catalog.jsonb_array_elements_text(NEW.raw_user_meta_data->'skills') AS val
                WHERE pg_catalog.btrim(val) <> ''
            ),
            '{}'::TEXT[]
        ) INTO raw_skills;
    ELSE
        raw_skills := '{}'::TEXT[];
    END IF;

    -- Strictly whitelist self-selected signup role to founder or collaborator.
    -- Admin role can NEVER be self-assigned during signup.
    v_requested_role := pg_catalog.lower(
        COALESCE(NEW.raw_user_meta_data->>'role', 'collaborator')
    );

    IF v_requested_role = 'founder' THEN
        v_safe_role := 'founder'::public.user_role;
    ELSE
        v_safe_role := 'collaborator'::public.user_role;
    END IF;

    INSERT INTO public.profiles (
        id,
        username,
        full_name,
        avatar_url,
        bio,
        skills,
        role
    )
    VALUES (
        NEW.id,
        clean_username,
        raw_name,
        NEW.raw_user_meta_data->>'avatar_url',
        raw_bio,
        raw_skills,
        v_safe_role
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        bio = COALESCE(EXCLUDED.bio, public.profiles.bio),
        skills = CASE
            WHEN pg_catalog.cardinality(EXCLUDED.skills) > 0 THEN EXCLUDED.skills
            ELSE public.profiles.skills
        END,
        updated_at = pg_catalog.now();

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

