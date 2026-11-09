-- ==============================================================================
-- IDEORA: Collaboration Workflow Triggers, Comments & Automated Notifications
-- Migration: 20261107000002_workflow_triggers_and_comments.sql
-- Description: Adds idea_comments table, automated role spot fulfillment when
--              requests are accepted, and automated notification triggers.
-- ==============================================================================

-- 1. IDEA COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.idea_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT comment_not_empty CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_idea_comments_idea_id ON public.idea_comments(idea_id, created_at ASC);

CREATE OR REPLACE TRIGGER set_idea_comments_updated_at
    BEFORE UPDATE ON public.idea_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
    ON public.idea_comments FOR SELECT
    USING (TRUE);

CREATE POLICY "Authenticated users can post comments"
    ON public.idea_comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own comments"
    ON public.idea_comments FOR DELETE
    TO authenticated
    USING (auth.uid() = author_id);

-- 2. AUTOMATED COLLABORATION WORKFLOW & NOTIFICATIONS TRIGGER
CREATE OR REPLACE FUNCTION public.handle_collaboration_request_workflow()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_collaboration_request_workflow ON public.collaboration_requests;
CREATE TRIGGER on_collaboration_request_workflow
    AFTER INSERT OR UPDATE ON public.collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_collaboration_request_workflow();

-- 3. AUTOMATED COMMENT NOTIFICATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_idea_title TEXT;
    v_idea_creator UUID;
    v_author_name TEXT;
BEGIN
    SELECT title, creator_id INTO v_idea_title, v_idea_creator
    FROM public.ideas
    WHERE id = NEW.idea_id;

    -- Only notify if commenter is not the idea creator
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_idea_comment_created ON public.idea_comments;
CREATE TRIGGER on_idea_comment_created
    AFTER INSERT ON public.idea_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_notification();

