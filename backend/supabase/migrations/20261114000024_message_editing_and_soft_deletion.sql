-- ==============================================================================
-- IDEORA: Message Editing & Soft Deletion with Database-Level Ownership Security
-- Migration: 20261114000024_message_editing_and_soft_deletion.sql
-- Description:
--   1. Adds edited_at and deleted_at columns to public.messages.
--   2. Relaxes chk_messages_body_length ONLY when deleted_at IS NOT NULL so
--      soft-deleted messages can have their body scrubbed to '' (never exposed).
--   3. Updates protect_message_immutable_fields() so only trusted RPCs
--      (via ideora.internal_message_mutation = 'true') or service_role may
--      modify body, edited_at, or deleted_at.
--   4. Adds SECURITY DEFINER RPCs:
--      - edit_message(p_message_id UUID, p_body TEXT)
--      - soft_delete_message(p_message_id UUID)
--      enforcing auth.uid() = sender_id, active user status, and conversation
--      participation.
-- ==============================================================================

-- 1. ADD COLUMNS FOR EDIT & SOFT-DELETE TRACKING
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_deleted_at
    ON public.messages(conversation_id, deleted_at)
    WHERE deleted_at IS NULL;

-- 2. UPDATE BODY LENGTH CONSTRAINT TO ALLOW SCRUBBED BODY ON SOFT-DELETED ROWS
ALTER TABLE public.messages
    DROP CONSTRAINT IF EXISTS chk_messages_body_length;

ALTER TABLE public.messages
    ADD CONSTRAINT chk_messages_body_length CHECK (
        (deleted_at IS NOT NULL AND body = '')
        OR (deleted_at IS NULL AND char_length(trim(body)) > 0 AND char_length(body) <= 5000)
    );

-- 3. HARDEN MESSAGE IMMUTABILITY TRIGGER
-- Direct client UPDATEs may still only update read_at / updated_at (via column GRANTs),
-- while body, edited_at, deleted_at, and identity columns remain immutable unless
-- modified inside our SECURITY DEFINER edit_message / soft_delete_message RPCs.
CREATE OR REPLACE FUNCTION public.protect_message_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role'
       OR current_setting('ideora.internal_message_mutation', TRUE) = 'true' THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.edited_at IS DISTINCT FROM OLD.edited_at
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
        RAISE EXCEPTION 'Unauthorized: Message content and identity fields are immutable.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_message_immutable_fields() FROM PUBLIC;

-- 4. RPC: edit_message
-- Allows ONLY the original sender (and active conversation participant) to edit
-- a non-deleted message within an active conversation. Preserves created_at.
CREATE OR REPLACE FUNCTION public.edit_message(p_message_id UUID, p_body TEXT)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_trimmed TEXT;
    v_msg RECORD;
    v_updated public.messages;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is not active' USING ERRCODE = '42501';
    END IF;

    v_trimmed := trim(COALESCE(p_body, ''));
    IF char_length(v_trimmed) = 0 THEN
        RAISE EXCEPTION 'Message cannot be empty' USING ERRCODE = '22023';
    END IF;

    IF char_length(v_trimmed) > 5000 THEN
        RAISE EXCEPTION 'Message exceeds the 5,000 character limit' USING ERRCODE = '22023';
    END IF;

    SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        m.deleted_at,
        c.creator_id,
        c.requester_id,
        cr.status AS request_status
    INTO v_msg
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    JOIN public.collaboration_requests cr ON cr.id = c.collaboration_request_id
    WHERE m.id = p_message_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_user_id != v_msg.creator_id AND v_user_id != v_msg.requester_id THEN
        RAISE EXCEPTION 'Unauthorized: you are not a participant in this conversation'
            USING ERRCODE = '42501';
    END IF;

    IF v_msg.sender_id != v_user_id THEN
        RAISE EXCEPTION 'Unauthorized: you can only edit messages you sent'
            USING ERRCODE = '42501';
    END IF;

    IF v_msg.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit a deleted message' USING ERRCODE = 'P0001';
    END IF;

    IF v_msg.request_status NOT IN ('pending', 'accepted') THEN
        RAISE EXCEPTION 'Cannot edit messages in a % collaboration request', v_msg.request_status
            USING ERRCODE = 'P0001';
    END IF;

    PERFORM set_config('ideora.internal_message_mutation', 'true', true);

    UPDATE public.messages
    SET body = v_trimmed,
        edited_at = TIMEZONE('utc', NOW()),
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_message_id
    RETURNING * INTO v_updated;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_message(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_message(UUID, TEXT) TO authenticated;

-- 5. RPC: soft_delete_message
-- Allows ONLY the original sender (and active conversation participant) to
-- soft-delete their message. Scrubs body to '' so deleted content is never
-- exposed in queries or realtime payloads, while preserving row order.
CREATE OR REPLACE FUNCTION public.soft_delete_message(p_message_id UUID)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_msg RECORD;
    v_updated public.messages;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Account is not active' USING ERRCODE = '42501';
    END IF;

    SELECT
        m.*,
        c.creator_id,
        c.requester_id
    INTO v_msg
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = p_message_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_user_id != v_msg.creator_id AND v_user_id != v_msg.requester_id THEN
        RAISE EXCEPTION 'Unauthorized: you are not a participant in this conversation'
            USING ERRCODE = '42501';
    END IF;

    IF v_msg.sender_id != v_user_id THEN
        RAISE EXCEPTION 'Unauthorized: you can only delete messages you sent'
            USING ERRCODE = '42501';
    END IF;

    -- Idempotent: if already soft-deleted, return scrubbed row without error
    IF v_msg.deleted_at IS NOT NULL THEN
        SELECT * INTO v_updated FROM public.messages WHERE id = p_message_id;
        RETURN v_updated;
    END IF;

    PERFORM set_config('ideora.internal_message_mutation', 'true', true);

    UPDATE public.messages
    SET body = '',
        deleted_at = TIMEZONE('utc', NOW()),
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_message_id
    RETURNING * INTO v_updated;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_message(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_message(UUID) TO authenticated;

