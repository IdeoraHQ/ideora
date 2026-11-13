-- ==============================================================================
-- IDEORA: Feedback Center, Private Screenshot Storage, Prompt State & Admin API
-- Migration: 20261113000010_feedback_system.sql
--
-- Dependencies:
--   Requires 20261102000001 through 20261112000008 (profiles, is_admin(),
--   is_active_user(), admin_audit_logs).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.feedback_type AS ENUM (
        'feature_request',
        'bug_report',
        'general_feedback'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.feedback_status AS ENUM (
        'new',
        'reviewing',
        'planned',
        'in_progress',
        'completed',
        'declined'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.feedback_priority AS ENUM (
        'low',
        'medium',
        'high',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.feedback_prompt_status AS ENUM (
        'eligible',
        'deferred',
        'declined',
        'submitted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. FEEDBACK TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feedback_type public.feedback_type NOT NULL,
    category TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    benefit_or_impact TEXT,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    page_url TEXT,
    priority public.feedback_priority,
    screenshot_path TEXT,
    status public.feedback_status NOT NULL DEFAULT 'new'::public.feedback_status,
    admin_response TEXT,
    internal_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT feedback_title_length CHECK (
        pg_catalog.char_length(pg_catalog.btrim(title)) BETWEEN 3 AND 180
    ),
    CONSTRAINT feedback_description_length CHECK (
        pg_catalog.char_length(pg_catalog.btrim(description)) BETWEEN 10 AND 4000
    ),
    CONSTRAINT feedback_category_length CHECK (
        category IS NULL OR pg_catalog.char_length(category) <= 80
    ),
    CONSTRAINT feedback_benefit_length CHECK (
        benefit_or_impact IS NULL OR pg_catalog.char_length(benefit_or_impact) <= 2000
    ),
    CONSTRAINT feedback_steps_length CHECK (
        steps_to_reproduce IS NULL OR pg_catalog.char_length(steps_to_reproduce) <= 3000
    ),
    CONSTRAINT feedback_expected_length CHECK (
        expected_behavior IS NULL OR pg_catalog.char_length(expected_behavior) <= 2000
    ),
    CONSTRAINT feedback_actual_length CHECK (
        actual_behavior IS NULL OR pg_catalog.char_length(actual_behavior) <= 2000
    ),
    CONSTRAINT feedback_page_url_length CHECK (
        page_url IS NULL OR pg_catalog.char_length(page_url) <= 500
    ),
    CONSTRAINT feedback_screenshot_path_length CHECK (
        screenshot_path IS NULL OR pg_catalog.char_length(screenshot_path) <= 500
    ),
    CONSTRAINT feedback_admin_response_length CHECK (
        admin_response IS NULL OR pg_catalog.char_length(admin_response) <= 3000
    ),
    CONSTRAINT feedback_internal_notes_length CHECK (
        internal_notes IS NULL OR pg_catalog.char_length(internal_notes) <= 3000
    )
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created
    ON public.feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_status_created
    ON public.feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_type_created
    ON public.feedback (feedback_type, created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Column-level privileges:
-- Regular authenticated users cannot read internal_notes / reviewed_by / reviewed_at
-- and cannot directly insert/update status or admin fields.
REVOKE ALL ON public.feedback FROM PUBLIC, authenticated, anon;

GRANT SELECT (
    id,
    user_id,
    feedback_type,
    category,
    title,
    description,
    benefit_or_impact,
    steps_to_reproduce,
    expected_behavior,
    actual_behavior,
    page_url,
    priority,
    screenshot_path,
    status,
    admin_response,
    created_at,
    updated_at
) ON public.feedback TO authenticated;

GRANT INSERT (
    user_id,
    feedback_type,
    category,
    title,
    description,
    benefit_or_impact,
    steps_to_reproduce,
    expected_behavior,
    actual_behavior,
    page_url,
    priority,
    screenshot_path
) ON public.feedback TO authenticated;

DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback"
    ON public.feedback FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can submit own feedback" ON public.feedback;
CREATE POLICY "Users can submit own feedback"
    ON public.feedback FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.is_active_user()
        AND status = 'new'::public.feedback_status
        AND admin_response IS NULL
        AND internal_notes IS NULL
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
        AND (
            screenshot_path IS NULL
            OR screenshot_path LIKE (auth.uid()::TEXT || '/%')
        )
    );

CREATE OR REPLACE FUNCTION public.touch_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_updated_at ON public.feedback;
CREATE TRIGGER trg_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.touch_feedback_updated_at();

-- ------------------------------------------------------------------------------
-- 3. PRIVATE STORAGE BUCKET FOR BUG REPORT SCREENSHOTS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'feedback-screenshots',
    'feedback-screenshots',
    false,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "Users can upload own feedback screenshots" ON storage.objects;
CREATE POLICY "Users can upload own feedback screenshots"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'feedback-screenshots'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
        AND public.is_active_user()
    );

DROP POLICY IF EXISTS "Users and admins can read feedback screenshots" ON storage.objects;
CREATE POLICY "Users and admins can read feedback screenshots"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'feedback-screenshots'
        AND (
            (storage.foldername(name))[1] = auth.uid()::TEXT
            OR public.is_admin()
        )
    );

DROP POLICY IF EXISTS "Users can delete own feedback screenshots" ON storage.objects;
CREATE POLICY "Users can delete own feedback screenshots"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'feedback-screenshots'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- ------------------------------------------------------------------------------
-- 4. PERSISTENT CONTEXTUAL FEEDBACK PROMPT STATE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback_prompt_state (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_count INTEGER NOT NULL DEFAULT 0 CHECK (session_count >= 0),
    last_session_recorded_at TIMESTAMPTZ,
    active_seconds INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
    meaningful_actions_count INTEGER NOT NULL DEFAULT 0 CHECK (meaningful_actions_count >= 0),
    last_meaningful_action TEXT,
    prompt_status public.feedback_prompt_status NOT NULL DEFAULT 'eligible'::public.feedback_prompt_status,
    deferred_until TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.feedback_prompt_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.feedback_prompt_state FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.feedback_prompt_state TO authenticated;

DROP POLICY IF EXISTS "Users can read own feedback prompt state" ON public.feedback_prompt_state;
CREATE POLICY "Users can read own feedback prompt state"
    ON public.feedback_prompt_state FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Automatically mark prompt state as submitted whenever a user submits feedback
CREATE OR REPLACE FUNCTION public.mark_feedback_prompt_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.feedback_prompt_state (
        user_id,
        prompt_status,
        submitted_at,
        updated_at
    )
    VALUES (
        NEW.user_id,
        'submitted'::public.feedback_prompt_status,
        pg_catalog.now(),
        pg_catalog.now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        prompt_status = 'submitted'::public.feedback_prompt_status,
        submitted_at = COALESCE(public.feedback_prompt_state.submitted_at, pg_catalog.now()),
        updated_at = pg_catalog.now();

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_feedback_prompt_submitted() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_mark_feedback_prompt_submitted ON public.feedback;
CREATE TRIGGER trg_mark_feedback_prompt_submitted
    AFTER INSERT ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.mark_feedback_prompt_submitted();

CREATE OR REPLACE FUNCTION public.record_feedback_engagement(
    p_event_type TEXT,
    p_active_seconds_delta INTEGER DEFAULT 0,
    p_action_name TEXT DEFAULT NULL
)
RETURNS public.feedback_prompt_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_state public.feedback_prompt_state;
    v_safe_delta INTEGER;
    v_has_submitted BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned.' USING ERRCODE = '42501';
    END IF;

    IF p_event_type NOT IN ('session_start', 'heartbeat', 'meaningful_action') THEN
        RAISE EXCEPTION 'Invalid engagement event type.';
    END IF;

    v_safe_delta := LEAST(GREATEST(COALESCE(p_active_seconds_delta, 0), 0), 120);

    SELECT EXISTS (
        SELECT 1 FROM public.feedback f WHERE f.user_id = v_user_id
    ) INTO v_has_submitted;

    INSERT INTO public.feedback_prompt_state (
        user_id,
        prompt_status,
        submitted_at
    )
    VALUES (
        v_user_id,
        CASE
            WHEN v_has_submitted THEN 'submitted'::public.feedback_prompt_status
            ELSE 'eligible'::public.feedback_prompt_status
        END,
        CASE WHEN v_has_submitted THEN pg_catalog.now() ELSE NULL END
    )
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_state
    FROM public.feedback_prompt_state
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_has_submitted AND v_state.prompt_status <> 'submitted'::public.feedback_prompt_status THEN
        UPDATE public.feedback_prompt_state
        SET prompt_status = 'submitted'::public.feedback_prompt_status,
            submitted_at = COALESCE(submitted_at, pg_catalog.now()),
            updated_at = pg_catalog.now()
        WHERE user_id = v_user_id
        RETURNING * INTO v_state;
        RETURN v_state;
    END IF;

    IF p_event_type = 'session_start' THEN
        IF v_state.last_session_recorded_at IS NULL
           OR v_state.last_session_recorded_at < pg_catalog.now() - INTERVAL '30 minutes' THEN
            UPDATE public.feedback_prompt_state
            SET session_count = session_count + 1,
                last_session_recorded_at = pg_catalog.now(),
                updated_at = pg_catalog.now()
            WHERE user_id = v_user_id
            RETURNING * INTO v_state;
        END IF;
    ELSIF p_event_type = 'heartbeat' AND v_safe_delta > 0 THEN
        UPDATE public.feedback_prompt_state
        SET active_seconds = active_seconds + v_safe_delta,
            updated_at = pg_catalog.now()
        WHERE user_id = v_user_id
        RETURNING * INTO v_state;
    ELSIF p_event_type = 'meaningful_action' THEN
        UPDATE public.feedback_prompt_state
        SET meaningful_actions_count = meaningful_actions_count + 1,
            last_meaningful_action = LEFT(COALESCE(NULLIF(pg_catalog.btrim(p_action_name), ''), 'action'), 80),
            updated_at = pg_catalog.now()
        WHERE user_id = v_user_id
        RETURNING * INTO v_state;
    END IF;

    RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.record_feedback_engagement(TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_feedback_engagement(TEXT, INTEGER, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_feedback_prompt(
    p_decision TEXT
)
RETURNS public.feedback_prompt_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_state public.feedback_prompt_state;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned.' USING ERRCODE = '42501';
    END IF;

    IF p_decision NOT IN ('defer', 'decline', 'opened_feedback') THEN
        RAISE EXCEPTION 'Invalid prompt decision.';
    END IF;

    INSERT INTO public.feedback_prompt_state (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.feedback_prompt_state
    SET
        prompt_status = CASE
            WHEN prompt_status = 'submitted'::public.feedback_prompt_status THEN 'submitted'::public.feedback_prompt_status
            WHEN p_decision = 'decline' THEN 'declined'::public.feedback_prompt_status
            ELSE 'deferred'::public.feedback_prompt_status
        END,
        deferred_until = CASE
            WHEN prompt_status = 'submitted'::public.feedback_prompt_status THEN deferred_until
            WHEN p_decision = 'defer' THEN pg_catalog.now() + INTERVAL '7 days'
            WHEN p_decision = 'opened_feedback' THEN pg_catalog.now() + INTERVAL '1 day'
            ELSE NULL
        END,
        dismissed_at = CASE
            WHEN p_decision = 'decline' THEN pg_catalog.now()
            ELSE dismissed_at
        END,
        updated_at = pg_catalog.now()
    WHERE user_id = v_user_id
    RETURNING * INTO v_state;

    RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_feedback_prompt(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_feedback_prompt(TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. ADMIN FEEDBACK MANAGEMENT RPCS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_feedback_summary()
RETURNS JSONB
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
    FROM public.profiles
    WHERE id = v_admin_id;

    IF NOT FOUND
       OR v_acting_admin.role != 'admin'::public.user_role
       OR NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Forbidden: Administrator privileges required.' USING ERRCODE = '42501';
    END IF;

    RETURN (
        SELECT pg_catalog.jsonb_build_object(
            'total_submissions', COUNT(*),
            'new_submissions', COUNT(*) FILTER (WHERE status = 'new'::public.feedback_status),
            'reviewing_submissions', COUNT(*) FILTER (WHERE status = 'reviewing'::public.feedback_status),
            'planned_submissions', COUNT(*) FILTER (WHERE status = 'planned'::public.feedback_status),
            'in_progress_submissions', COUNT(*) FILTER (WHERE status = 'in_progress'::public.feedback_status),
            'completed_submissions', COUNT(*) FILTER (WHERE status = 'completed'::public.feedback_status),
            'declined_submissions', COUNT(*) FILTER (WHERE status = 'declined'::public.feedback_status),
            'bug_reports', COUNT(*) FILTER (WHERE feedback_type = 'bug_report'::public.feedback_type),
            'feature_requests', COUNT(*) FILTER (WHERE feedback_type = 'feature_request'::public.feedback_type),
            'general_feedback', COUNT(*) FILTER (WHERE feedback_type = 'general_feedback'::public.feedback_type)
        )
        FROM public.feedback
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_feedback_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_feedback_summary() TO authenticated;

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
    FROM public.profiles
    WHERE id = v_admin_id;

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

CREATE OR REPLACE FUNCTION public.admin_update_feedback(
    p_feedback_id UUID,
    p_status public.feedback_status,
    p_admin_response TEXT DEFAULT NULL,
    p_internal_notes TEXT DEFAULT NULL
)
RETURNS public.feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_acting_admin public.profiles;
    v_existing public.feedback;
    v_updated public.feedback;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_acting_admin
    FROM public.profiles
    WHERE id = v_admin_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_acting_admin.role != 'admin'::public.user_role
       OR NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Forbidden: Administrator privileges required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_existing
    FROM public.feedback
    WHERE id = p_feedback_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feedback submission not found.' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.feedback
    SET
        status = p_status,
        admin_response = CASE
            WHEN p_admin_response IS NULL THEN admin_response
            ELSE NULLIF(pg_catalog.btrim(p_admin_response), '')
        END,
        internal_notes = CASE
            WHEN p_internal_notes IS NULL THEN internal_notes
            ELSE NULLIF(pg_catalog.btrim(p_internal_notes), '')
        END,
        reviewed_by = v_admin_id,
        reviewed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_feedback_id
    RETURNING * INTO v_updated;

    INSERT INTO public.admin_audit_logs (
        actor_type,
        admin_id,
        action,
        target_type,
        target_id,
        previous_values,
        new_values
    )
    VALUES (
        'admin',
        v_admin_id,
        'feedback_updated',
        'feedback',
        p_feedback_id,
        pg_catalog.jsonb_build_object(
            'status', v_existing.status
        ),
        pg_catalog.jsonb_build_object(
            'status', p_status,
            'has_admin_response', v_updated.admin_response IS NOT NULL
        )
    );

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_feedback(UUID, public.feedback_status, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_feedback(UUID, public.feedback_status, TEXT, TEXT) TO authenticated;

