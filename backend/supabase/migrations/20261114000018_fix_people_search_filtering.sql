-- ==============================================================================
-- IDEORA: Fix People Discovery Filtering (case-insensitive skills, roles & tags)
-- Migration: 20261114000018_fix_people_search_filtering.sql
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.search_discoverable_people(
    p_search TEXT DEFAULT NULL,
    p_skill TEXT DEFAULT NULL,
    p_interest TEXT DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 30,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    role public.user_role,
    skills TEXT[],
    interests TEXT[],
    preferred_roles TEXT[],
    looking_to_contribute TEXT,
    collaboration_goals TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    is_discoverable BOOLEAN,
    created_at TIMESTAMPTZ,
    published_ideas_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.bio,
        p.role,
        p.skills,
        p.interests,
        p.preferred_roles,
        p.looking_to_contribute,
        p.collaboration_goals,
        p.github_url,
        p.linkedin_url,
        p.website_url,
        p.is_discoverable,
        p.created_at,
        (
            SELECT COUNT(*)
            FROM public.ideas i
            WHERE i.creator_id = p.id
              AND i.status != 'draft'::public.idea_status
              AND i.moderation_status = 'approved'::public.idea_moderation_status
              AND i.deleted_at IS NULL
        ) AS published_ideas_count
    FROM public.profiles p
    LEFT JOIN public.profile_security_status s ON s.user_id = p.id
    WHERE p.is_discoverable = TRUE
      AND (
          s.user_id IS NULL
          OR s.account_status = 'active'::public.account_status
          OR (
              s.account_status = 'suspended'::public.account_status
              AND s.suspended_until IS NOT NULL
              AND s.suspended_until <= pg_catalog.now()
          )
      )
      AND (
          p_search IS NULL
          OR pg_catalog.btrim(p_search) = ''
          OR p.username ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR p.full_name ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR COALESCE(p.bio, '') ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR COALESCE(p.looking_to_contribute, '') ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR COALESCE(p.collaboration_goals, '') ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR EXISTS (
              SELECT 1 FROM unnest(p.skills) AS sk
              WHERE sk ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          )
          OR EXISTS (
              SELECT 1 FROM unnest(p.interests) AS intr
              WHERE intr ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          )
          OR EXISTS (
              SELECT 1 FROM unnest(p.preferred_roles) AS pr
              WHERE pr ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          )
      )
      AND (
          p_skill IS NULL
          OR pg_catalog.btrim(p_skill) = ''
          OR EXISTS (
              SELECT 1 FROM unnest(p.skills) AS sk
              WHERE sk ILIKE '%' || pg_catalog.btrim(p_skill) || '%'
          )
      )
      AND (
          p_interest IS NULL
          OR pg_catalog.btrim(p_interest) = ''
          OR EXISTS (
              SELECT 1 FROM unnest(p.interests) AS intr
              WHERE intr ILIKE '%' || pg_catalog.btrim(p_interest) || '%'
          )
      )
      AND (
          p_role IS NULL
          OR pg_catalog.btrim(p_role) = ''
          OR p.role::TEXT ILIKE pg_catalog.btrim(p_role)
          OR EXISTS (
              SELECT 1 FROM unnest(p.preferred_roles) AS pr
              WHERE pr ILIKE '%' || pg_catalog.btrim(p_role) || '%'
          )
      )
    ORDER BY p.updated_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_discoverable_people(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_discoverable_people(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

