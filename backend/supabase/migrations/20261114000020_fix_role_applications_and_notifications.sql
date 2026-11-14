-- ==============================================================================
-- IDEORA: Atomic Role-Specific Collaboration Applications & Role-Filled Notifications
-- Migration: 20261114000020_fix_role_applications_and_notifications.sql
-- Description:
--   1. Includes 'role_filled' in notification preference filtering.
--   2. Prevents new applications for roles that are already filled.
--   3. Updates handle_collaboration_request_workflow() to dispatch role-filled
--      notifications without duplicates when applications transition to 'role_filled'.
--   4. Adds AFTER UPDATE trigger on idea_roles_needed so whenever a role becomes
--      filled (via application acceptance or direct role management), all other
--      pending applications for THAT specific role transition to 'role_filled'
--      and notify their applicants.
--   5. Hardens respond_to_collaboration_request() with row-level FOR UPDATE locking
--      on collaboration_requests and idea_roles_needed to prevent concurrent
--      double-acceptance of single-slot roles.
-- ==============================================================================

-- 1. Include 'role_filled' in notification preference filtering
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
        'request_declined'::public.notification_type,
        'role_filled'::public.notification_type
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

-- 2. Prevent applying for an already-filled role
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
        WHERE id = NEW.role_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected role does not exist.';
        END IF;

        IF v_role.spots_filled >= v_role.spots_available THEN
            RAISE EXCEPTION 'This role has already been filled and is no longer accepting applications.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_role_application_availability() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_guard_role_application_availability ON public.collaboration_requests;
CREATE TRIGGER trg_guard_role_application_availability
    BEFORE INSERT ON public.collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION public.guard_role_application_availability();

-- 3. Update collaboration workflow trigger to handle 'role_filled' notifications
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
BEGIN
    SELECT full_name INTO v_requester_name FROM public.profiles WHERE id = NEW.requester_id;

    IF NEW.idea_id IS NOT NULL THEN
        SELECT title, creator_id INTO v_idea_title, v_idea_creator FROM public.ideas WHERE id = NEW.idea_id;
        v_target_recipient := COALESCE(v_idea_creator, NEW.recipient_id);
        IF NEW.role_id IS NOT NULL THEN
            SELECT role_title INTO v_role_title FROM public.idea_roles_needed WHERE id = NEW.role_id;
        END IF;
    ELSE
        v_target_recipient := NEW.recipient_id;
    END IF;

    SELECT full_name INTO v_recipient_name FROM public.profiles WHERE id = v_target_recipient;

    IF (TG_OP = 'INSERT') THEN
        IF v_target_recipient IS NOT NULL THEN
            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            ) VALUES (
                v_target_recipient,
                NEW.requester_id,
                NEW.idea_id,
                'collaboration_request',
                CASE
                    WHEN NEW.idea_id IS NOT NULL THEN 'New Collaboration Request'
                    ELSE 'New Direct Collaboration Request'
                END,
                CASE
                    WHEN NEW.idea_id IS NOT NULL THEN
                        COALESCE(v_requester_name, 'A builder') || ' requested to collaborate on "' ||
                        COALESCE(v_idea_title, 'your idea') || '"' ||
                        COALESCE(' as ' || v_role_title, '') || '.'
                    ELSE
                        COALESCE(v_requester_name, 'A builder') || ' wants to collaborate with you (' ||
                        COALESCE(NEW.purpose, 'General Collaboration') || ').'
                END
            );
        END IF;
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.status = 'accepted'::public.request_status AND OLD.status IS DISTINCT FROM 'accepted'::public.request_status) THEN
            IF NEW.idea_id IS NOT NULL THEN
                IF NEW.role_id IS NOT NULL THEN
                    UPDATE public.idea_roles_needed
                    SET spots_filled = LEAST(spots_available, spots_filled + 1)
                    WHERE id = NEW.role_id;
                END IF;

                UPDATE public.ideas
                SET collaborators_count = collaborators_count + 1
                WHERE id = NEW.idea_id;
            END IF;

            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            ) VALUES (
                NEW.requester_id,
                v_target_recipient,
                NEW.idea_id,
                'request_accepted',
                'Collaboration Request Accepted!',
                CASE
                    WHEN NEW.idea_id IS NOT NULL THEN
                        'Your application for ' || COALESCE(v_role_title, 'collaboration') ||
                        ' on "' || COALESCE(v_idea_title, 'an idea') || '" has been accepted!'
                    ELSE
                        COALESCE(v_recipient_name, 'A builder') || ' accepted your collaboration request! Open Messages to start chatting.'
                END
            );

        ELSIF (NEW.status = 'declined'::public.request_status AND OLD.status IS DISTINCT FROM 'declined'::public.request_status) THEN
            INSERT INTO public.notifications (
                recipient_id,
                actor_id,
                idea_id,
                type,
                title,
                content
            ) VALUES (
                NEW.requester_id,
                v_target_recipient,
                NEW.idea_id,
                'request_declined',
                'Collaboration Request Update',
                CASE
                    WHEN NEW.idea_id IS NOT NULL THEN
                        'Your request to join "' || COALESCE(v_idea_title, 'an idea') || '"' ||
                        COALESCE(' as ' || v_role_title, '') || ' was not selected at this time.'
                    ELSE
                        COALESCE(v_recipient_name, 'A builder') || ' declined your collaboration request at this time.'
                END
            );

        ELSIF (NEW.status = 'role_filled'::public.request_status AND OLD.status IS DISTINCT FROM 'role_filled'::public.request_status) THEN
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
                NEW.requester_id,
                v_target_recipient,
                NEW.idea_id,
                'role_filled'::public.notification_type,
                'This role has been filled',
                v_filled_content
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.recipient_id = NEW.requester_id
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

-- 4. Automatically close remaining pending applications for a role when it becomes filled
CREATE OR REPLACE FUNCTION public.handle_role_filled_close_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only fire when the role transitions from having open spots to being filled.
    -- Reopening a role later (spots_filled < spots_available) never restores closed applications.
    IF NEW.spots_filled >= NEW.spots_available AND OLD.spots_filled < OLD.spots_available THEN
        UPDATE public.collaboration_requests
        SET status = 'role_filled'::public.request_status,
            updated_at = pg_catalog.now()
        WHERE role_id = NEW.id
          AND status = 'pending'::public.request_status;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_role_filled_close_pending() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_handle_role_filled_close_pending ON public.idea_roles_needed;
CREATE TRIGGER trg_handle_role_filled_close_pending
    AFTER UPDATE OF spots_filled, spots_available ON public.idea_roles_needed
    FOR EACH ROW EXECUTE FUNCTION public.handle_role_filled_close_pending();

-- 5. Harden respond_to_collaboration_request with row-level locking for concurrency safety
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

    -- Lock the collaboration request row to serialize concurrent decisions
    SELECT
        r.id,
        r.idea_id,
        r.role_id,
        r.requester_id,
        r.status,
        COALESCE(i.creator_id, r.recipient_id) AS target_recipient_id
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
            RAISE EXCEPTION 'Only the requester can withdraw this application.';
        END IF;
    ELSE
        IF v_req.target_recipient_id != v_user_id THEN
            RAISE EXCEPTION 'Only the recipient or idea creator can accept or decline this request.';
        END IF;
    END IF;

    -- If accepting a role-specific application, lock the role row and verify spot availability
    IF v_valid_status = 'accepted'::public.request_status AND v_req.role_id IS NOT NULL THEN
        SELECT id, spots_available, spots_filled
        INTO v_role
        FROM public.idea_roles_needed
        WHERE id = v_req.role_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Associated project role no longer exists.';
        END IF;

        IF v_role.spots_filled >= v_role.spots_available THEN
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

