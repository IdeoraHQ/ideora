-- ==============================================================================
-- IDEORA: People Discovery & Idea-Independent Collaboration Requests
-- Migration: 20261113000017_people_discovery_and_general_collaborations.sql
--
-- 1. Extends `public.profiles` with interests, preferred_roles,
--    looking_to_contribute, collaboration_goals, and `is_discoverable`.
-- 2. Adds `public.search_discoverable_people(...)` RPC enforcing discoverability,
--    active status, and public-only fields at the database layer.
-- 3. Updates `public.collaboration_requests` and `public.conversations` to
--    support both `idea_based` and `general` (idea-independent) requests,
--    with duplicate-pending prevention, self-request prevention, strict RLS,
--    notifications, and 1:1 conversation support.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND PROFILES FOR DISCOVERABILITY & RICH COLLABORATION DETAILS
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS preferred_roles TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS looking_to_contribute TEXT,
    ADD COLUMN IF NOT EXISTS collaboration_goals TEXT,
    ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_discoverable
    ON public.profiles(is_discoverable, updated_at DESC);

-- Authoritative People Discovery RPC (enforces is_discoverable & active account status)
CREATE OR REPLACE FUNCTION public.search_discoverable_people(
    p_search TEXT DEFAULT NULL,
    p_skill TEXT DEFAULT NULL,
    p_interest TEXT DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 30,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    role public.user_role,
    skills TEXT[],
    interests TEXT[],
    preferred_roles TEXT[],
    looking_to_contribute TEXT,
    collaboration_goals TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    is_discoverable BOOLEAN,
    created_at TIMESTAMPTZ,
    published_ideas_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.bio,
        p.role,
        p.skills,
        p.interests,
        p.preferred_roles,
        p.looking_to_contribute,
        p.collaboration_goals,
        p.github_url,
        p.linkedin_url,
        p.website_url,
        p.is_discoverable,
        p.created_at,
        (
            SELECT COUNT(*)
            FROM public.ideas i
            WHERE i.creator_id = p.id
              AND i.status != 'draft'::public.idea_status
              AND i.moderation_status = 'approved'::public.idea_moderation_status
              AND i.deleted_at IS NULL
        ) AS published_ideas_count
    FROM public.profiles p
    LEFT JOIN public.profile_security_status s ON s.user_id = p.id
    WHERE p.is_discoverable = TRUE
      AND (
          s.user_id IS NULL
          OR s.account_status = 'active'::public.account_status
          OR (
              s.account_status = 'suspended'::public.account_status
              AND s.suspended_until IS NOT NULL
              AND s.suspended_until <= pg_catalog.now()
          )
      )
      AND (
          p_search IS NULL
          OR pg_catalog.btrim(p_search) = ''
          OR p.username ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR p.full_name ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR COALESCE(p.bio, '') ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR COALESCE(p.looking_to_contribute, '') ILIKE '%' || pg_catalog.btrim(p_search) || '%'
          OR COALESCE(p.collaboration_goals, '') ILIKE '%' || pg_catalog.btrim(p_search) || '%'
      )
      AND (
          p_skill IS NULL
          OR pg_catalog.btrim(p_skill) = ''
          OR p_skill = ANY(p.skills)
      )
      AND (
          p_interest IS NULL
          OR pg_catalog.btrim(p_interest) = ''
          OR EXISTS (
              SELECT 1 FROM unnest(p.interests) AS intr
              WHERE intr ILIKE '%' || pg_catalog.btrim(p_interest) || '%'
          )
      )
      AND (
          p_role IS NULL
          OR pg_catalog.btrim(p_role) = ''
          OR p.role::TEXT = p_role
          OR EXISTS (
              SELECT 1 FROM unnest(p.preferred_roles) AS pr
              WHERE pr ILIKE '%' || pg_catalog.btrim(p_role) || '%'
          )
      )
    ORDER BY p.updated_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_discoverable_people(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_discoverable_people(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. MAKE COLLABORATION_REQUESTS SUPPORT IDEA-INDEPENDENT REQUESTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.collaboration_requests
    ALTER COLUMN idea_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'idea_based',
    ADD COLUMN IF NOT EXISTS purpose TEXT,
    ADD COLUMN IF NOT EXISTS skills_offered TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_collab_request_type'
    ) THEN
        ALTER TABLE public.collaboration_requests
            ADD CONSTRAINT chk_collab_request_type
            CHECK (request_type IN ('idea_based', 'general'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_collab_not_self'
    ) THEN
        ALTER TABLE public.collaboration_requests
            ADD CONSTRAINT chk_collab_not_self
            CHECK (recipient_id IS NULL OR requester_id != recipient_id);
    END IF;
END $$;

-- Backfill recipient_id for all existing idea-based requests
UPDATE public.collaboration_requests cr
SET recipient_id = i.creator_id,
    request_type = 'idea_based'
FROM public.ideas i
WHERE cr.idea_id = i.id
  AND cr.recipient_id IS NULL;

-- Prevent duplicate pending general collaboration requests between the same pair of users
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_general_collab
    ON public.collaboration_requests (
        LEAST(requester_id, recipient_id),
        GREATEST(requester_id, recipient_id)
    )
    WHERE idea_id IS NULL AND status = 'pending'::public.request_status;

CREATE INDEX IF NOT EXISTS idx_collab_requests_recipient
    ON public.collaboration_requests(recipient_id, status, created_at DESC);

-- Automatically populate recipient_id and request_type on INSERT
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

        NEW.recipient_id := v_creator_id;
        NEW.request_type := 'idea_based';
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

DROP TRIGGER IF EXISTS trg_populate_collab_request_defaults ON public.collaboration_requests;
CREATE TRIGGER trg_populate_collab_request_defaults
    BEFORE INSERT ON public.collaboration_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.populate_collab_request_defaults();

-- ------------------------------------------------------------------------------
-- 3. UPDATED RLS POLICIES FOR COLLABORATION_REQUESTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "View relevant collaboration requests" ON public.collaboration_requests;
CREATE POLICY "View relevant collaboration requests"
    ON public.collaboration_requests FOR SELECT
    TO authenticated
    USING (
        auth.uid() = requester_id
        OR auth.uid() = recipient_id
        OR EXISTS (
            SELECT 1 FROM public.ideas i
            WHERE i.id = collaboration_requests.idea_id
              AND i.creator_id = auth.uid()
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Submit collaboration request" ON public.collaboration_requests;
CREATE POLICY "Submit collaboration request"
    ON public.collaboration_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = requester_id
        AND public.is_active_user()
        AND (
            (
                collaboration_requests.idea_id IS NOT NULL
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
        )
    );

DROP POLICY IF EXISTS "Idea creators can accept or decline requests" ON public.collaboration_requests;
CREATE POLICY "Idea creators or recipients can accept or decline requests"
    ON public.collaboration_requests FOR UPDATE
    TO authenticated
    USING (
        public.is_active_user()
        AND (
            auth.uid() = collaboration_requests.recipient_id
            OR EXISTS (
                SELECT 1 FROM public.ideas
                WHERE ideas.id = collaboration_requests.idea_id
                  AND ideas.creator_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        public.is_active_user()
        AND (
            auth.uid() = collaboration_requests.recipient_id
            OR EXISTS (
                SELECT 1 FROM public.ideas
                WHERE ideas.id = collaboration_requests.idea_id
                  AND ideas.creator_id = auth.uid()
            )
        )
        AND status IN ('accepted'::public.request_status, 'declined'::public.request_status)
    );

-- ------------------------------------------------------------------------------
-- 4. UPDATE WORKFLOW, PROJECT SYNC, RESPOND RPC & CONVERSATIONS FOR NULL idea_id
-- ------------------------------------------------------------------------------
ALTER TABLE public.conversations
    ALTER COLUMN idea_id DROP NOT NULL;

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
BEGIN
    -- General (idea-independent) collaborations communicate via Conversations, not Idea Projects
    IF NEW.idea_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF (NEW.status = 'accepted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted')) THEN
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
            SET last_activity_at = pg_catalog.now()
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
                NEW.requester_id,
                NEW.id,
                COALESCE(v_role_title, 'Collaborator'),
                'collaborator'::public.project_member_role
            )
            ON CONFLICT (project_id, user_id) DO UPDATE
            SET collaboration_request_id = EXCLUDED.collaboration_request_id,
                role_title = EXCLUDED.role_title;
        END IF;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status != 'accepted') THEN
        SELECT id INTO v_project_id
        FROM public.projects
        WHERE idea_id = NEW.idea_id;

        IF v_project_id IS NOT NULL THEN
            DELETE FROM public.project_members
            WHERE project_id = v_project_id
              AND user_id = NEW.requester_id
              AND member_role != 'owner';

            UPDATE public.projects
            SET last_activity_at = pg_catalog.now()
            WHERE id = v_project_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

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
        IF (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted') THEN
            IF NEW.idea_id IS NOT NULL THEN
                IF NEW.role_id IS NOT NULL THEN
                    UPDATE public.idea_roles_needed
                    SET spots_filled = LEAST(spots_available, spots_filled + 1)
                    WHERE id = NEW.role_id;
                END IF;

                PERFORM set_config('ideora.internal_counter_update', 'true', TRUE);
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
        ELSIF (NEW.status = 'declined' AND OLD.status IS DISTINCT FROM 'declined') THEN
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
                        'Your request to join "' || COALESCE(v_idea_title, 'an idea') || '" was not selected at this time.'
                    ELSE
                        COALESCE(v_recipient_name, 'A builder') || ' declined your collaboration request at this time.'
                END
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

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
    WHERE r.id = p_request_id;

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

    UPDATE public.collaboration_requests
    SET status = v_valid_status,
        updated_at = pg_catalog.now()
    WHERE id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'request_id', p_request_id,
        'status', p_decision
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_request_id UUID)
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
        COALESCE(i.creator_id, cr.recipient_id) AS target_recipient_id
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

