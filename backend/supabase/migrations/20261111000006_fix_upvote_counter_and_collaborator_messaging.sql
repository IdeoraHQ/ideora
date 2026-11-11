-- ==============================================================================
-- IDEORA: Fix Upvote Counter Trigger, Secure Upvoting & Collaborator Messaging
-- Migration: 20261111000006_fix_upvote_counter_and_collaborator_messaging.sql
-- Description:
--   1. Fixes handle_upvote_counter to set ideora.internal_counter_update flag so
--      protect_idea_counters trigger does not abort upvote insertions or deletions.
--   2. Updates protect_idea_counters to also exempt pg_trigger_depth() > 1.
--   3. Hardens toggle_idea_upvote_secure with bypass flag and accurate return counts.
-- ==============================================================================

-- 1. UPDATE PROTECT_IDEA_COUNTERS TRIGGER FUNCTION
-- Exempt internal counter updates and nested trigger invocations
CREATE OR REPLACE FUNCTION public.protect_idea_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Allow trusted internal triggers or RPC functions
    IF current_setting('ideora.internal_counter_update', TRUE) = 'true' OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Block direct client updates from PostgREST / REST
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

-- 2. UPDATE HANDLE_UPVOTE_COUNTER TRIGGER FUNCTION
-- Sets transaction-scoped flag so protect_idea_counters permits the update
CREATE OR REPLACE FUNCTION public.handle_upvote_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Set session flag so protect_idea_counters allows internal counter adjustments
    PERFORM set_config('ideora.internal_counter_update', 'true', true);

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

-- 3. HARDEN TOGGLE_IDEA_UPVOTE_SECURE RPC FUNCTION
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

    -- Set bypass flag for any cascading operations
    PERFORM set_config('ideora.internal_counter_update', 'true', true);

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

REVOKE ALL ON FUNCTION public.toggle_idea_upvote_secure(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_idea_upvote_secure(UUID) TO authenticated;

