-- ==============================================================================
-- IDEORA: Feedback Status Change Notifications
-- Migration: 20261113000014_feedback_status_notifications.sql
--
-- Sends an in-app notification to the feedback submitter whenever the status
-- of their feedback submission changes.
-- ==============================================================================

-- 1. Add dedicated notification_type enum value
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'feedback_updated';

-- 2. Trigger function to notify the feedback author when status changes
CREATE OR REPLACE FUNCTION public.notify_on_feedback_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status_label TEXT;
    v_prev_label TEXT;
    v_title TEXT;
    v_content TEXT;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    v_status_label := pg_catalog.initcap(pg_catalog.replace(NEW.status::TEXT, '_', ' '));
    v_prev_label := pg_catalog.initcap(pg_catalog.replace(OLD.status::TEXT, '_', ' '));

    v_title := pg_catalog.format(
        'Feedback "%s" is now %s',
        pg_catalog.left(NEW.title, 80),
        v_status_label
    );

    v_content := pg_catalog.format(
        'Your feedback status changed from %s to %s.',
        v_prev_label,
        v_status_label
    );

    IF NEW.admin_response IS NOT NULL AND pg_catalog.btrim(NEW.admin_response) != '' THEN
        v_content := v_content || ' Admin response: ' || pg_catalog.left(pg_catalog.btrim(NEW.admin_response), 240);
    END IF;

    INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        idea_id,
        type,
        title,
        content
    )
    VALUES (
        NEW.user_id,
        NEW.reviewed_by,
        NULL,
        'feedback_updated'::public.notification_type,
        v_title,
        v_content
    );

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_on_feedback_status_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notify_feedback_status_change ON public.feedback;
CREATE TRIGGER trg_notify_feedback_status_change
    AFTER UPDATE OF status ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_feedback_status_change();

