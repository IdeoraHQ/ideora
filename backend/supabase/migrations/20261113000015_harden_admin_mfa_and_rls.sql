-- ==============================================================================
-- IDEORA: Harden Admin TOTP MFA (AAL2), RLS & Anon API Key Boundaries
-- Migration: 20261113000015_harden_admin_mfa_and_rls.sql
--
-- 1. Enforces TOTP MFA (AAL2) inside `public.is_admin()` once an admin has
--    enrolled a verified TOTP factor (while still allowing first-time QR
--    enrollment when no verified TOTP factor exists yet).
-- 2. Enforces `public.is_admin()` on all admin-initiated `admin_audit_logs`
--    writes via a BEFORE INSERT trigger, atomically blocking any mutating
--    admin RPC called with an AAL1 token from the Network tab / REST API.
-- 3. Revokes all `anon` privileges on private tables and revokes `anon` write
--    privileges across all tables in `public`.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENFORCE AAL2 FOR ADMINS WITH VERIFIED TOTP FACTORS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_mfa_verified()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT auth.uid() IS NOT NULL
    AND (
        COALESCE(auth.jwt()->>'aal', 'aal1') = 'aal2'
        OR NOT EXISTS (
            SELECT 1
            FROM auth.mfa_factors mf
            WHERE mf.user_id = auth.uid()
              AND mf.status = 'verified'
        )
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin_mfa_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_mfa_verified() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT auth.uid() IS NOT NULL
    AND public.is_admin_mfa_verified()
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        LEFT JOIN public.profile_security_status s ON s.user_id = p.id
        WHERE p.id = auth.uid()
          AND p.role = 'admin'::public.user_role
          AND (
              s.user_id IS NULL
              OR s.account_status = 'active'::public.account_status
              OR (
                  s.account_status = 'suspended'::public.account_status
                  AND s.suspended_until IS NOT NULL
                  AND s.suspended_until <= pg_catalog.now()
              )
          )
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. ENFORCE AAL2 ON ALL MUTATING ADMIN ACTIONS VIA AUDIT LOG TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_admin_mfa_on_audit_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.actor_type = 'admin' THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Forbidden: Active administrator privileges and 2FA (AAL2) verification required.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_admin_mfa_on_audit_action() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_admin_mfa_on_audit_action ON public.admin_audit_logs;
CREATE TRIGGER trg_enforce_admin_mfa_on_audit_action
    BEFORE INSERT ON public.admin_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_admin_mfa_on_audit_action();

-- ------------------------------------------------------------------------------
-- 3. LOCK DOWN `anon` API KEY ACCESS ON PRIVATE TABLES & ALL WRITES
-- ------------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

REVOKE ALL ON TABLE
    public.admin_audit_logs,
    public.idea_moderation_history,
    public.reports,
    public.profile_security_status,
    public.platform_settings,
    public.feedback,
    public.feedback_prompt_state,
    public.user_settings,
    public.account_deletion_requests,
    public.notifications,
    public.conversations,
    public.messages,
    public.collaboration_requests,
    public.idea_upvotes,
    public.project_members
FROM anon;

-- Ensure anon cannot execute admin or private account RPCs via /rest/v1/rpc/*
REVOKE EXECUTE ON FUNCTION
    public.admin_update_user_role(UUID, public.user_role, TEXT),
    public.admin_set_user_status(UUID, public.account_status, TIMESTAMPTZ, TEXT),
    public.admin_moderate_idea(UUID, public.idea_moderation_status, TEXT),
    public.admin_resolve_report(UUID, public.report_status, TEXT),
    public.admin_get_overview_stats(),
    public.admin_get_audit_logs(INTEGER, INTEGER),
    public.admin_get_feedback_summary(),
    public.admin_list_feedback(public.feedback_type, public.feedback_status, INTEGER, INTEGER),
    public.admin_update_feedback(UUID, public.feedback_status, TEXT, TEXT),
    public.admin_update_platform_setting(TEXT, JSONB, TEXT)
FROM PUBLIC, anon;

