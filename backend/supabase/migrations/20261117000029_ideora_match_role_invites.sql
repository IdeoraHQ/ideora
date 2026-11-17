-- ==============================================================================
-- IDEORA: Phase 1 — Role Invitation Workflow for Ideora Match
-- Migration: 20261117000029_ideora_match_role_invites.sql
--
-- Extends existing `public.collaboration_requests` (no duplicate tables) to
-- support founder-initiated `'role_invite'` invitations alongside `'idea_based'`
-- applications and `'general'` collaboration requests, while preserving all
-- existing `'idea_based'` and `'general'` behavior, RLS, capacity safety,
-- notifications, project membership sync, and 1:1 conversations.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND request_type CHECK CONSTRAINT & PREVENT DUPLICATE PENDING INVITES
-- ------------------------------------------------------------------------------
ALTER TABLE public.collaboration_requests
    DROP CONSTRAINT IF EXISTS chk_collab_request_type;

ALTER TABLE public.collaboration_requests
    ADD CONSTRAINT chk_collab_request_type
    CHECK (request_type IN ('idea_based', 'general', 'role_invite'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_role_invite_with_role
    ON public.collaboration_requests (idea_id, role_id, recipient_id)
    WHERE request_type = 'role_invite'
      AND role_id IS NOT NULL
      AND status = 'pending'::public.request_status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_role_invite_no_role
    ON public.collaboration_requests (idea_id, recipient_id)
    WHERE request_type = 'role_invite'
      AND role_id IS NULL
      AND status = 'pending'::public.request_status;

-- ------------------------------------------------------------------------------
-- 2. PRESERVE EXISTING DEFAULTS & VALIDATE 'role_invite' INSERTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.populate_collab_request_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_creator_id UUID;
BEGIN
    IF NEW.idea_id IS NOT NULL THEN
        SELECT creator_id INTO v_creator_id
        FROM public.ideas
        WHERE id = NEW.idea_id;

        IF v_creator_id IS NULL THEN
            RAISE EXCEPTION 'Target idea not found.' USING ERRCODE = 'P0002';
        END IF;

        IF NEW.request_type = 'role_invite' THEN
            IF NEW.requester_id != v_creator_id THEN
                RAISE EXCEPTION 'Only the idea owner can send role invitations.' USING ERRCODE = '42501';
            END IF;
            IF NEW.recipient_id IS NULL THEN
                RAISE EXCEPTION 'Recipient is required for a role invitation.' USING ERRCODE = '22023';
            END IF;
            IF NEW.recipient_id = NEW.requester_id THEN
                RAISE EXCEPTION 'You cannot invite yourself to your own idea.' USING ERRCODE = '22023';
            END IF;
            NEW.request_type := 'role_invite';
        ELSE
            NEW.recipient_id := v_creator_id;
            NEW.request_type := 'idea_based';
        END IF;
    ELSE
        NEW.request_type := 'general';
        IF NEW.recipient_id IS NULL THEN
            RAISE EXCEPTION 'Recipient is required for a general collaboration request.' USING ERRCODE = '22023';
        END IF;
        IF NEW.recipient_id = NEW.requester_id THEN
            RAISE EXCEPTION 'You cannot send a collaboration request to yourself.' USING ERRCODE = '22023';
        END IF;
        IF NEW.purpose IS NULL OR pg_catalog.btrim(NEW.purpose) = '' THEN
            NEW.purpose := 'General Collaboration';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.populate_collab_request_defaults() FROM PUBLIC;

-- ------------------------------------------------------------------------------
-- 3. EXTEND RLS POLICIES ON collaboration_requests (STRICT INVITE PERMISSIONS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Submit collaboration request" ON public.collaboration_requests;
CREATE POLICY "Submit collaboration request"
    ON public.collaboration_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = requester_id
        AND public.is_active_user()
        AND (
            -- Existing: idea_based application by non-owner
            (
                collaboration_requests.idea_id IS NOT NULL
                AND collaboration_requests.request_type != 'role_invite'
                AND EXISTS (
                    SELECT 1 FROM public.ideas i
                    WHERE i.id = collaboration_requests.idea_id
                      AND i.creator_id != auth.uid()
                      AND i.status NOT IN ('draft'::public.idea_status, 'archived'::public.idea_status)
                      AND i.moderation_status = 'approved'::public.idea_moderation_status
                      AND i.deleted_at IS NULL
                )
                AND (
                    collaboration_requests.role_id IS NULL
                    OR EXISTS (
                        SELECT 1 FROM public.idea_roles_needed rn
                        WHERE rn.id = collaboration_requests.role_id
                          AND rn.idea_id = collaboration_requests.idea_id
                    )
                )
            )
            -- Existing: general (idea-independent) request to discoverable active builder
            OR (
                collaboration_requests.idea_id IS NULL
                AND collaboration_requests.recipient_id IS NOT NULL
                AND collaboration_requests.recipient_id != auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles target_p
                    LEFT JOIN public.profile_security_status target_sec ON target_sec.user_id = target_p.id
                    WHERE target_p.id = collaboration_requests.recipient_id
                      AND target_p.is_discoverable = TRUE
                      AND (
                          target_sec.user_id IS NULL
                          OR target_sec.account_status = 'active'::public.account_status
                          OR (
                              target_sec.account_status = 'suspended'::public.account_status
                              AND target_sec.suspended_until IS NOT NULL
                              AND target_sec.suspended_until <= pg_catalog.now()
                          )
                      )
                )
            )
            -- New: role_invite by idea owner to discoverable active builder
            OR (
                collaboration_requests.idea_id IS NOT NULL
                AND collaboration_requests.request_type = 'role_invite'
                AND collaboration_requests.recipient_id IS NOT NULL
                AND collaboration_requests.recipient_id != auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.ideas i
                    WHERE i.id = collaboration_requests.idea_id
                      AND i.creator_id = auth.uid()
                      AND i.status NOT IN ('draft'::public.idea_status, 'archived'::public.idea_status)
                      AND i.moderation_status = 'approved'::public.idea_moderation_status
                      AND i.deleted_at IS NULL
                )
                AND (
                    collaboration_requests.role_id IS NULL
                    OR EXISTS (
                        SELECT 1 FROM public.idea_roles_needed rn
                        WHERE rn.id = collaboration_requests.role_id
                          AND rn.idea_id = collaboration_requests.idea_id
                    )
                )
                AND EXISTS (
                    SELECT 1 FROM public.profiles target_p
                    LEFT JOIN public.profile_security_status target_sec ON target_sec.user_id = target_p.id
                    WHERE target_p.id = collaboration_requests.recipient_id
                      AND target_p.is_discoverable = TRUE
                      AND (
                          target_sec.user_id IS NULL
                          OR target_sec.account_status = 'active'::public.account_status
                          OR (
                              target_sec.account_status = 'suspended'::public.account_status
                              AND target_sec.suspended_until IS NOT NULL
                              AND target_sec.suspended_until <= pg_catalog.now()
                          )
                      )
                )
            )
        )
    );

-- Enforce RPC-only status transitions: revoke direct table UPDATE from authenticated/anon
-- so no client can bypass respond_to_collaboration_request()'s row locking & capacity checks.
REVOKE UPDATE ON public.collaboration_requests FROM authenticated, anon;
DROP POLICY IF EXISTS "Idea creators or recipients can accept or decline requests" ON public.collaboration_requests;

-- ------------------------------------------------------------------------------
-- 4. CONCURRENCY-SAFE ROLE AVAILABILITY GUARD & ATOMIC ACCEPTANCE RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_role_application_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role RECORD;
BEGIN
    IF NEW.role_id IS NOT NULL THEN
        SELECT id, spots_available, spots_filled
        INTO v_role
        FROM public.idea_roles_needed
        WHERE id = NEW.role_id
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected role does not exist.';
        END IF;

        IF v_role.spots_filled >= v_role.spots_available THEN
            RAISE EXCEPTION 'This role has already been filled and is no longer accepting applications or invitations.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_role_application_availability() FROM PUBLIC;

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
    v_user_id UUID;
    v_req RECORD;
    v_role RECORD;
    v_accepted_count INTEGER;
    v_valid_status public.request_status;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to respond to collaboration requests.';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is suspended or banned.' USING ERRCODE = '42501';
    END IF;

    IF p_decision NOT IN ('accepted', 'declined', 'withdrawn') THEN
        RAISE EXCEPTION 'Invalid decision status: %', p_decision;
    END IF;

    v_valid_status := p_decision::public.request_status;

    -- Lock the request row to serialize concurrent decisions on the same record
    SELECT
        r.id,
        r.idea_id,
        r.role_id,
        r.requester_id,
        r.recipient_id,
        r.request_type,
        r.status,
        CASE
            WHEN r.request_type = 'role_invite' THEN r.recipient_id
            ELSE COALESCE(i.creator_id, r.recipient_id)
        END AS target_recipient_id
    INTO v_req
    FROM public.collaboration_requests r
    LEFT JOIN public.ideas i ON i.id = r.idea_id
    WHERE r.id = p_request_id
    FOR UPDATE OF r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Collaboration request not found.';
    END IF;

    IF v_req.status != 'pending'::public.request_status THEN
        RAISE EXCEPTION 'Invalid transition: Only pending requests can be updated.';
    END IF;

    IF v_valid_status = 'withdrawn'::public.request_status THEN
        IF v_req.requester_id != v_user_id THEN
            RAISE EXCEPTION 'Only the requester can withdraw this request or invitation.';
        END IF;
    ELSE
        IF v_req.target_recipient_id != v_user_id THEN
            RAISE EXCEPTION 'Only the invited recipient or idea creator can accept or decline this request.';
        END IF;
    END IF;

    -- Lock the target role row to serialize simultaneous acceptances for the last spot
    IF v_valid_status = 'accepted'::public.request_status AND v_req.role_id IS NOT NULL THEN
        SELECT id, idea_id, spots_available, spots_filled
        INTO v_role
        FROM public.idea_roles_needed
        WHERE id = v_req.role_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Associated project role no longer exists.';
        END IF;

        IF v_req.idea_id IS NULL OR v_role.idea_id != v_req.idea_id THEN
            RAISE EXCEPTION 'Role does not belong to the target idea.';
        END IF;

        SELECT COUNT(*)::INTEGER
        INTO v_accepted_count
        FROM public.collaboration_requests
        WHERE role_id = v_req.role_id
          AND status = 'accepted'::public.request_status;

        IF GREATEST(v_role.spots_filled, v_accepted_count) >= v_role.spots_available THEN
            RAISE EXCEPTION 'This role has already been filled and has no open spots remaining.';
        END IF;
    END IF;

    UPDATE public.collaboration_requests
    SET status = v_valid_status,
        updated_at = pg_catalog.now()
    WHERE id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'request_id', p_request_id,
        'status', p_decision,
        'role_id', v_req.role_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_collaboration_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_collaboration_request(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. WORKFLOW NOTIFICATIONS, PROJECT MEMBERSHIP & CONVERSATIONS (IDEMPOTENT)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_collaboration_request_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_idea_title TEXT;
    v_idea_creator UUID;
    v_target_recipient UUID;
    v_requester_name TEXT;
    v_recipient_name TEXT;
    v_role_title TEXT;
    v_filled_content TEXT;
    v_accepted_count INTEGER;
    v_notify_recipient UUID;
    v_notify_actor UUID;
    v_notify_title TEXT;
    v_notify_content TEXT;
BEGIN
    SELECT full_name INTO v_requester_name FROM public.profiles WHERE id = NEW.requester_id;

    IF NEW.idea_id IS NOT NULL THEN
        SELECT title, creator_id INTO v_idea_title, v_idea_creator FROM public.ideas WHERE id = NEW.idea_id;
        v_target_recipient := CASE
            WHEN NEW.request_type = 'role_invite' THEN NEW.recipient_id
            ELSE COALESCE(v_idea_creator, NEW.recipient_id)
        END;
        IF NEW.role_id IS NOT NULL THEN
            SELECT role_title INTO v_role_title FROM public.idea_roles_needed WHERE id = NEW.role_id;
        END IF;
    ELSE
        v_target_recipient := NEW.recipient_id;
    END IF;

    SELECT full_name INTO v_recipient_name FROM public.profiles WHERE id = v_target_recipient;

    IF (TG_OP = 'INSERT') THEN
        IF v_target_recipient IS NOT NULL THEN
            v_notify_title := CASE
                WHEN NEW.request_type = 'role_invite' THEN 'New Role Invitation'
                WHEN NEW.idea_id IS NOT NULL THEN 'New Collaboration Request'
                ELSE 'New Direct Collaboration Request'
            END;
            v_notify_content := CASE
                WHEN NEW.request_type = 'role_invite' THEN
                    COALESCE(v_requester_name, 'A project owner') || ' invited you to join "' ||
                    COALESCE(v_idea_title, 'an idea') || '"' ||
                    COALESCE(' as ' || v_role_title, '') || '.'
                WHEN NEW.idea_id IS NOT NULL THEN
                    COALESCE(v_requester_name, 'A builder') || ' requested to collaborate on "' ||
                    COALESCE(v_idea_title, 'your idea') || '"' ||
                    COALESCE(' as ' || v_role_title, '') || '.'
                ELSE
                    COALESCE(v_requester_name, 'A builder') || ' wants to collaborate with you (' ||
                    COALESCE(NEW.purpose, 'General Collaboration') || ').'
            END;

            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            )
            SELECT
                v_target_recipient,
                NEW.requester_id,
                NEW.idea_id,
                'collaboration_request',
                v_notify_title,
                v_notify_content
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.recipient_id = v_target_recipient
                  AND n.actor_id = NEW.requester_id
                  AND n.idea_id IS NOT DISTINCT FROM NEW.idea_id
                  AND n.type = 'collaboration_request'::public.notification_type
                  AND n.content = v_notify_content
                  AND n.is_read = FALSE
            );
        END IF;
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.status = 'accepted'::public.request_status AND OLD.status IS DISTINCT FROM 'accepted'::public.request_status) THEN
            IF NEW.idea_id IS NOT NULL THEN
                IF NEW.role_id IS NOT NULL THEN
                    SELECT COUNT(*)::INTEGER
                    INTO v_accepted_count
                    FROM public.collaboration_requests
                    WHERE role_id = NEW.role_id
                      AND status = 'accepted'::public.request_status;

                    UPDATE public.idea_roles_needed
                    SET spots_filled = LEAST(spots_available, GREATEST(spots_filled, v_accepted_count))
                    WHERE id = NEW.role_id;
                END IF;

                UPDATE public.ideas
                SET collaborators_count = collaborators_count + 1
                WHERE id = NEW.idea_id;
            END IF;

            -- For both applications and invites, notify the original requester (applicant or inviting owner)
            v_notify_recipient := NEW.requester_id;
            v_notify_actor := v_target_recipient;
            v_notify_title := CASE
                WHEN NEW.request_type = 'role_invite' THEN 'Role Invitation Accepted!'
                ELSE 'Collaboration Request Accepted!'
            END;
            v_notify_content := CASE
                WHEN NEW.request_type = 'role_invite' THEN
                    COALESCE(v_recipient_name, 'A builder') || ' accepted your invitation to join "' ||
                    COALESCE(v_idea_title, 'your idea') || '"' ||
                    COALESCE(' as ' || v_role_title, '') || '!'
                WHEN NEW.idea_id IS NOT NULL THEN
                    'Your application for ' || COALESCE(v_role_title, 'collaboration') ||
                    ' on "' || COALESCE(v_idea_title, 'an idea') || '" has been accepted!'
                ELSE
                    COALESCE(v_recipient_name, 'A builder') || ' accepted your collaboration request! Open Messages to start chatting.'
            END;

            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            )
            SELECT
                v_notify_recipient,
                v_notify_actor,
                NEW.idea_id,
                'request_accepted',
                v_notify_title,
                v_notify_content
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.recipient_id = v_notify_recipient
                  AND n.actor_id = v_notify_actor
                  AND n.idea_id IS NOT DISTINCT FROM NEW.idea_id
                  AND n.type = 'request_accepted'::public.notification_type
                  AND n.content = v_notify_content
            );

            -- Ensure 1:1 conversation exists idempotently upon acceptance
            INSERT INTO public.conversations (
                collaboration_request_id,
                idea_id,
                creator_id,
                requester_id,
                last_message_at
            )
            VALUES (
                NEW.id,
                NEW.idea_id,
                v_target_recipient,
                NEW.requester_id,
                pg_catalog.now()
            )
            ON CONFLICT (collaboration_request_id) DO NOTHING;

        ELSIF (NEW.status = 'declined'::public.request_status AND OLD.status IS DISTINCT FROM 'declined'::public.request_status) THEN
            v_notify_recipient := NEW.requester_id;
            v_notify_actor := v_target_recipient;
            v_notify_title := CASE
                WHEN NEW.request_type = 'role_invite' THEN 'Role Invitation Update'
                ELSE 'Collaboration Request Update'
            END;
            v_notify_content := CASE
                WHEN NEW.request_type = 'role_invite' THEN
                    COALESCE(v_recipient_name, 'A builder') || ' declined your invitation to join "' ||
                    COALESCE(v_idea_title, 'your idea') || '"' ||
                    COALESCE(' as ' || v_role_title, '') || ' at this time.'
                WHEN NEW.idea_id IS NOT NULL THEN
                    'Your request to join "' || COALESCE(v_idea_title, 'an idea') || '"' ||
                    COALESCE(' as ' || v_role_title, '') || ' was not selected at this time.'
                ELSE
                    COALESCE(v_recipient_name, 'A builder') || ' declined your collaboration request at this time.'
            END;

            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            )
            SELECT
                v_notify_recipient,
                v_notify_actor,
                NEW.idea_id,
                'request_declined',
                v_notify_title,
                v_notify_content
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.recipient_id = v_notify_recipient
                  AND n.actor_id = v_notify_actor
                  AND n.idea_id IS NOT DISTINCT FROM NEW.idea_id
                  AND n.type = 'request_declined'::public.notification_type
                  AND n.content = v_notify_content
            );

        ELSIF (NEW.status = 'role_filled'::public.request_status AND OLD.status IS DISTINCT FROM 'role_filled'::public.request_status) THEN
            v_notify_recipient := CASE
                WHEN NEW.request_type = 'role_invite' THEN NEW.recipient_id
                ELSE NEW.requester_id
            END;
            v_filled_content :=
                'The ' || COALESCE(v_role_title, 'open') || ' position on ' ||
                COALESCE(v_idea_title, 'this project') ||
                ' has been filled. Thank you for your interest in the project. This role is no longer accepting applications.';

            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            )
            SELECT
                v_notify_recipient,
                COALESCE(v_idea_creator, v_target_recipient),
                NEW.idea_id,
                'role_filled'::public.notification_type,
                'This role has been filled',
                v_filled_content
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.recipient_id = v_notify_recipient
                  AND n.idea_id IS NOT DISTINCT FROM NEW.idea_id
                  AND n.type = 'role_filled'::public.notification_type
                  AND n.content = v_filled_content
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_collaboration_request_workflow() FROM PUBLIC;

-- Update project membership sync so role_invite adds the invited recipient (not the owner)
CREATE OR REPLACE FUNCTION public.sync_project_on_collaboration_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_project_id UUID;
    v_idea_title TEXT;
    v_idea_summary TEXT;
    v_idea_creator UUID;
    v_role_title TEXT;
    v_collaborator_id UUID;
BEGIN
    IF NEW.idea_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_collaborator_id := CASE
        WHEN NEW.request_type = 'role_invite' THEN NEW.recipient_id
        ELSE NEW.requester_id
    END;

    IF v_collaborator_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Handle accepted collaboration request or role invitation
    IF (NEW.status = 'accepted'::public.request_status AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted'::public.request_status)) THEN
        SELECT title, summary, creator_id
        INTO v_idea_title, v_idea_summary, v_idea_creator
        FROM public.ideas
        WHERE id = NEW.idea_id;

        IF v_idea_creator IS NOT NULL THEN
            INSERT INTO public.projects (idea_id, owner_id, title, description, status)
            VALUES (
                NEW.idea_id,
                v_idea_creator,
                COALESCE(v_idea_title, 'Untitled Project'),
                COALESCE(v_idea_summary, ''),
                'active'::public.project_status
            )
            ON CONFLICT (idea_id) DO UPDATE
            SET last_activity_at = pg_catalog.timezone('utc', pg_catalog.now())
            RETURNING id INTO v_project_id;

            INSERT INTO public.project_members (project_id, user_id, role_title, member_role)
            VALUES (v_project_id, v_idea_creator, 'Project Owner', 'owner'::public.project_member_role)
            ON CONFLICT (project_id, user_id) DO NOTHING;

            IF NEW.role_id IS NOT NULL THEN
                SELECT role_title INTO v_role_title
                FROM public.idea_roles_needed
                WHERE id = NEW.role_id;
            END IF;

            INSERT INTO public.project_members (
                project_id,
                user_id,
                collaboration_request_id,
                role_title,
                member_role
            )
            VALUES (
                v_project_id,
                v_collaborator_id,
                NEW.id,
                COALESCE(v_role_title, 'Collaborator'),
                'collaborator'::public.project_member_role
            )
            ON CONFLICT (project_id, user_id) DO NOTHING;
        END IF;

    -- If an accepted request/invite is later withdrawn or declined, remove collaborator membership
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'accepted'::public.request_status AND NEW.status != 'accepted'::public.request_status) THEN
        SELECT id INTO v_project_id
        FROM public.projects
        WHERE idea_id = NEW.idea_id;

        IF v_project_id IS NOT NULL THEN
            DELETE FROM public.project_members
            WHERE project_id = v_project_id
              AND user_id = v_collaborator_id
              AND member_role != 'owner'::public.project_member_role;

            UPDATE public.projects
            SET last_activity_at = pg_catalog.timezone('utc', pg_catalog.now())
            WHERE id = v_project_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_project_on_collaboration_acceptance() FROM PUBLIC;

-- Update get_or_create_conversation to handle role_invite participants idempotently
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    p_request_id UUID
)
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

    SELECT
        cr.id,
        cr.idea_id,
        cr.requester_id,
        cr.status,
        CASE
            WHEN cr.request_type = 'role_invite' THEN cr.recipient_id
            ELSE COALESCE(i.creator_id, cr.recipient_id)
        END AS target_recipient_id
    INTO v_req
    FROM public.collaboration_requests cr
    LEFT JOIN public.ideas i ON i.id = cr.idea_id
    WHERE cr.id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Collaboration request not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_user_id != v_req.requester_id AND v_user_id != v_req.target_recipient_id THEN
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
        v_req.target_recipient_id,
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

