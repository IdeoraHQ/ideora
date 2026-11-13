-- ==============================================================================
-- IDEORA: Admin Control Center — Authorization, Security Hardening & Audit System
-- Migration: 20261112000008_admin_control_center_security.sql (Final Security Pass)
--
-- Migration Ordering & Dependencies:
--   Requires 20261102000001 through 20261112000007 (profiles, ideas,
--   idea_roles_needed, collaboration_requests, idea_upvotes, idea_comments,
--   notifications, conversations, messages, projects, project_members,
--   user_action_audit, check_rate_limit).
--
-- Rollback Considerations:
--   All new enums, columns, tables, functions, triggers, and policies are
--   additive or replace prior policies cleanly. To roll back, restore prior
--   policies, triggers, and column grants from migrations 001-007 and drop the
--   new RPCs, tables (profile_security_status, reports,
--   idea_moderation_history, admin_audit_logs), helper functions, and added
--   columns on ideas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.account_status AS ENUM ('active', 'suspended', 'banned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.idea_moderation_status AS ENUM (
        'approved',
        'pending_review',
        'rejected',
        'removed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.report_target_type AS ENUM (
        'idea',
        'comment',
        'profile',
        'project'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.report_status AS ENUM (
        'open',
        'investigating',
        'resolved',
        'dismissed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. PRIVATE PROFILE SECURITY STATUS & IDEA MODERATION COLUMNS
-- ------------------------------------------------------------------------------

-- Internal account status & suspension metadata live in a dedicated private table
-- so public.profiles remains safely readable via existing SELECT policies/queries
-- without ever exposing status_reason, suspended_until, or moderation state.
CREATE TABLE IF NOT EXISTS public.profile_security_status (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_status public.account_status NOT NULL DEFAULT 'active'::public.account_status,
    status_reason TEXT,
    suspended_until TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_security_status_state
    ON public.profile_security_status(account_status, suspended_until);

CREATE INDEX IF NOT EXISTS idx_profiles_role
    ON public.profiles(role);

ALTER TABLE public.ideas
    ADD COLUMN IF NOT EXISTS moderation_status public.idea_moderation_status NOT NULL DEFAULT 'approved'::public.idea_moderation_status,
    ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
    ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ideas_moderation_status
    ON public.ideas(moderation_status, deleted_at, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. NEW TABLES: MODERATION HISTORY, REPORTS, & APPEND-ONLY AUDIT LOGS
-- ------------------------------------------------------------------------------

-- 3A. Idea Moderation History (ON DELETE RESTRICT preserves moderation trail)
CREATE TABLE IF NOT EXISTS public.idea_moderation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE RESTRICT,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    previous_status public.idea_moderation_status NOT NULL,
    new_status public.idea_moderation_status NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idea_mod_history_idea_id
    ON public.idea_moderation_history(idea_id, created_at DESC);

-- 3B. User-Submitted Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type public.report_target_type NOT NULL,
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status public.report_status NOT NULL DEFAULT 'open'::public.report_status,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT chk_reports_reason_length CHECK (
        char_length(trim(reason)) >= 3 AND char_length(reason) <= 200
    ),
    CONSTRAINT chk_reports_details_length CHECK (
        details IS NULL OR char_length(details) <= 2000
    )
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created
    ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
    ON public.reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target
    ON public.reports(target_type, target_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_active_reporter_target
    ON public.reports(reporter_id, target_type, target_id)
    WHERE status IN ('open', 'investigating');

DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
CREATE TRIGGER set_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3C. Append-Only Administrative & System Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type TEXT NOT NULL DEFAULT 'admin',
    admin_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    previous_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT chk_audit_actor CHECK (
        (actor_type = 'admin' AND admin_id IS NOT NULL)
        OR (actor_type = 'system' AND admin_id IS NULL)
    ),
    CONSTRAINT chk_audit_action_not_empty CHECK (char_length(trim(action)) > 0),
    CONSTRAINT chk_audit_target_type_not_empty CHECK (char_length(trim(target_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
    ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id
    ON public.admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
    ON public.admin_audit_logs(target_type, target_id);

-- ------------------------------------------------------------------------------
-- 4. CORE AUTHORIZATION & SUSPENSION HELPERS (TIMESTAMPTZ + search_path = '')
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        LEFT JOIN public.profile_security_status s ON s.user_id = p.id
        WHERE p.id = auth.uid()
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

REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT auth.uid() IS NOT NULL
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

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 5. COLUMN-LEVEL PRIVILEGES & SECURITY INVOKER IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------

-- 5A. Profiles: revoke broad INSERT/UPDATE; omit role from authenticated
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated, anon;
GRANT INSERT (
    id,
    username,
    full_name,
    avatar_url,
    bio,
    skills,
    github_url,
    linkedin_url,
    website_url
) ON public.profiles TO authenticated;
GRANT UPDATE (
    username,
    full_name,
    avatar_url,
    bio,
    skills,
    github_url,
    linkedin_url,
    website_url,
    updated_at
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF CURRENT_USER IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.role != 'collaborator'::public.user_role THEN
                RAISE EXCEPTION 'Unauthorized: Cannot set protected profile role directly.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Unauthorized: Profile role changes must use authorized RPCs.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_security_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_security_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_security_fields
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();

-- 5B. Ideas: column-level INSERT/UPDATE grants + revoke direct DELETE (use soft_delete_own_idea RPC)
REVOKE INSERT, UPDATE, DELETE ON public.ideas FROM authenticated, anon;
GRANT INSERT (
    creator_id,
    title,
    slug,
    summary,
    description,
    category,
    status,
    collaboration_type,
    tags
) ON public.ideas TO authenticated;
GRANT UPDATE (
    title,
    summary,
    description,
    category,
    status,
    collaboration_type,
    tags,
    updated_at
) ON public.ideas TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_idea_moderation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF CURRENT_USER IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.moderation_status != 'approved'::public.idea_moderation_status
               OR NEW.moderation_reason IS NOT NULL
               OR NEW.moderated_by IS NOT NULL
               OR NEW.moderated_at IS NOT NULL
               OR NEW.deleted_at IS NOT NULL THEN
                RAISE EXCEPTION 'Unauthorized: Cannot supply moderation or deletion metadata on idea creation.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
               OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
               OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
               OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
               OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
                RAISE EXCEPTION 'Unauthorized: Idea moderation and deletion fields cannot be modified directly.';
            END IF;
            IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
                RAISE EXCEPTION 'Unauthorized: Idea creator cannot be reassigned.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_idea_moderation_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_idea_moderation_fields ON public.ideas;
CREATE TRIGGER trg_protect_idea_moderation_fields
    BEFORE INSERT OR UPDATE ON public.ideas
    FOR EACH ROW EXECUTE FUNCTION public.protect_idea_moderation_fields();

-- 5C. Remove custom GUC trust from protect_idea_counters() & handle_upvote_counter()
CREATE OR REPLACE FUNCTION public.protect_idea_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' OR pg_catalog.pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF CURRENT_USER IN ('authenticated', 'anon') THEN
        IF NEW.upvotes_count IS DISTINCT FROM OLD.upvotes_count THEN
            RAISE EXCEPTION 'Direct modification of upvotes_count is forbidden. Use the upvote system.';
        END IF;
        IF NEW.collaborators_count IS DISTINCT FROM OLD.collaborators_count THEN
            RAISE EXCEPTION 'Direct modification of collaborators_count is forbidden.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_idea_counters() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_upvote_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.ideas
        SET upvotes_count = upvotes_count + 1
        WHERE id = NEW.idea_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.ideas
        SET upvotes_count = GREATEST(0, upvotes_count - 1)
        WHERE id = OLD.idea_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_upvote_counter() FROM PUBLIC;

-- 5D. Messages: recipients may ONLY update read_at and updated_at
REVOKE UPDATE ON public.messages FROM authenticated, anon;
GRANT UPDATE (read_at, updated_at) ON public.messages TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_message_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Unauthorized: Message content and identity fields are immutable.';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_message_immutable_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_message_immutable_fields ON public.messages;
CREATE TRIGGER trg_protect_message_immutable_fields
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.protect_message_immutable_fields();

-- 5E. Conversations: protect ownership & collaboration_request_id; allow only timestamp updates
REVOKE UPDATE ON public.conversations FROM authenticated, anon;
GRANT UPDATE (last_message_at, updated_at) ON public.conversations TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_conversation_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.collaboration_request_id IS DISTINCT FROM OLD.collaboration_request_id
       OR NEW.idea_id IS DISTINCT FROM OLD.idea_id
       OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
       OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Unauthorized: Conversation identity and participant fields are immutable.';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_conversation_identity() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_conversation_identity ON public.conversations;
CREATE TRIGGER trg_protect_conversation_identity
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.protect_conversation_identity();

-- 5F. Collaboration requests: only status & updated_at can be updated; protect identity fields
REVOKE UPDATE ON public.collaboration_requests FROM authenticated, anon;
GRANT UPDATE (status, updated_at) ON public.collaboration_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_collaboration_request_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.idea_id IS DISTINCT FROM OLD.idea_id
       OR NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
       OR NEW.message IS DISTINCT FROM OLD.message
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Unauthorized: Collaboration request identity and message fields are immutable.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status AND OLD.status != 'pending'::public.request_status THEN
        RAISE EXCEPTION 'Invalid transition: Only pending collaboration requests can change status.';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_collaboration_request_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_collaboration_request_fields ON public.collaboration_requests;
CREATE TRIGGER trg_protect_collaboration_request_fields
    BEFORE UPDATE ON public.collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION public.protect_collaboration_request_fields();

-- 5G. Project members: restrict direct UPDATE to role_title only; protect identity & member_role
REVOKE UPDATE ON public.project_members FROM authenticated, anon;
GRANT UPDATE (role_title) ON public.project_members TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_project_member_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.collaboration_request_id IS DISTINCT FROM OLD.collaboration_request_id
       OR NEW.member_role IS DISTINCT FROM OLD.member_role
       OR NEW.joined_at IS DISTINCT FROM OLD.joined_at THEN
        RAISE EXCEPTION 'Unauthorized: Project membership identity and privilege fields are immutable.';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_project_member_immutable_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_project_member_immutable_fields ON public.project_members;
CREATE TRIGGER trg_protect_project_member_immutable_fields
    BEFORE UPDATE ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.protect_project_member_immutable_fields();

-- 5H. Notifications: restrict direct UPDATE to is_read only
REVOKE UPDATE ON public.notifications FROM authenticated, anon;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

-- 5I. Validate report target existence, prevent self-reporting & rate-limit abuse
CREATE OR REPLACE FUNCTION public.validate_and_guard_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target_exists BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NULL OR NEW.reporter_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Cannot submit reports on behalf of another user.';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Unauthorized: Suspended or banned accounts cannot submit reports.';
    END IF;

    IF NEW.target_type = 'profile'::public.report_target_type AND NEW.target_id = NEW.reporter_id THEN
        RAISE EXCEPTION 'Invalid report: You cannot report your own profile.';
    END IF;

    IF NEW.target_type = 'idea'::public.report_target_type THEN
        SELECT EXISTS (SELECT 1 FROM public.ideas WHERE id = NEW.target_id AND deleted_at IS NULL) INTO v_target_exists;
    ELSIF NEW.target_type = 'comment'::public.report_target_type THEN
        SELECT EXISTS (SELECT 1 FROM public.idea_comments WHERE id = NEW.target_id) INTO v_target_exists;
    ELSIF NEW.target_type = 'profile'::public.report_target_type THEN
        SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.target_id) INTO v_target_exists;
    ELSIF NEW.target_type = 'project'::public.report_target_type THEN
        SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.target_id) INTO v_target_exists;
    END IF;

    IF NOT v_target_exists THEN
        RAISE EXCEPTION 'Invalid report: Target % (%) does not exist.', NEW.target_type, NEW.target_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.reports r
        WHERE r.reporter_id = NEW.reporter_id
          AND r.target_type = NEW.target_type
          AND r.target_id = NEW.target_id
          AND r.status IN ('open', 'investigating')
    ) THEN
        RAISE EXCEPTION 'Duplicate report: You already have an active report for this target.';
    END IF;

    IF NOT public.check_rate_limit(NEW.reporter_id, 'report', 5, INTERVAL '15 minutes') THEN
        RAISE EXCEPTION 'Rate limit exceeded: Please wait before submitting another report.';
    END IF;

    NEW.status := 'open'::public.report_status;
    NEW.resolution_notes := NULL;
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_and_guard_report() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_and_guard_report ON public.reports;
CREATE TRIGGER trg_validate_and_guard_report
    BEFORE INSERT ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.validate_and_guard_report();

-- 5J. Enforce append-only immutability on audit and moderation history tables
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Forbidden: Audit and moderation history records are append-only and immutable.';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_audit_log_mutation() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_immutable_admin_audit_logs ON public.admin_audit_logs;
CREATE TRIGGER trg_immutable_admin_audit_logs
    BEFORE UPDATE OR DELETE ON public.admin_audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_immutable_idea_moderation_history ON public.idea_moderation_history;
CREATE TRIGGER trg_immutable_idea_moderation_history
    BEFORE UPDATE OR DELETE ON public.idea_moderation_history
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES FOR NEW TABLES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profile_security_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_moderation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 6A. public.profile_security_status (Own user or active admin only; writes via admin RPC)
DROP POLICY IF EXISTS "Users and admins can view account security status" ON public.profile_security_status;
CREATE POLICY "Users and admins can view account security status"
    ON public.profile_security_status FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.is_admin()
    );

REVOKE INSERT, UPDATE, DELETE ON public.profile_security_status FROM authenticated, anon;

-- 6B. public.admin_audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Block direct client audit log inserts" ON public.admin_audit_logs;
CREATE POLICY "Block direct client audit log inserts"
    ON public.admin_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (FALSE);

REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_logs FROM authenticated, anon;

-- 6C. public.idea_moderation_history
DROP POLICY IF EXISTS "Admins and idea creators can view moderation history" ON public.idea_moderation_history;
CREATE POLICY "Admins and idea creators can view moderation history"
    ON public.idea_moderation_history FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.ideas i
            WHERE i.id = idea_moderation_history.idea_id
              AND i.creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Block direct client moderation history inserts" ON public.idea_moderation_history;
CREATE POLICY "Block direct client moderation history inserts"
    ON public.idea_moderation_history FOR INSERT
    TO authenticated
    WITH CHECK (FALSE);

REVOKE INSERT, UPDATE, DELETE ON public.idea_moderation_history FROM authenticated, anon;

-- 6D. public.reports
DROP POLICY IF EXISTS "Reporters and admins can view reports" ON public.reports;
CREATE POLICY "Reporters and admins can view reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (
        auth.uid() = reporter_id
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Active users can submit reports" ON public.reports;
CREATE POLICY "Active users can submit reports"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = reporter_id
        AND public.is_active_user()
    );

REVOKE UPDATE, DELETE ON public.reports FROM authenticated, anon;

-- ------------------------------------------------------------------------------
-- 7. AUDIT & HARDEN ALL EXISTING TABLE RLS POLICIES
-- ------------------------------------------------------------------------------

-- 7A. PROFILES
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
        AND role != 'admin'::public.user_role
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id AND public.is_active_user())
    WITH CHECK (auth.uid() = id AND public.is_active_user());

-- 7B. IDEAS (Respect moderation_status, deleted_at, & suspension; deletion via soft_delete_own_idea RPC)
DROP POLICY IF EXISTS "Published ideas are viewable by everyone" ON public.ideas;
CREATE POLICY "Published ideas are viewable by everyone"
    ON public.ideas FOR SELECT
    USING (
        (
            status != 'draft'::public.idea_status
            AND moderation_status = 'approved'::public.idea_moderation_status
            AND deleted_at IS NULL
        )
        OR auth.uid() = creator_id
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Authenticated users can create ideas" ON public.ideas;
CREATE POLICY "Authenticated users can create ideas"
    ON public.ideas FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = creator_id AND public.is_active_user());

DROP POLICY IF EXISTS "Creators can update own ideas" ON public.ideas;
CREATE POLICY "Creators can update own ideas"
    ON public.ideas FOR UPDATE
    TO authenticated
    USING (auth.uid() = creator_id AND deleted_at IS NULL AND public.is_active_user())
    WITH CHECK (auth.uid() = creator_id AND deleted_at IS NULL AND public.is_active_user());

DROP POLICY IF EXISTS "Creators can delete own ideas" ON public.ideas;

-- 7C. IDEA ROLES NEEDED (Enforce parent idea visibility on SELECT)
DROP POLICY IF EXISTS "Roles needed are viewable by everyone" ON public.idea_roles_needed;
CREATE POLICY "Roles needed are viewable by everyone"
    ON public.idea_roles_needed FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ideas i
            WHERE i.id = idea_roles_needed.idea_id
              AND (
                  (
                      i.status != 'draft'::public.idea_status
                      AND i.moderation_status = 'approved'::public.idea_moderation_status
                      AND i.deleted_at IS NULL
                  )
                  OR i.creator_id = auth.uid()
                  OR public.is_admin()
              )
        )
    );

DROP POLICY IF EXISTS "Creators can insert roles for their ideas" ON public.idea_roles_needed;
CREATE POLICY "Creators can insert roles for their ideas"
    ON public.idea_roles_needed FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = idea_roles_needed.idea_id
              AND ideas.creator_id = auth.uid()
              AND ideas.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Creators can update roles for their ideas" ON public.idea_roles_needed;
CREATE POLICY "Creators can update roles for their ideas"
    ON public.idea_roles_needed FOR UPDATE
    TO authenticated
    USING (
        public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = idea_roles_needed.idea_id
              AND ideas.creator_id = auth.uid()
              AND ideas.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Creators can delete roles for their ideas" ON public.idea_roles_needed;
CREATE POLICY "Creators can delete roles for their ideas"
    ON public.idea_roles_needed FOR DELETE
    TO authenticated
    USING (
        public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = idea_roles_needed.idea_id
              AND ideas.creator_id = auth.uid()
              AND ideas.deleted_at IS NULL
        )
    );

-- 7D. IDEA COMMENTS (Enforce parent idea visibility on SELECT and eligibility on INSERT)
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.idea_comments;
CREATE POLICY "Comments are viewable by everyone"
    ON public.idea_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ideas i
            WHERE i.id = idea_comments.idea_id
              AND (
                  (
                      i.status != 'draft'::public.idea_status
                      AND i.moderation_status = 'approved'::public.idea_moderation_status
                      AND i.deleted_at IS NULL
                  )
                  OR i.creator_id = auth.uid()
                  OR public.is_admin()
              )
        )
    );

DROP POLICY IF EXISTS "Authenticated users can post comments" ON public.idea_comments;
CREATE POLICY "Authenticated users can post comments"
    ON public.idea_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = author_id
        AND public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ideas i
            WHERE i.id = idea_comments.idea_id
              AND i.status != 'draft'::public.idea_status
              AND i.moderation_status = 'approved'::public.idea_moderation_status
              AND i.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Authors can delete own comments" ON public.idea_comments;
CREATE POLICY "Authors can delete own comments"
    ON public.idea_comments FOR DELETE
    TO authenticated
    USING (
        (auth.uid() = author_id AND public.is_active_user())
        OR public.is_admin()
    );

-- 7E. COLLABORATION REQUESTS
DROP POLICY IF EXISTS "Update collaboration request status" ON public.collaboration_requests;

DROP POLICY IF EXISTS "Submit collaboration request" ON public.collaboration_requests;
CREATE POLICY "Submit collaboration request"
    ON public.collaboration_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = requester_id
        AND public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ideas i
            WHERE i.id = collaboration_requests.idea_id
              AND i.creator_id != auth.uid()
              AND i.status NOT IN ('draft'::public.idea_status, 'archived'::public.idea_status)
              AND i.moderation_status = 'approved'::public.idea_moderation_status
              AND i.deleted_at IS NULL
        )
        AND (
            role_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.idea_roles_needed rn
                WHERE rn.id = collaboration_requests.role_id
                  AND rn.idea_id = collaboration_requests.idea_id
            )
        )
    );

DROP POLICY IF EXISTS "Requesters can withdraw own pending requests" ON public.collaboration_requests;
CREATE POLICY "Requesters can withdraw own pending requests"
    ON public.collaboration_requests FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = requester_id
        AND public.is_active_user()
        AND status = 'pending'::public.request_status
    )
    WITH CHECK (
        auth.uid() = requester_id
        AND public.is_active_user()
        AND status = 'withdrawn'::public.request_status
    );

DROP POLICY IF EXISTS "Idea creators can accept or decline requests" ON public.collaboration_requests;
CREATE POLICY "Idea creators can accept or decline requests"
    ON public.collaboration_requests FOR UPDATE
    TO authenticated
    USING (
        public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = collaboration_requests.idea_id
              AND ideas.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = collaboration_requests.idea_id
              AND ideas.creator_id = auth.uid()
        )
        AND status IN ('accepted'::public.request_status, 'declined'::public.request_status)
    );

-- 7F. IDEA UPVOTES (Enforce parent idea visibility on SELECT and eligibility on INSERT)
DROP POLICY IF EXISTS "Upvotes viewable by everyone" ON public.idea_upvotes;
CREATE POLICY "Upvotes viewable by everyone"
    ON public.idea_upvotes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ideas i
            WHERE i.id = idea_upvotes.idea_id
              AND (
                  (
                      i.status != 'draft'::public.idea_status
                      AND i.moderation_status = 'approved'::public.idea_moderation_status
                      AND i.deleted_at IS NULL
                  )
                  OR i.creator_id = auth.uid()
                  OR public.is_admin()
              )
        )
    );

DROP POLICY IF EXISTS "Authenticated users can toggle upvote" ON public.idea_upvotes;
CREATE POLICY "Authenticated users can toggle upvote"
    ON public.idea_upvotes FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ideas i
            WHERE i.id = idea_upvotes.idea_id
              AND i.status != 'draft'::public.idea_status
              AND i.moderation_status = 'approved'::public.idea_moderation_status
              AND i.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Users can remove own upvote" ON public.idea_upvotes;
CREATE POLICY "Users can remove own upvote"
    ON public.idea_upvotes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND public.is_active_user());

-- 7G. NOTIFICATIONS
DROP POLICY IF EXISTS "Allow system and authenticated triggers to insert notifications" ON public.notifications;
CREATE POLICY "Allow system and authenticated triggers to insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Users update own notification read state" ON public.notifications;
CREATE POLICY "Users update own notification read state"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id AND public.is_active_user())
    WITH CHECK (auth.uid() = recipient_id AND public.is_active_user());

-- 7H. CONVERSATIONS & MESSAGES
DROP POLICY IF EXISTS "Participants can create conversations" ON public.conversations;
CREATE POLICY "Participants can create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_active_user()
        AND (auth.uid() = creator_id OR auth.uid() = requester_id)
        AND EXISTS (
            SELECT 1 FROM public.collaboration_requests cr
            WHERE cr.id = collaboration_request_id
              AND cr.status IN ('pending', 'accepted')
        )
    );

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
    ON public.conversations FOR UPDATE
    TO authenticated
    USING (
        public.is_active_user()
        AND (auth.uid() = creator_id OR auth.uid() = requester_id)
    )
    WITH CHECK (
        public.is_active_user()
        AND (auth.uid() = creator_id OR auth.uid() = requester_id)
    );

DROP POLICY IF EXISTS "Participants can send messages to active conversations" ON public.messages;
CREATE POLICY "Participants can send messages to active conversations"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.collaboration_requests cr ON cr.id = c.collaboration_request_id
            WHERE c.id = messages.conversation_id
              AND (c.creator_id = auth.uid() OR c.requester_id = auth.uid())
              AND cr.status IN ('pending', 'accepted')
        )
    );

DROP POLICY IF EXISTS "Recipients can update message read status" ON public.messages;
CREATE POLICY "Recipients can update message read status"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        sender_id != auth.uid()
        AND public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.creator_id = auth.uid() OR c.requester_id = auth.uid())
        )
    )
    WITH CHECK (
        sender_id != auth.uid()
        AND public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.creator_id = auth.uid() OR c.requester_id = auth.uid())
        )
    );

-- 7I. PROJECTS & PROJECT MEMBERS
DROP POLICY IF EXISTS "Project owners and members can view projects" ON public.projects;
CREATE POLICY "Project owners and members can view projects"
    ON public.projects FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR public.is_project_member(id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can create projects" ON public.projects;
CREATE POLICY "Owners can create projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;
CREATE POLICY "Project owners can update projects"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid() AND public.is_active_user())
    WITH CHECK (owner_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;
CREATE POLICY "Project owners can delete projects"
    ON public.projects FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Project members can view team roster" ON public.project_members;
CREATE POLICY "Project members can view team roster"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project owners can insert members" ON public.project_members;
CREATE POLICY "Project owners can insert members"
    ON public.project_members FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
              AND p.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;
CREATE POLICY "Project owners can update members"
    ON public.project_members FOR UPDATE
    TO authenticated
    USING (
        public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
              AND p.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Project owners can remove members or self leave" ON public.project_members;
CREATE POLICY "Project owners can remove members or self leave"
    ON public.project_members FOR DELETE
    TO authenticated
    USING (
        public.is_active_user()
        AND (
            (member_role != 'owner' AND user_id = auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.projects p
                WHERE p.id = project_members.project_id
                  AND p.owner_id = auth.uid()
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 8. USER WORKFLOW & EXISTING SECURITY DEFINER RPCs (NO CUSTOM GUCs, search_path = '')
-- ------------------------------------------------------------------------------

-- 8A. Preserves founder/collaborator profile selection without allowing admin elevation/demotion
CREATE OR REPLACE FUNCTION public.switch_creator_collaborator_role(
    p_role public.user_role
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.profiles;
    v_updated public.profiles;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned.' USING ERRCODE = '42501';
    END IF;

    IF p_role NOT IN ('founder'::public.user_role, 'collaborator'::public.user_role) THEN
        RAISE EXCEPTION 'Unauthorized: Only founder or collaborator roles can be self-selected.';
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_profile.role = 'admin'::public.user_role THEN
        RAISE EXCEPTION 'Forbidden: Administrator role changes must use admin_update_user_role.';
    END IF;

    UPDATE public.profiles
    SET role = p_role,
        updated_at = pg_catalog.now()
    WHERE id = v_user_id
    RETURNING * INTO v_updated;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.switch_creator_collaborator_role(public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.switch_creator_collaborator_role(public.user_role) TO authenticated;

-- 8B. Soft-delete own idea (preserves moderation history & records system audit trail for dismissed reports)
CREATE OR REPLACE FUNCTION public.soft_delete_own_idea(p_idea_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_idea public.ideas;
    v_report RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_idea
    FROM public.ideas
    WHERE id = p_idea_id
    FOR UPDATE;

    IF NOT FOUND OR v_idea.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Idea not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_idea.creator_id != v_user_id THEN
        RAISE EXCEPTION 'Unauthorized: Only the idea creator can delete this idea.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.ideas
    SET deleted_at = pg_catalog.now(),
        status = 'archived'::public.idea_status,
        updated_at = pg_catalog.now()
    WHERE id = p_idea_id;

    FOR v_report IN
        SELECT id, status
        FROM public.reports
        WHERE target_type = 'idea'::public.report_target_type
          AND target_id = p_idea_id
          AND status IN ('open'::public.report_status, 'investigating'::public.report_status)
        FOR UPDATE
    LOOP
        UPDATE public.reports
        SET status = 'dismissed'::public.report_status,
            resolution_notes = 'Target idea was deleted by its creator.',
            resolved_at = pg_catalog.now(),
            updated_at = pg_catalog.now()
        WHERE id = v_report.id;

        INSERT INTO public.admin_audit_logs (
            actor_type, admin_id, action, target_type, target_id, previous_values, new_values, reason
        ) VALUES (
            'system',
            NULL,
            'report_auto_dismissed_target_deleted',
            'report',
            v_report.id,
            pg_catalog.jsonb_build_object('status', v_report.status),
            pg_catalog.jsonb_build_object(
                'status', 'dismissed',
                'deleted_idea_id', p_idea_id,
                'triggered_by_creator_id', v_user_id
            ),
            'Target idea was soft-deleted by its creator.'
        );
    END LOOP;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_own_idea(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_own_idea(UUID) TO authenticated;

-- 8C. toggle_idea_upvote_secure
CREATE OR REPLACE FUNCTION public.toggle_idea_upvote_secure(p_idea_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
    v_new_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to upvote.';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.ideas
        WHERE id = p_idea_id
          AND status != 'draft'::public.idea_status
          AND moderation_status = 'approved'::public.idea_moderation_status
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Idea not found or not eligible for upvoting.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.idea_upvotes
        WHERE idea_id = p_idea_id AND user_id = v_user_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.idea_upvotes
        WHERE idea_id = p_idea_id AND user_id = v_user_id;

        SELECT upvotes_count INTO v_new_count
        FROM public.ideas
        WHERE id = p_idea_id;

        RETURN pg_catalog.jsonb_build_object(
            'upvoted', FALSE,
            'upvotes_count', v_new_count
        );
    ELSE
        INSERT INTO public.idea_upvotes (idea_id, user_id)
        VALUES (p_idea_id, v_user_id)
        ON CONFLICT (idea_id, user_id) DO NOTHING;

        SELECT upvotes_count INTO v_new_count
        FROM public.ideas
        WHERE id = p_idea_id;

        RETURN pg_catalog.jsonb_build_object(
            'upvoted', TRUE,
            'upvotes_count', v_new_count
        );
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_idea_upvote_secure(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_idea_upvote_secure(UUID) TO authenticated;

-- 8D. respond_to_collaboration_request
CREATE OR REPLACE FUNCTION public.respond_to_collaboration_request(
    p_request_id UUID,
    p_decision TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_req RECORD;
    v_user_id UUID;
    v_valid_status public.request_status;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned.';
    END IF;

    IF p_decision NOT IN ('accepted', 'declined', 'withdrawn') THEN
        RAISE EXCEPTION 'Invalid decision status: %', p_decision;
    END IF;

    v_valid_status := p_decision::public.request_status;

    SELECT r.id, r.idea_id, r.role_id, r.requester_id, r.status, i.creator_id
    INTO v_req
    FROM public.collaboration_requests r
    JOIN public.ideas i ON i.id = r.idea_id
    WHERE r.id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Collaboration request not found.';
    END IF;

    IF v_req.status != 'pending'::public.request_status THEN
        RAISE EXCEPTION 'Invalid transition: Only pending requests can be updated.';
    END IF;

    IF v_valid_status = 'withdrawn'::public.request_status THEN
        IF v_req.requester_id != v_user_id THEN
            RAISE EXCEPTION 'Only the requester can withdraw this application.';
        END IF;
    ELSE
        IF v_req.creator_id != v_user_id THEN
            RAISE EXCEPTION 'Only the idea creator can accept or decline this application.';
        END IF;
    END IF;

    UPDATE public.collaboration_requests
    SET status = v_valid_status,
        updated_at = pg_catalog.now()
    WHERE id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'request_id', p_request_id,
        'status', p_decision
    );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_collaboration_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_collaboration_request(UUID, TEXT) TO authenticated;

-- 8E. get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_request_id UUID)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_req RECORD;
    v_conv public.conversations;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned' USING ERRCODE = '42501';
    END IF;

    SELECT cr.id, cr.idea_id, cr.requester_id, cr.status, i.creator_id
    INTO v_req
    FROM public.collaboration_requests cr
    JOIN public.ideas i ON i.id = cr.idea_id
    WHERE cr.id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Collaboration request not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_user_id != v_req.requester_id AND v_user_id != v_req.creator_id THEN
        RAISE EXCEPTION 'Unauthorized: you are not a participant in this collaboration request' USING ERRCODE = '42501';
    END IF;

    IF v_req.status NOT IN ('pending', 'accepted') THEN
        RAISE EXCEPTION 'Cannot open conversation for % requests', v_req.status USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_conv
    FROM public.conversations
    WHERE collaboration_request_id = p_request_id;

    IF FOUND THEN
        RETURN v_conv;
    END IF;

    INSERT INTO public.conversations (
        collaboration_request_id,
        idea_id,
        creator_id,
        requester_id,
        last_message_at
    )
    VALUES (
        v_req.id,
        v_req.idea_id,
        v_req.creator_id,
        v_req.requester_id,
        pg_catalog.now()
    )
    ON CONFLICT (collaboration_request_id) DO UPDATE
    SET updated_at = pg_catalog.now()
    RETURNING * INTO v_conv;

    RETURN v_conv;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID) TO authenticated;

-- 8F. mark_conversation_messages_as_read
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_as_read(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_updated_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id
          AND (creator_id = v_user_id OR requester_id = v_user_id)
    ) THEN
        RAISE EXCEPTION 'Unauthorized: conversation not found or access denied' USING ERRCODE = '42501';
    END IF;

    UPDATE public.messages
    SET read_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE conversation_id = p_conversation_id
      AND sender_id != v_user_id
      AND read_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_messages_as_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_as_read(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 9. AUDITED ADMINISTRATIVE RPCs
-- ------------------------------------------------------------------------------

-- 9A. Update User Role
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    p_target_user_id UUID,
    p_new_role public.user_role,
    p_reason TEXT DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_acting_admin public.profiles;
    v_acting_sec public.profile_security_status;
    v_target public.profiles;
    v_updated public.profiles;
    v_remaining_admins INTEGER;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    PERFORM 1
    FROM public.profiles
    WHERE id IN (v_admin_id, p_target_user_id)
       OR role = 'admin'::public.user_role
    ORDER BY id ASC
    FOR UPDATE;

    SELECT * INTO v_acting_admin
    FROM public.profiles
    WHERE id = v_admin_id;

    SELECT * INTO v_acting_sec
    FROM public.profile_security_status
    WHERE user_id = v_admin_id;

    IF NOT FOUND THEN
        v_acting_sec.account_status := 'active'::public.account_status;
        v_acting_sec.suspended_until := NULL;
    END IF;

    IF v_acting_admin.id IS NULL
       OR v_acting_admin.role != 'admin'::public.user_role
       OR NOT (
           v_acting_sec.account_status = 'active'::public.account_status
           OR (
               v_acting_sec.account_status = 'suspended'::public.account_status
               AND v_acting_sec.suspended_until IS NOT NULL
               AND v_acting_sec.suspended_until <= pg_catalog.now()
           )
       ) THEN
        RAISE EXCEPTION 'Unauthorized: Active administrator access required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_target
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target profile not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_target.role = p_new_role THEN
        RETURN v_target;
    END IF;

    IF v_target.id = v_admin_id AND p_new_role != 'admin'::public.user_role THEN
        RAISE EXCEPTION 'Forbidden: Administrators cannot demote themselves.';
    END IF;

    IF v_target.role = 'admin'::public.user_role AND p_new_role != 'admin'::public.user_role THEN
        SELECT COUNT(*) INTO v_remaining_admins
        FROM public.profiles p
        LEFT JOIN public.profile_security_status s ON s.user_id = p.id
        WHERE p.id != p_target_user_id
          AND p.role = 'admin'::public.user_role
          AND (
              s.user_id IS NULL
              OR s.account_status = 'active'::public.account_status
              OR (
                  s.account_status = 'suspended'::public.account_status
                  AND s.suspended_until IS NOT NULL
                  AND s.suspended_until <= pg_catalog.now()
              )
          );

        IF v_remaining_admins < 1 THEN
            RAISE EXCEPTION 'Forbidden: Cannot demote the last active administrator.';
        END IF;
    END IF;

    UPDATE public.profiles
    SET role = p_new_role,
        updated_at = pg_catalog.now()
    WHERE id = p_target_user_id
    RETURNING * INTO v_updated;

    INSERT INTO public.admin_audit_logs (
        actor_type, admin_id, action, target_type, target_id, previous_values, new_values, reason
    ) VALUES (
        'admin',
        v_admin_id,
        'user_role_updated',
        'profile',
        p_target_user_id,
        pg_catalog.jsonb_build_object('role', v_target.role),
        pg_catalog.jsonb_build_object('role', v_updated.role),
        NULLIF(pg_catalog.btrim(COALESCE(p_reason, '')), '')
    );

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(UUID, public.user_role, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, public.user_role, TEXT) TO authenticated;

-- 9B. Update User Account Status (stored in private profile_security_status)
DROP FUNCTION IF EXISTS public.admin_update_user_status(UUID, public.account_status, TEXT, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.admin_update_user_status(
    p_target_user_id UUID,
    p_new_status public.account_status,
    p_reason TEXT DEFAULT NULL,
    p_suspended_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.profile_security_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_acting_admin public.profiles;
    v_acting_sec public.profile_security_status;
    v_target public.profiles;
    v_prev_sec public.profile_security_status;
    v_updated public.profile_security_status;
    v_remaining_admins INTEGER;
    v_effective_until TIMESTAMPTZ;
    v_clean_reason TEXT;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    PERFORM 1
    FROM public.profiles
    WHERE id IN (v_admin_id, p_target_user_id)
       OR role = 'admin'::public.user_role
    ORDER BY id ASC
    FOR UPDATE;

    SELECT * INTO v_acting_admin
    FROM public.profiles
    WHERE id = v_admin_id;

    SELECT * INTO v_acting_sec
    FROM public.profile_security_status
    WHERE user_id = v_admin_id;

    IF NOT FOUND THEN
        v_acting_sec.account_status := 'active'::public.account_status;
        v_acting_sec.suspended_until := NULL;
    END IF;

    IF v_acting_admin.id IS NULL
       OR v_acting_admin.role != 'admin'::public.user_role
       OR NOT (
           v_acting_sec.account_status = 'active'::public.account_status
           OR (
               v_acting_sec.account_status = 'suspended'::public.account_status
               AND v_acting_sec.suspended_until IS NOT NULL
               AND v_acting_sec.suspended_until <= pg_catalog.now()
           )
       ) THEN
        RAISE EXCEPTION 'Unauthorized: Active administrator access required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_target
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target profile not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_target.id = v_admin_id AND p_new_status != 'active'::public.account_status THEN
        RAISE EXCEPTION 'Forbidden: Administrators cannot suspend or ban themselves.';
    END IF;

    IF p_new_status = 'suspended'::public.account_status
       AND p_suspended_until IS NOT NULL
       AND p_suspended_until <= pg_catalog.now() THEN
        RAISE EXCEPTION 'Invalid suspension expiry: suspended_until must be in the future.';
    END IF;

    IF v_target.role = 'admin'::public.user_role AND p_new_status != 'active'::public.account_status THEN
        SELECT COUNT(*) INTO v_remaining_admins
        FROM public.profiles p
        LEFT JOIN public.profile_security_status s ON s.user_id = p.id
        WHERE p.id != p_target_user_id
          AND p.role = 'admin'::public.user_role
          AND (
              s.user_id IS NULL
              OR s.account_status = 'active'::public.account_status
              OR (
                  s.account_status = 'suspended'::public.account_status
                  AND s.suspended_until IS NOT NULL
                  AND s.suspended_until <= pg_catalog.now()
              )
          );

        IF v_remaining_admins < 1 THEN
            RAISE EXCEPTION 'Forbidden: Cannot suspend or ban the last active administrator.';
        END IF;
    END IF;

    SELECT * INTO v_prev_sec
    FROM public.profile_security_status
    WHERE user_id = p_target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        v_prev_sec.account_status := 'active'::public.account_status;
        v_prev_sec.status_reason := NULL;
        v_prev_sec.suspended_until := NULL;
    END IF;

    v_effective_until := CASE
        WHEN p_new_status = 'suspended'::public.account_status THEN p_suspended_until
        ELSE NULL
    END;

    v_clean_reason := CASE
        WHEN p_new_status = 'active'::public.account_status THEN NULL
        ELSE NULLIF(pg_catalog.btrim(COALESCE(p_reason, '')), '')
    END;

    INSERT INTO public.profile_security_status (
        user_id, account_status, status_reason, suspended_until, updated_by, updated_at
    ) VALUES (
        p_target_user_id, p_new_status, v_clean_reason, v_effective_until, v_admin_id, pg_catalog.now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET account_status = EXCLUDED.account_status,
        status_reason = EXCLUDED.status_reason,
        suspended_until = EXCLUDED.suspended_until,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
    RETURNING * INTO v_updated;

    INSERT INTO public.admin_audit_logs (
        actor_type, admin_id, action, target_type, target_id, previous_values, new_values, reason
    ) VALUES (
        'admin',
        v_admin_id,
        'user_status_updated',
        'profile',
        p_target_user_id,
        pg_catalog.jsonb_build_object(
            'account_status', v_prev_sec.account_status,
            'status_reason', v_prev_sec.status_reason,
            'suspended_until', v_prev_sec.suspended_until
        ),
        pg_catalog.jsonb_build_object(
            'account_status', v_updated.account_status,
            'status_reason', v_updated.status_reason,
            'suspended_until', v_updated.suspended_until
        ),
        NULLIF(pg_catalog.btrim(COALESCE(p_reason, '')), '')
    );

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_status(UUID, public.account_status, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_status(UUID, public.account_status, TEXT, TIMESTAMPTZ) TO authenticated;

-- 9C. Moderate Idea
CREATE OR REPLACE FUNCTION public.admin_moderate_idea(
    p_idea_id UUID,
    p_moderation_status public.idea_moderation_status,
    p_reason TEXT DEFAULT NULL
)
RETURNS public.ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_acting_admin public.profiles;
    v_acting_sec public.profile_security_status;
    v_idea public.ideas;
    v_updated public.ideas;
    v_clean_reason TEXT;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_acting_admin
    FROM public.profiles
    WHERE id = v_admin_id
    FOR SHARE;

    SELECT * INTO v_acting_sec
    FROM public.profile_security_status
    WHERE user_id = v_admin_id
    FOR SHARE;

    IF NOT FOUND THEN
        v_acting_sec.account_status := 'active'::public.account_status;
        v_acting_sec.suspended_until := NULL;
    END IF;

    IF v_acting_admin.id IS NULL
       OR v_acting_admin.role != 'admin'::public.user_role
       OR NOT (
           v_acting_sec.account_status = 'active'::public.account_status
           OR (
               v_acting_sec.account_status = 'suspended'::public.account_status
               AND v_acting_sec.suspended_until IS NOT NULL
               AND v_acting_sec.suspended_until <= pg_catalog.now()
           )
       ) THEN
        RAISE EXCEPTION 'Unauthorized: Active administrator access required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_idea
    FROM public.ideas
    WHERE id = p_idea_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.' USING ERRCODE = 'P0002';
    END IF;

    v_clean_reason := NULLIF(pg_catalog.btrim(COALESCE(p_reason, '')), '');

    IF p_moderation_status IN ('rejected'::public.idea_moderation_status, 'removed'::public.idea_moderation_status)
       AND v_clean_reason IS NULL THEN
        RAISE EXCEPTION 'A moderation reason is required when rejecting or removing an idea.';
    END IF;

    UPDATE public.ideas
    SET moderation_status = p_moderation_status,
        moderation_reason = v_clean_reason,
        moderated_by = v_admin_id,
        moderated_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_idea_id
    RETURNING * INTO v_updated;

    INSERT INTO public.idea_moderation_history (
        idea_id, admin_id, previous_status, new_status, reason
    ) VALUES (
        p_idea_id,
        v_admin_id,
        v_idea.moderation_status,
        v_updated.moderation_status,
        v_clean_reason
    );

    INSERT INTO public.admin_audit_logs (
        actor_type, admin_id, action, target_type, target_id, previous_values, new_values, reason
    ) VALUES (
        'admin',
        v_admin_id,
        'idea_moderated',
        'idea',
        p_idea_id,
        pg_catalog.jsonb_build_object(
            'moderation_status', v_idea.moderation_status,
            'moderation_reason', v_idea.moderation_reason
        ),
        pg_catalog.jsonb_build_object(
            'moderation_status', v_updated.moderation_status,
            'moderation_reason', v_updated.moderation_reason
        ),
        v_clean_reason
    );

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_idea(UUID, public.idea_moderation_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_moderate_idea(UUID, public.idea_moderation_status, TEXT) TO authenticated;

-- 9D. Resolve / Update Report Status
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
    p_report_id UUID,
    p_new_status public.report_status,
    p_resolution_notes TEXT DEFAULT NULL
)
RETURNS public.reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID;
    v_acting_admin public.profiles;
    v_acting_sec public.profile_security_status;
    v_report public.reports;
    v_updated public.reports;
    v_clean_notes TEXT;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_acting_admin
    FROM public.profiles
    WHERE id = v_admin_id
    FOR SHARE;

    SELECT * INTO v_acting_sec
    FROM public.profile_security_status
    WHERE user_id = v_admin_id
    FOR SHARE;

    IF NOT FOUND THEN
        v_acting_sec.account_status := 'active'::public.account_status;
        v_acting_sec.suspended_until := NULL;
    END IF;

    IF v_acting_admin.id IS NULL
       OR v_acting_admin.role != 'admin'::public.user_role
       OR NOT (
           v_acting_sec.account_status = 'active'::public.account_status
           OR (
               v_acting_sec.account_status = 'suspended'::public.account_status
               AND v_acting_sec.suspended_until IS NOT NULL
               AND v_acting_sec.suspended_until <= pg_catalog.now()
           )
       ) THEN
        RAISE EXCEPTION 'Unauthorized: Active administrator access required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_report
    FROM public.reports
    WHERE id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_report.status = p_new_status THEN
        RAISE EXCEPTION 'Invalid transition: Report is already in status %.', p_new_status;
    END IF;

    IF v_report.status IN ('resolved'::public.report_status, 'dismissed'::public.report_status) THEN
        RAISE EXCEPTION 'Invalid transition: Reports in terminal status (%) cannot be modified.', v_report.status;
    END IF;

    v_clean_notes := NULLIF(pg_catalog.btrim(COALESCE(p_resolution_notes, '')), '');

    IF p_new_status IN ('resolved'::public.report_status, 'dismissed'::public.report_status)
       AND (v_clean_notes IS NULL OR pg_catalog.char_length(v_clean_notes) < 3) THEN
        RAISE EXCEPTION 'Resolution notes (at least 3 characters) are mandatory when resolving or dismissing a report.';
    END IF;

    UPDATE public.reports
    SET status = p_new_status,
        resolution_notes = COALESCE(v_clean_notes, resolution_notes),
        resolved_by = CASE
            WHEN p_new_status IN ('resolved'::public.report_status, 'dismissed'::public.report_status) THEN v_admin_id
            ELSE NULL
        END,
        resolved_at = CASE
            WHEN p_new_status IN ('resolved'::public.report_status, 'dismissed'::public.report_status) THEN pg_catalog.now()
            ELSE NULL
        END,
        updated_at = pg_catalog.now()
    WHERE id = p_report_id
    RETURNING * INTO v_updated;

    INSERT INTO public.admin_audit_logs (
        actor_type, admin_id, action, target_type, target_id, previous_values, new_values, reason
    ) VALUES (
        'admin',
        v_admin_id,
        'report_status_updated',
        'report',
        p_report_id,
        pg_catalog.jsonb_build_object(
            'status', v_report.status,
            'resolution_notes', v_report.resolution_notes
        ),
        pg_catalog.jsonb_build_object(
            'status', v_updated.status,
            'resolution_notes', v_updated.resolution_notes,
            'report_target_type', v_updated.target_type,
            'report_target_id', v_updated.target_id
        ),
        v_clean_notes
    );

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, public.report_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, public.report_status, TEXT) TO authenticated;

-- 9E. Aggregate Platform Statistics
CREATE OR REPLACE FUNCTION public.admin_get_platform_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Administrator access required.' USING ERRCODE = '42501';
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM public.profiles),
        'active_users', (
            SELECT COUNT(*)
            FROM public.profiles p
            LEFT JOIN public.profile_security_status s ON s.user_id = p.id
            WHERE s.user_id IS NULL
               OR s.account_status = 'active'::public.account_status
               OR (s.account_status = 'suspended'::public.account_status AND s.suspended_until IS NOT NULL AND s.suspended_until <= pg_catalog.now())
        ),
        'suspended_users', (
            SELECT COUNT(*)
            FROM public.profile_security_status s
            WHERE s.account_status = 'suspended'::public.account_status
              AND (s.suspended_until IS NULL OR s.suspended_until > pg_catalog.now())
        ),
        'banned_users', (
            SELECT COUNT(*)
            FROM public.profile_security_status s
            WHERE s.account_status = 'banned'::public.account_status
        ),
        'admin_users', (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin'::public.user_role),
        'total_ideas', (SELECT COUNT(*) FROM public.ideas WHERE deleted_at IS NULL),
        'published_ideas', (
            SELECT COUNT(*) FROM public.ideas
            WHERE status != 'draft'::public.idea_status
              AND moderation_status = 'approved'::public.idea_moderation_status
              AND deleted_at IS NULL
        ),
        'draft_ideas', (
            SELECT COUNT(*) FROM public.ideas
            WHERE status = 'draft'::public.idea_status
              AND deleted_at IS NULL
        ),
        'flagged_or_removed_ideas', (
            SELECT COUNT(*) FROM public.ideas
            WHERE moderation_status IN ('pending_review'::public.idea_moderation_status, 'rejected'::public.idea_moderation_status, 'removed'::public.idea_moderation_status)
               OR deleted_at IS NOT NULL
        ),
        'total_projects', (SELECT COUNT(*) FROM public.projects),
        'active_projects', (SELECT COUNT(*) FROM public.projects WHERE status = 'active'::public.project_status),
        'open_reports', (SELECT COUNT(*) FROM public.reports WHERE status IN ('open'::public.report_status, 'investigating'::public.report_status))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_stats() TO authenticated;

-- 9F. Project Oversight Metadata-Only RPC
CREATE OR REPLACE FUNCTION public.admin_list_projects()
RETURNS TABLE (
    id UUID,
    idea_id UUID,
    owner_id UUID,
    owner_username TEXT,
    owner_full_name TEXT,
    title TEXT,
    status public.project_status,
    member_count BIGINT,
    created_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Administrator access required.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.idea_id,
        p.owner_id,
        pr.username AS owner_username,
        pr.full_name AS owner_full_name,
        p.title,
        p.status,
        (SELECT COUNT(*) FROM public.project_members pm WHERE pm.project_id = p.id) AS member_count,
        p.created_at,
        p.last_activity_at
    FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    ORDER BY p.last_activity_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_projects() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_projects() TO authenticated;
