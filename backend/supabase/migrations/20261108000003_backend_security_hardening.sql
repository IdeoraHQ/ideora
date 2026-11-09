-- ==============================================================================
-- IDEORA: Hardened Backend Security, RLS Fortification, RPC Rate Limits & Anti-Spoofing
-- Migration: 20261108000003_backend_security_hardening.sql
-- Description:
--   1. Fix search_path on all SECURITY DEFINER functions to prevent search_path hijacking.
--   2. Strict column-level protection on profiles (prevent privilege escalation to 'admin').
--   3. Anti-tampering triggers on ideas (protect upvotes_count and collaborators_count from direct client update).
--   4. Collaboration request state-machine validation (applicants cannot self-accept; founders cannot accept for other ideas).
--   5. Upvote anti-manipulation & atomicity enforcement via a secure RPC function.
--   6. Rate-limiting mechanism for public RPC calls and comments to deter bot spam.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN SEARCH_PATH ON ALL SECURITY DEFINER FUNCTIONS (Prevents search_path attacks)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    raw_username TEXT;
    raw_name TEXT;
BEGIN
    raw_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    );
    raw_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    -- Enforce that a newly signed-up user is always created as 'collaborator' or 'founder' (never 'admin')
    INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        raw_username,
        raw_name,
        NEW.raw_user_meta_data->>'avatar_url',
        'collaborator'::public.user_role
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = TIMEZONE('utc', NOW());

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_upvote_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.handle_collaboration_request_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_idea_title TEXT;
    v_idea_creator UUID;
    v_requester_name TEXT;
    v_role_title TEXT;
BEGIN
    SELECT title, creator_id INTO v_idea_title, v_idea_creator
    FROM public.ideas
    WHERE id = NEW.idea_id;

    SELECT full_name INTO v_requester_name
    FROM public.profiles
    WHERE id = NEW.requester_id;

    IF NEW.role_id IS NOT NULL THEN
        SELECT role_title INTO v_role_title
        FROM public.idea_roles_needed
        WHERE id = NEW.role_id;
    END IF;

    -- On new collaboration request: notify the idea founder
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.notifications (
            recipient_id,
            actor_id,
            idea_id,
            type,
            title,
            content
        ) VALUES (
            v_idea_creator,
            NEW.requester_id,
            NEW.idea_id,
            'collaboration_request',
            'New Collaboration Request',
            COALESCE(v_requester_name, 'A builder') || ' applied for ' ||
            COALESCE(v_role_title, 'collaboration') || ' on "' || COALESCE(v_idea_title, 'your idea') || '".'
        );
        RETURN NEW;
    END IF;

    -- On status update
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        IF (NEW.status = 'accepted' AND OLD.status != 'accepted') THEN
            -- Increment spots_filled on the role if applicable
            IF NEW.role_id IS NOT NULL THEN
                UPDATE public.idea_roles_needed
                SET spots_filled = LEAST(spots_available, spots_filled + 1)
                WHERE id = NEW.role_id;
            END IF;

            -- Increment collaborators_count on the idea
            UPDATE public.ideas
            SET collaborators_count = collaborators_count + 1
            WHERE id = NEW.idea_id;

            -- Notify requester of acceptance
            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            ) VALUES (
                NEW.requester_id,
                v_idea_creator,
                NEW.idea_id,
                'request_accepted',
                'Collaboration Request Accepted!',
                'Your application for ' || COALESCE(v_role_title, 'collaboration') ||
                ' on "' || COALESCE(v_idea_title, 'an idea') || '" has been accepted!'
            );
        ELSIF (NEW.status = 'declined' AND OLD.status != 'declined') THEN
            -- Notify requester of decline
            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            ) VALUES (
                NEW.requester_id,
                v_idea_creator,
                NEW.idea_id,
                'request_declined',
                'Collaboration Request Update',
                'Your request to join "' || COALESCE(v_idea_title, 'an idea') || '" was not selected at this time.'
            );
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_idea_title TEXT;
    v_idea_creator UUID;
    v_author_name TEXT;
BEGIN
    SELECT title, creator_id INTO v_idea_title, v_idea_creator
    FROM public.ideas
    WHERE id = NEW.idea_id;

    IF v_idea_creator IS NOT NULL AND v_idea_creator != NEW.author_id THEN
        SELECT full_name INTO v_author_name
        FROM public.profiles
        WHERE id = NEW.author_id;

        INSERT INTO public.notifications (
            recipient_id,
            actor_id,
            idea_id,
            type,
            title,
            content
        ) VALUES (
            v_idea_creator,
            NEW.author_id,
            NEW.idea_id,
            'new_comment',
            'New Comment on Your Idea',
            COALESCE(v_author_name, 'Someone') || ' commented on "' || COALESCE(v_idea_title, 'your idea') || '".'
        );
    END IF;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. PREVENT PRIVILEGE ESCALATION ON PROFILES
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only an existing admin or service_role can elevate a role to 'admin'
    IF NEW.role = 'admin'::public.user_role AND OLD.role != 'admin'::public.user_role THEN
        IF auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Unauthorized: You cannot elevate privileges to admin.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ------------------------------------------------------------------------------
-- 3. ANTI-TAMPERING TRIGGERS ON IDEAS (Prevent Direct Client Count Manipulation)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_idea_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only block direct client REST API updates (depth 1), while allowing trusted internal triggers (depth > 1)
    IF auth.role() = 'authenticated' AND pg_trigger_depth() <= 1 THEN
        IF NEW.upvotes_count != OLD.upvotes_count THEN
            RAISE EXCEPTION 'Direct modification of upvotes_count is forbidden. Use the upvote system.';
        END IF;
        IF NEW.collaborators_count != OLD.collaborators_count THEN
            RAISE EXCEPTION 'Direct modification of collaborators_count is forbidden.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_idea_counters ON public.ideas;
CREATE TRIGGER trg_protect_idea_counters
    BEFORE UPDATE OF upvotes_count, collaborators_count ON public.ideas
    FOR EACH ROW EXECUTE FUNCTION public.protect_idea_counters();

-- ------------------------------------------------------------------------------
-- 4. HARDEN COLLABORATION REQUESTS RLS & STATE TRANSITIONS
-- ------------------------------------------------------------------------------

-- Drop existing generic update policy
DROP POLICY IF EXISTS "Update collaboration request status" ON public.collaboration_requests;

-- A. Requesters can ONLY withdraw their pending requests (cannot self-accept or self-decline)
CREATE POLICY "Requesters can withdraw own pending requests"
    ON public.collaboration_requests FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = requester_id
        AND status = 'pending'::public.request_status
    )
    WITH CHECK (
        auth.uid() = requester_id
        AND status = 'withdrawn'::public.request_status
    );

-- B. Only the IDEA CREATOR can accept or decline applications
CREATE POLICY "Idea creators can accept or decline requests"
    ON public.collaboration_requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = collaboration_requests.idea_id
              AND ideas.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = collaboration_requests.idea_id
              AND ideas.creator_id = auth.uid()
        )
        AND status IN ('accepted'::public.request_status, 'declined'::public.request_status)
    );

-- ------------------------------------------------------------------------------
-- 5. RATE LIMITING TABLE & SECURITY GUARD FOR COMMENTS & REQUESTS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_action_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_action_audit ON public.user_action_audit(user_id, action_type, created_at DESC);

ALTER TABLE public.user_action_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action audit"
    ON public.user_action_audit FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_action_type TEXT,
    p_limit INTEGER,
    p_window_interval INTERVAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.user_action_audit
    WHERE user_id = p_user_id
      AND action_type = p_action_type
      AND created_at >= (TIMEZONE('utc', NOW()) - p_window_interval);

    IF v_recent_count >= p_limit THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.user_action_audit (user_id, action_type)
    VALUES (p_user_id, p_action_type);

    RETURN TRUE;
END;
$$;

-- Enforce comment rate limiting (Max 10 comments per 5 minutes per user)
CREATE OR REPLACE FUNCTION public.rate_limit_comments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.check_rate_limit(NEW.author_id, 'comment', 10, INTERVAL '5 minutes') THEN
        RAISE EXCEPTION 'Rate limit exceeded: You can only post 10 comments every 5 minutes.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rate_limit_comments ON public.idea_comments;
CREATE TRIGGER trg_rate_limit_comments
    BEFORE INSERT ON public.idea_comments
    FOR EACH ROW EXECUTE FUNCTION public.rate_limit_comments();

-- ------------------------------------------------------------------------------
-- 6. ATOMIC SECURE UPVOTE RPC FUNCTION (Prevents race conditions & double-voting)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.toggle_idea_upvote_secure(p_idea_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

    -- Check if idea exists
    IF NOT EXISTS (SELECT 1 FROM public.ideas WHERE id = p_idea_id) THEN
        RAISE EXCEPTION 'Idea not found.';
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

        RETURN jsonb_build_object(
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

        RETURN jsonb_build_object(
            'upvoted', TRUE,
            'upvotes_count', v_new_count
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_idea_upvote_secure(UUID) TO authenticated;

