-- ==============================================================================
-- IDEORA: Collaboration Request Workflow Fix, Counter Protection & Notification RLS
-- Migration: 20261110000004_fix_collaboration_workflow_and_notifications.sql
-- Description:
--   1. Fixes protect_idea_counters trigger to allow trusted internal workflow
--      triggers to update collaborators_count and upvotes_count.
--   2. Adds missing INSERT RLS policy on public.notifications to prevent trigger
--      aborts when notifications are dispatched to applicants.
--   3. Provides atomic RPC respond_to_collaboration_request for foolproof founder
--      accept/decline actions.
--   4. Hardens handle_collaboration_request_workflow trigger against unhandled
--      exceptions so application status transitions never stall or revert.
-- ==============================================================================

-- 1. NOTIFICATIONS TABLE INSERT POLICY
-- Ensure notifications can be inserted by authenticated triggers and workflows
DROP POLICY IF EXISTS "Allow system and authenticated triggers to insert notifications" ON public.notifications;
CREATE POLICY "Allow system and authenticated triggers to insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- 2. FIX COUNTER PROTECTION TRIGGER
-- Distinguish between untrusted client REST updates and trusted internal trigger/RPC updates
CREATE OR REPLACE FUNCTION public.protect_idea_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Allow trusted internal triggers or RPC functions when ideora.internal_counter_update is active
    IF current_setting('ideora.internal_counter_update', TRUE) = 'true' THEN
        RETURN NEW;
    END IF;

    -- Block direct client updates from REST / PostgREST
    IF auth.role() = 'authenticated' THEN
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

-- 3. HARDEN WORKFLOW TRIGGER FUNCTION WITH INTERNAL FLAG & EXCEPTION GUARDS
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

    -- A. On new collaboration request: notify founder
    IF (TG_OP = 'INSERT') THEN
        BEGIN
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
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Notification dispatch on request insert failed: %', SQLERRM;
        END;
        RETURN NEW;
    END IF;

    -- B. On status update
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        IF (NEW.status = 'accepted' AND OLD.status != 'accepted') THEN
            -- Increment spots_filled on the role if applicable
            IF NEW.role_id IS NOT NULL THEN
                BEGIN
                    UPDATE public.idea_roles_needed
                    SET spots_filled = LEAST(spots_available, spots_filled + 1)
                    WHERE id = NEW.role_id;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Role spots increment failed: %', SQLERRM;
                END;
            END IF;

            -- Increment collaborators_count on the idea with internal flag
            BEGIN
                PERFORM set_config('ideora.internal_counter_update', 'true', TRUE);
                UPDATE public.ideas
                SET collaborators_count = collaborators_count + 1
                WHERE id = NEW.idea_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Collaborators count increment failed: %', SQLERRM;
            END;

            -- Notify requester of acceptance
            BEGIN
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
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Notification dispatch on acceptance failed: %', SQLERRM;
            END;

        ELSIF (NEW.status = 'declined' AND OLD.status != 'declined') THEN
            -- Notify requester of decline
            BEGIN
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
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Notification dispatch on decline failed: %', SQLERRM;
            END;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_collaboration_request_workflow ON public.collaboration_requests;
CREATE TRIGGER on_collaboration_request_workflow
    AFTER INSERT OR UPDATE ON public.collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_collaboration_request_workflow();

-- 4. ATOMIC RPC FUNCTION TO RESPOND TO COLLABORATION REQUESTS
CREATE OR REPLACE FUNCTION public.respond_to_collaboration_request(
    p_request_id UUID,
    p_decision TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

    IF p_decision NOT IN ('accepted', 'declined', 'withdrawn') THEN
        RAISE EXCEPTION 'Invalid decision status: %', p_decision;
    END IF;

    v_valid_status := p_decision::public.request_status;

    -- Fetch the request with its parent idea creator
    SELECT r.id, r.idea_id, r.role_id, r.requester_id, r.status, i.creator_id
    INTO v_req
    FROM public.collaboration_requests r
    JOIN public.ideas i ON i.id = r.idea_id
    WHERE r.id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Collaboration request not found.';
    END IF;

    -- Authorization check
    IF v_valid_status = 'withdrawn'::public.request_status THEN
        IF v_req.requester_id != v_user_id THEN
            RAISE EXCEPTION 'Only the requester can withdraw this application.';
        END IF;
    ELSE
        IF v_req.creator_id != v_user_id THEN
            RAISE EXCEPTION 'Only the idea creator can accept or decline this application.';
        END IF;
    END IF;

    -- Set internal flag so trigger can update ideas.collaborators_count
    PERFORM set_config('ideora.internal_counter_update', 'true', TRUE);

    -- Perform the update (triggers will fire handle_collaboration_request_workflow)
    UPDATE public.collaboration_requests
    SET status = v_valid_status,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', p_request_id,
        'status', p_decision
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_collaboration_request(UUID, TEXT) TO authenticated;
