-- ==============================================================================
-- IDEORA: Admin Center Completion — Feedback RPC Ambiguity Fix & Platform Settings
-- Migration: 20261113000013_admin_center_completion.sql
--
-- 1. Fixes `column reference "id" is ambiguous` in `public.admin_list_feedback`.
-- 2. Adds `public.platform_settings` + `public.admin_update_platform_setting`
--    for the Admin Settings (Platform Configuration) page.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX AMBIGUOUS "id" COLUMN REFERENCE IN admin_list_feedback
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_feedback(
    p_feedback_type public.feedback_type DEFAULT NULL,
    p_status public.feedback_status DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    submitter_username TEXT,
    submitter_full_name TEXT,
    submitter_role public.user_role,
    feedback_type public.feedback_type,
    category TEXT,
    title TEXT,
    description TEXT,
    benefit_or_impact TEXT,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    page_url TEXT,
    priority public.feedback_priority,
    screenshot_path TEXT,
    status public.feedback_status,
    admin_response TEXT,
    internal_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_acting_admin public.profiles;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_acting_admin
    FROM public.profiles p
    WHERE p.id = v_admin_id;

    IF NOT FOUND
       OR v_acting_admin.role != 'admin'::public.user_role
       OR NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Forbidden: Administrator privileges required.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        f.id,
        f.user_id,
        p.username AS submitter_username,
        p.full_name AS submitter_full_name,
        p.role AS submitter_role,
        f.feedback_type,
        f.category,
        f.title,
        f.description,
        f.benefit_or_impact,
        f.steps_to_reproduce,
        f.expected_behavior,
        f.actual_behavior,
        f.page_url,
        f.priority,
        f.screenshot_path,
        f.status,
        f.admin_response,
        f.internal_notes,
        f.reviewed_by,
        f.reviewed_at,
        f.created_at,
        f.updated_at
    FROM public.feedback f
    JOIN public.profiles p ON p.id = f.user_id
    WHERE (p_feedback_type IS NULL OR f.feedback_type = p_feedback_type)
      AND (p_status IS NULL OR f.status = p_status)
    ORDER BY f.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_feedback(public.feedback_type, public.feedback_status, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_feedback(public.feedback_type, public.feedback_status, INTEGER, INTEGER) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. PLATFORM SETTINGS TABLE & ADMIN RPC
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_platform_setting_key CHECK (pg_catalog.char_length(pg_catalog.btrim(key)) BETWEEN 2 AND 100)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.platform_settings FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.platform_settings TO authenticated;

DROP POLICY IF EXISTS "Admins can read platform settings" ON public.platform_settings;
CREATE POLICY "Admins can read platform settings"
    ON public.platform_settings FOR SELECT
    TO authenticated
    USING (public.is_admin());

INSERT INTO public.platform_settings (key, value, description)
VALUES
    (
        'allow_new_registrations',
        '{"enabled": true}'::jsonb,
        'Allow new users to register accounts on IDEORA.'
    ),
    (
        'require_idea_moderation',
        '{"enabled": false}'::jsonb,
        'Require administrator approval before newly published ideas appear publicly.'
    ),
    (
        'feedback_prompt_enabled',
        '{"enabled": true}'::jsonb,
        'Enable the contextual in-app feedback prompt for active users.'
    ),
    (
        'maintenance_mode',
        '{"enabled": false, "message": "Scheduled maintenance is in progress."}'::jsonb,
        'Display a platform maintenance banner and restrict non-admin writes.'
    )
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_update_platform_setting(
    p_key TEXT,
    p_value JSONB,
    p_reason TEXT DEFAULT NULL
)
RETURNS public.platform_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_acting_admin public.profiles;
    v_existing public.platform_settings;
    v_updated public.platform_settings;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_acting_admin
    FROM public.profiles p
    WHERE p.id = v_admin_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_acting_admin.role != 'admin'::public.user_role
       OR NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Forbidden: Administrator privileges required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_existing
    FROM public.platform_settings
    WHERE key = p_key
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Platform setting "%" not found.', p_key USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.platform_settings
    SET
        value = p_value,
        updated_by = v_admin_id,
        updated_at = pg_catalog.now()
    WHERE key = p_key
    RETURNING * INTO v_updated;

    INSERT INTO public.admin_audit_logs (
        actor_type,
        admin_id,
        action,
        target_type,
        target_id,
        previous_values,
        new_values,
        reason
    )
    VALUES (
        'admin',
        v_admin_id,
        'platform_setting_updated',
        'platform_setting',
        NULL,
        pg_catalog.jsonb_build_object('key', p_key, 'value', v_existing.value),
        pg_catalog.jsonb_build_object('key', p_key, 'value', p_value),
        NULLIF(pg_catalog.btrim(p_reason), '')
    );

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_platform_setting(TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_platform_setting(TEXT, JSONB, TEXT) TO authenticated;

