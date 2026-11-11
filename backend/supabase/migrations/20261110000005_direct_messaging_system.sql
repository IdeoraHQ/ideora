-- ==============================================================================
-- IDEORA DIRECT MESSAGING SYSTEM MIGRATION
-- Migration: 20261110000005_direct_messaging_system.sql
-- Description: Creates conversations, messages, RLS policies, secure RPCs,
--              triggers, and notification integration for request-linked messaging.
-- ==============================================================================

-- 1. EXTEND NOTIFICATION TYPES TO INCLUDE 'new_message'
DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_message';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CREATE CONVERSATIONS TABLE
-- Strictly 1:1 conversation associated with a specific collaboration request.
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaboration_request_id UUID NOT NULL UNIQUE REFERENCES public.collaboration_requests(id) ON DELETE CASCADE,
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_conversations_different_participants CHECK (creator_id != requester_id)
);

-- 3. CREATE MESSAGES TABLE
-- Chronological messages belonging to an authorized conversation.
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    read_at TIMESTAMPTZ,
    CONSTRAINT chk_messages_body_length CHECK (
        char_length(trim(body)) > 0 AND char_length(body) <= 5000
    )
);

-- 4. PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_conversations_creator_id ON public.conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_requester_id ON public.conversations(requester_id);
CREATE INDEX IF NOT EXISTS idx_conversations_request_id ON public.conversations(collaboration_request_id);
CREATE INDEX IF NOT EXISTS idx_conversations_idea_id ON public.conversations(idea_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, read_at) WHERE read_at IS NULL;

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. ROW LEVEL SECURITY POLICIES: CONVERSATIONS
-- Participants (creator or requester) can read their conversations
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (auth.uid() = creator_id OR auth.uid() = requester_id);

-- Conversations can be inserted by participants when the request is active
DROP POLICY IF EXISTS "Participants can create conversations" ON public.conversations;
CREATE POLICY "Participants can create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.uid() = creator_id OR auth.uid() = requester_id)
        AND EXISTS (
            SELECT 1 FROM public.collaboration_requests cr
            WHERE cr.id = collaboration_request_id
              AND cr.status IN ('pending', 'accepted')
        )
    );

-- Participants can update their conversation (e.g., last_message_at)
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
    ON public.conversations FOR UPDATE
    TO authenticated
    USING (auth.uid() = creator_id OR auth.uid() = requester_id)
    WITH CHECK (auth.uid() = creator_id OR auth.uid() = requester_id);

-- 7. ROW LEVEL SECURITY POLICIES: MESSAGES
-- Participants of the conversation can view messages
DROP POLICY IF EXISTS "Participants can read conversation messages" ON public.messages;
CREATE POLICY "Participants can read conversation messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.creator_id = auth.uid() OR c.requester_id = auth.uid())
        )
    );

-- Participants can send messages ONLY IF the collaboration request is pending or accepted
DROP POLICY IF EXISTS "Participants can send messages to active conversations" ON public.messages;
CREATE POLICY "Participants can send messages to active conversations"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.collaboration_requests cr ON cr.id = c.collaboration_request_id
            WHERE c.id = messages.conversation_id
              AND (c.creator_id = auth.uid() OR c.requester_id = auth.uid())
              AND cr.status IN ('pending', 'accepted')
        )
    );

-- Recipients can mark messages as read
DROP POLICY IF EXISTS "Recipients can update message read status" ON public.messages;
CREATE POLICY "Recipients can update message read status"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        sender_id != auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.creator_id = auth.uid() OR c.requester_id = auth.uid())
        )
    )
    WITH CHECK (
        sender_id != auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.creator_id = auth.uid() OR c.requester_id = auth.uid())
        )
    );

-- 8. TRANSACTION-SAFE RPC: get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_request_id UUID)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_req RECORD;
    v_conv public.conversations;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Verify request existence and fetch related IDs
    SELECT cr.id, cr.idea_id, cr.requester_id, cr.status, i.creator_id
    INTO v_req
    FROM public.collaboration_requests cr
    JOIN public.ideas i ON i.id = cr.idea_id
    WHERE cr.id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Collaboration request not found' USING ERRCODE = 'P0002';
    END IF;

    -- Verify caller is one of the two participants
    IF v_user_id != v_req.requester_id AND v_user_id != v_req.creator_id THEN
        RAISE EXCEPTION 'Unauthorized: you are not a participant in this collaboration request' USING ERRCODE = '42501';
    END IF;

    -- Verify request is active (pending or accepted)
    IF v_req.status NOT IN ('pending', 'accepted') THEN
        RAISE EXCEPTION 'Cannot open conversation for % requests', v_req.status USING ERRCODE = 'P0001';
    END IF;

    -- Check if conversation already exists
    SELECT * INTO v_conv
    FROM public.conversations
    WHERE collaboration_request_id = p_request_id;

    IF FOUND THEN
        RETURN v_conv;
    END IF;

    -- Concurrently safe insert
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
        TIMEZONE('utc', NOW())
    )
    ON CONFLICT (collaboration_request_id) DO UPDATE
    SET updated_at = TIMEZONE('utc', NOW())
    RETURNING * INTO v_conv;

    RETURN v_conv;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID) TO authenticated;

-- 9. RPC: mark_conversation_messages_as_read
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_as_read(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_updated_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Verify user is a participant of the conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id
          AND (creator_id = v_user_id OR requester_id = v_user_id)
    ) THEN
        RAISE EXCEPTION 'Unauthorized: conversation not found or access denied' USING ERRCODE = '42501';
    END IF;

    -- Update read_at for all unread messages where caller is the recipient
    UPDATE public.messages
    SET read_at = TIMEZONE('utc', NOW()),
        updated_at = TIMEZONE('utc', NOW())
    WHERE conversation_id = p_conversation_id
      AND sender_id != v_user_id
      AND read_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_messages_as_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_as_read(UUID) TO authenticated;

-- 10. TRIGGER ON NEW MESSAGE: NOTIFICATIONS & CONVERSATION ACTIVITY
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_conv RECORD;
    v_recipient_id UUID;
    v_sender_name TEXT;
    v_idea_title TEXT;
    v_preview TEXT;
BEGIN
    -- Fetch conversation and idea context
    SELECT c.creator_id, c.requester_id, c.idea_id, i.title AS idea_title, p.full_name, p.username
    INTO v_conv
    FROM public.conversations c
    JOIN public.ideas i ON i.id = c.idea_id
    JOIN public.profiles p ON p.id = NEW.sender_id
    WHERE c.id = NEW.conversation_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Determine the other participant
    IF NEW.sender_id = v_conv.creator_id THEN
        v_recipient_id := v_conv.requester_id;
    ELSE
        v_recipient_id := v_conv.creator_id;
    END IF;

    -- Update last_message_at timestamp on the parent conversation
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.conversation_id;

    -- Prepare notification payload
    v_sender_name := COALESCE(v_conv.full_name, v_conv.username, 'Collaborator');
    v_idea_title := COALESCE(v_conv.idea_title, 'initiative');
    v_preview := SUBSTRING(NEW.body FROM 1 FOR 80);
    IF char_length(NEW.body) > 80 THEN
        v_preview := v_preview || '...';
    END IF;

    -- Generate a direct message notification for the recipient
    INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        idea_id,
        type,
        title,
        content
    )
    VALUES (
        v_recipient_id,
        NEW.sender_id,
        v_conv.idea_id,
        'new_message',
        'Message from ' || v_sender_name,
        v_preview
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_new_message ON public.messages;
CREATE TRIGGER trg_on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();

-- 11. ENABLE REALTIME PUBLICATION FOR DIRECT MESSAGING
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

