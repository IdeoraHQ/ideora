-- ==============================================================================
-- IDEORA: Security Hardening — Profile URL Scheme Constraints
-- Migration: 20261120000030_security_hardening_urls_and_rls.sql
--
-- Prevents stored XSS via javascript:/data: URLs in profile external links
-- (github_url, linkedin_url, website_url) at the database constraint layer.
-- ==============================================================================

-- Nullify any existing non-http(s) external profile URLs before adding constraints
UPDATE public.profiles
SET
    github_url = CASE
        WHEN github_url IS NOT NULL AND github_url !~* '^https?://' THEN NULL
        ELSE github_url
    END,
    linkedin_url = CASE
        WHEN linkedin_url IS NOT NULL AND linkedin_url !~* '^https?://' THEN NULL
        ELSE linkedin_url
    END,
    website_url = CASE
        WHEN website_url IS NOT NULL AND website_url !~* '^https?://' THEN NULL
        ELSE website_url
    END
WHERE
    (github_url IS NOT NULL AND github_url !~* '^https?://')
    OR (linkedin_url IS NOT NULL AND linkedin_url !~* '^https?://')
    OR (website_url IS NOT NULL AND website_url !~* '^https?://');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_github_url_http'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_github_url_http
            CHECK (github_url IS NULL OR github_url ~* '^https?://');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_linkedin_url_http'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_linkedin_url_http
            CHECK (linkedin_url IS NULL OR linkedin_url ~* '^https?://');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_website_url_http'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_website_url_http
            CHECK (website_url IS NULL OR website_url ~* '^https?://');
    END IF;
END $$;
