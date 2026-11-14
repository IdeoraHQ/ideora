-- ==============================================================================
-- IDEORA: Authoritative Role Capacity Sync & Atomic Acceptance Enforcement
-- Migration: 20261114000023_sync_role_capacity_and_filled_status.sql
-- Description:
--   1. Backfills idea_roles_needed.spots_filled from the authoritative count of
--      accepted collaboration_requests for each role.
--   2. Updates handle_collaboration_request_workflow() to recalculate spots_filled
--      from actual accepted collaboration_requests count (supports capacity >= 1).
--   3. Hardens respond_to_collaboration_request() to lock the role row, count
--      existing accepted builders, and reject acceptance once capacity is reached.
-- ==============================================================================

-- 1. Backfill spots_filled from authoritative accepted collaboration_requests
UPDATE public.idea_roles_needed r
SET spots_filled = LEAST(
    r.spots_available,
    (
        SELECT COUNT(*)::INTEGER
        FROM public.collaboration_requests cr
        WHERE cr.role_id = r.id
          AND cr.status = 'accepted'::public.request_status
    )
);

-- 2. Update workflow trigger to recalculate spots_filled authoritatively
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

-- 3. Harden respond_to_collaboration_request with authoritative accepted count check
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

    IF v_valid_status = 'accepted'::public.request_status AND v_req.role_id IS NOT NULL THEN
        SELECT id, spots_available, spots_filled
        INTO v_role
        FROM public.idea_roles_needed
        WHERE id = v_req.role_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Associated project role no longer exists.';
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

