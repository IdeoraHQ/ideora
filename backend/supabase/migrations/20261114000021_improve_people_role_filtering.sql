-- ==============================================================================
-- IDEORA: Improve People Discovery Role Filtering
-- Migration: 20261114000021_improve_people_role_filtering.sql
-- Description:
--   Matches p_role across account role, preferred_roles, skills, bio,
--   looking_to_contribute, and collaboration_goals with hyphen/space
--   normalization (e.g. "Full-Stack" matches "Full Stack", "fullstack").
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
              WHERE pg_catalog.regexp_replace(lower(sk), '[-_\s/]+', '', 'g')
                    LIKE '%' || pg_catalog.regexp_replace(lower(pg_catalog.btrim(p_skill)), '[-_\s/]+', '', 'g') || '%'
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
              WHERE pg_catalog.regexp_replace(lower(pr), '[-_\s/]+', '', 'g')
                    LIKE '%' || pg_catalog.regexp_replace(lower(pg_catalog.btrim(p_role)), '[-_\s/]+', '', 'g') || '%'
          )
          OR EXISTS (
              SELECT 1 FROM unnest(p.skills) AS sk
              WHERE pg_catalog.regexp_replace(lower(sk), '[-_\s/]+', '', 'g')
                    LIKE '%' || pg_catalog.regexp_replace(lower(pg_catalog.btrim(p_role)), '[-_\s/]+', '', 'g') || '%'
                 OR (
                     lower(pg_catalog.btrim(p_role)) = 'ui/ux'
                     AND lower(sk) = 'design'
                 )
          )
          OR pg_catalog.regexp_replace(lower(COALESCE(p.bio, '')), '[-_\s/]+', '', 'g')
             LIKE '%' || pg_catalog.regexp_replace(lower(pg_catalog.btrim(p_role)), '[-_\s/]+', '', 'g') || '%'
          OR pg_catalog.regexp_replace(lower(COALESCE(p.looking_to_contribute, '')), '[-_\s/]+', '', 'g')
             LIKE '%' || pg_catalog.regexp_replace(lower(pg_catalog.btrim(p_role)), '[-_\s/]+', '', 'g') || '%'
          OR pg_catalog.regexp_replace(lower(COALESCE(p.collaboration_goals, '')), '[-_\s/]+', '', 'g')
             LIKE '%' || pg_catalog.regexp_replace(lower(pg_catalog.btrim(p_role)), '[-_\s/]+', '', 'g') || '%'
      )
    ORDER BY p.updated_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_discoverable_people(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_discoverable_people(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

