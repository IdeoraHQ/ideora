-- ==============================================================================
-- IDEORA: Google OAuth Profile Metadata Synchronization
-- Migration: 20261114000025_google_oauth_profile_sync.sql
-- Description:
--   Enhances public.handle_new_user() to safely handle Google OAuth metadata
--   fields ('name' fallback for 'full_name', 'picture' fallback for 'avatar_url')
--   while preserving strict role whitelisting (never admin), username collision
--   handling, and existing profile integrity.
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
    raw_avatar TEXT;
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
        NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
        clean_username
    );

    raw_avatar := COALESCE(
        NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'avatar_url'), ''),
        NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'picture'), '')
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
    -- Admin role can NEVER be self-assigned via OAuth or signup metadata.
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
        raw_avatar,
        raw_bio,
        raw_skills,
        v_safe_role
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = COALESCE(NULLIF(pg_catalog.btrim(public.profiles.full_name), ''), EXCLUDED.full_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        bio = COALESCE(public.profiles.bio, EXCLUDED.bio),
        skills = CASE
            WHEN pg_catalog.cardinality(public.profiles.skills) > 0 THEN public.profiles.skills
            ELSE EXCLUDED.skills
        END,
        updated_at = pg_catalog.now();

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

