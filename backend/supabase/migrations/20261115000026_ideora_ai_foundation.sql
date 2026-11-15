-- ==============================================================================
-- IDEORA AI FOUNDATION (PHASE 1)
-- Migration: 20261115000026_ideora_ai_foundation.sql
-- Description:
--   1. Creates dedicated AI tables: ai_conversations, ai_messages, ai_runs,
--      ai_tool_calls, ai_usage_events, ai_user_preferences.
--   2. Enforces strict Row Level Security (RLS) separating 'public' user AI
--      conversations from 'internal' admin-only operations conversations.
--   3. Adds admin_get_ai_analytics_snapshot() SECURITY DEFINER RPC returning
--      verified platform metrics for the Internal Analytics Agent.
-- ==============================================================================

-- 1. AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('public', 'internal')),
    agent_id TEXT NOT NULL,
    idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_scope
    ON public.ai_conversations(user_id, scope, last_message_at DESC);

-- 2. AI MESSAGES
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    agent_id TEXT,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT chk_ai_messages_content_length CHECK (
        char_length(trim(content)) > 0 AND char_length(content) <= 20000
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created
    ON public.ai_messages(conversation_id, created_at ASC);

-- 3. AI RUNS (EXECUTION AUDIT)
CREATE TABLE IF NOT EXISTS public.ai_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('public', 'internal')),
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    model TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_conversation
    ON public.ai_runs(conversation_id, created_at DESC);

-- 4. AI TOOL CALLS
CREATE TABLE IF NOT EXISTS public.ai_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'denied', 'error')),
    input_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_run
    ON public.ai_tool_calls(run_id, created_at ASC);

-- 5. AI USAGE EVENTS (RATE LIMITING & ACCOUNTING)
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.ai_runs(id) ON DELETE SET NULL,
    scope TEXT NOT NULL CHECK (scope IN ('public', 'internal')),
    agent_id TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created
    ON public.ai_usage_events(user_id, created_at DESC);

-- 6. AI USER PREFERENCES
CREATE TABLE IF NOT EXISTS public.ai_user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    default_agent_id TEXT NOT NULL DEFAULT 'idea_development',
    include_idea_context BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_preferences ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES: ai_conversations
DROP POLICY IF EXISTS "Users can view own public ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can view own public ai conversations"
    ON public.ai_conversations FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        AND public.is_active_user()
        AND (
            scope = 'public'
            OR (scope = 'internal' AND public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Users can create own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can create own ai conversations"
    ON public.ai_conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.is_active_user()
        AND (
            scope = 'public'
            OR (scope = 'internal' AND public.is_admin())
        )
        AND (
            idea_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.ideas i
                WHERE i.id = idea_id AND i.creator_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can update own ai conversations"
    ON public.ai_conversations FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        AND public.is_active_user()
        AND (
            scope = 'public'
            OR (scope = 'internal' AND public.is_admin())
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        AND public.is_active_user()
        AND (
            scope = 'public'
            OR (scope = 'internal' AND public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Users can delete own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own ai conversations"
    ON public.ai_conversations FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        AND public.is_active_user()
        AND (
            scope = 'public'
            OR (scope = 'internal' AND public.is_admin())
        )
    );

-- 9. RLS POLICIES: ai_messages
DROP POLICY IF EXISTS "Users can view own ai messages" ON public.ai_messages;
CREATE POLICY "Users can view own ai messages"
    ON public.ai_messages FOR SELECT
    TO authenticated
    USING (
        public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ai_conversations c
            WHERE c.id = ai_messages.conversation_id
              AND c.user_id = auth.uid()
              AND (c.scope = 'public' OR (c.scope = 'internal' AND public.is_admin()))
        )
    );

DROP POLICY IF EXISTS "Users can insert own ai messages" ON public.ai_messages;
CREATE POLICY "Users can insert own ai messages"
    ON public.ai_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.is_active_user()
        AND EXISTS (
            SELECT 1 FROM public.ai_conversations c
            WHERE c.id = ai_messages.conversation_id
              AND c.user_id = auth.uid()
              AND (c.scope = 'public' OR (c.scope = 'internal' AND public.is_admin()))
        )
    );

-- 10. RLS POLICIES: ai_runs, ai_tool_calls, ai_usage_events (read own; writes via server/service_role)
DROP POLICY IF EXISTS "Users can view own ai runs" ON public.ai_runs;
CREATE POLICY "Users can view own ai runs"
    ON public.ai_runs FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        AND public.is_active_user()
        AND (scope = 'public' OR (scope = 'internal' AND public.is_admin()))
    );

DROP POLICY IF EXISTS "Users can view own ai tool calls" ON public.ai_tool_calls;
CREATE POLICY "Users can view own ai tool calls"
    ON public.ai_tool_calls FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        AND public.is_active_user()
    );

DROP POLICY IF EXISTS "Users can view own ai usage events" ON public.ai_usage_events;
CREATE POLICY "Users can view own ai usage events"
    ON public.ai_usage_events FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        AND public.is_active_user()
    );

-- 11. RLS POLICIES: ai_user_preferences
DROP POLICY IF EXISTS "Users can manage own ai preferences" ON public.ai_user_preferences;
CREATE POLICY "Users can manage own ai preferences"
    ON public.ai_user_preferences FOR ALL
    TO authenticated
    USING (auth.uid() = user_id AND public.is_active_user())
    WITH CHECK (auth.uid() = user_id AND public.is_active_user());

-- 12. SERVER-SIDE ANALYTICS RPC FOR INTERNAL ANALYTICS AGENT
-- Returns verified, real-time platform statistics from PostgreSQL.
-- Strictly restricted to administrators via public.is_admin().
CREATE OR REPLACE FUNCTION public.admin_get_ai_analytics_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Administrator access required'
            USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'generated_at', TIMEZONE('utc', NOW()),
        'users', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.profiles),
            'founders', (SELECT COUNT(*) FROM public.profiles WHERE role = 'founder'),
            'collaborators', (SELECT COUNT(*) FROM public.profiles WHERE role = 'collaborator'),
            'new_last_7_days', (
                SELECT COUNT(*) FROM public.profiles
                WHERE created_at >= TIMEZONE('utc', NOW()) - INTERVAL '7 days'
            ),
            'new_last_30_days', (
                SELECT COUNT(*) FROM public.profiles
                WHERE created_at >= TIMEZONE('utc', NOW()) - INTERVAL '30 days'
            ),
            'users_without_any_idea', (
                SELECT COUNT(*) FROM public.profiles p
                WHERE NOT EXISTS (SELECT 1 FROM public.ideas i WHERE i.creator_id = p.id)
            ),
            'users_with_empty_bio', (
                SELECT COUNT(*) FROM public.profiles
                WHERE bio IS NULL OR char_length(trim(bio)) = 0
            )
        ),
        'ideas', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.ideas WHERE deleted_at IS NULL),
            'published', (
                SELECT COUNT(*) FROM public.ideas
                WHERE status != 'draft'
                  AND moderation_status = 'approved'::public.idea_moderation_status
                  AND deleted_at IS NULL
            ),
            'drafts', (
                SELECT COUNT(*) FROM public.ideas
                WHERE status = 'draft' AND deleted_at IS NULL
            ),
            'flagged_or_removed', (
                SELECT COUNT(*) FROM public.ideas
                WHERE moderation_status != 'approved'::public.idea_moderation_status
                   OR deleted_at IS NOT NULL
            ),
            'new_last_7_days', (
                SELECT COUNT(*) FROM public.ideas
                WHERE deleted_at IS NULL
                  AND created_at >= TIMEZONE('utc', NOW()) - INTERVAL '7 days'
            ),
            'ideas_with_zero_applications', (
                SELECT COUNT(*) FROM public.ideas i
                WHERE i.status != 'draft'
                  AND i.moderation_status = 'approved'::public.idea_moderation_status
                  AND i.deleted_at IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM public.collaboration_requests cr WHERE cr.idea_id = i.id
                  )
            )
        ),
        'collaborations', jsonb_build_object(
            'total_requests', (SELECT COUNT(*) FROM public.collaboration_requests),
            'pending', (SELECT COUNT(*) FROM public.collaboration_requests WHERE status = 'pending'),
            'accepted', (SELECT COUNT(*) FROM public.collaboration_requests WHERE status = 'accepted'),
            'declined', (SELECT COUNT(*) FROM public.collaboration_requests WHERE status = 'declined'),
            'withdrawn', (SELECT COUNT(*) FROM public.collaboration_requests WHERE status = 'withdrawn'),
            'total_projects', (SELECT COUNT(*) FROM public.projects),
            'active_projects', (SELECT COUNT(*) FROM public.projects WHERE status = 'active')
        ),
        'engagement', jsonb_build_object(
            'total_upvotes', (SELECT COUNT(*) FROM public.idea_upvotes),
            'total_comments', (SELECT COUNT(*) FROM public.idea_comments),
            'total_conversations', (SELECT COUNT(*) FROM public.conversations),
            'total_messages', (SELECT COUNT(*) FROM public.messages WHERE deleted_at IS NULL),
            'open_feedback_items', (
                SELECT COUNT(*) FROM public.feedback
                WHERE status IN (
                    'new'::public.feedback_status,
                    'reviewing'::public.feedback_status,
                    'planned'::public.feedback_status,
                    'in_progress'::public.feedback_status
                )
            )
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_ai_analytics_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_analytics_snapshot() TO authenticated;

