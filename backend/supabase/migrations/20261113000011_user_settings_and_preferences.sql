-- ==============================================================================
-- IDEORA: User Settings, Notification Preferences & Account Deletion Requests
-- Migration: 20261113000011_user_settings_and_preferences.sql
--
-- Dependencies:
--   Requires 20261102000001 through 20261112000008 (profiles, notifications,
--   is_admin(), is_active_user()).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. USER SETTINGS TABLE (Notification Preferences)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    notify_collaboration_requests BOOLEAN NOT NULL DEFAULT true,
    notify_messages BOOLEAN NOT NULL DEFAULT true,
    notify_idea_activity BOOLEAN NOT NULL DEFAULT true,
    notify_platform_announcements BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_settings FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
    ON public.user_settings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
    ON public.user_settings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
    ON public.user_settings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.touch_user_settings_updated_at();

-- ------------------------------------------------------------------------------
-- 2. ENFORCE NOTIFICATION PREFERENCES AT NOTIFICATION INSERTION TIME
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.filter_notification_by_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_prefs public.user_settings;
BEGIN
    SELECT * INTO v_prefs
    FROM public.user_settings
    WHERE user_id = NEW.recipient_id;

    -- Default is enabled when no explicit settings row exists yet
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF NEW.type IN (
        'collaboration_request'::public.notification_type,
        'request_accepted'::public.notification_type,
        'request_declined'::public.notification_type
    ) AND NOT v_prefs.notify_collaboration_requests THEN
        RETURN NULL;
    END IF;

    IF NEW.type = 'new_message'::public.notification_type
       AND NOT v_prefs.notify_messages THEN
        RETURN NULL;
    END IF;

    IF NEW.type IN (
        'new_comment'::public.notification_type,
        'idea_upvoted'::public.notification_type
    ) AND NOT v_prefs.notify_idea_activity THEN
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.filter_notification_by_user_preferences() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_filter_notification_by_preferences ON public.notifications;
CREATE TRIGGER trg_filter_notification_by_preferences
    BEFORE INSERT ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.filter_notification_by_user_preferences();

-- ------------------------------------------------------------------------------
-- 3. AUTHORIZED ACCOUNT DELETION REQUESTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT deletion_reason_length CHECK (
        reason IS NULL OR pg_catalog.char_length(reason) <= 1000
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_one_pending_per_user
    ON public.account_deletion_requests (user_id)
    WHERE status = 'pending';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.account_deletion_requests FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.account_deletion_requests TO authenticated;

DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can view own deletion requests"
    ON public.account_deletion_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.request_account_deletion(
    p_reason TEXT DEFAULT NULL
)
RETURNS public.account_deletion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_existing public.account_deletion_requests;
    v_created public.account_deletion_requests;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_existing
    FROM public.account_deletion_requests
    WHERE user_id = v_user_id
      AND status = 'pending'
    FOR UPDATE;

    IF FOUND THEN
        RETURN v_existing;
    END IF;

    INSERT INTO public.account_deletion_requests (user_id, reason, status)
    VALUES (
        v_user_id,
        NULLIF(pg_catalog.btrim(p_reason), ''),
        'pending'
    )
    RETURNING * INTO v_created;

    RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion_request()
RETURNS public.account_deletion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_updated public.account_deletion_requests;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.account_deletion_requests
    SET status = 'cancelled',
        updated_at = pg_catalog.now()
    WHERE user_id = v_user_id
      AND status = 'pending'
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No pending account deletion request found.' USING ERRCODE = 'P0002';
    END IF;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_account_deletion_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion_request() TO authenticated;

