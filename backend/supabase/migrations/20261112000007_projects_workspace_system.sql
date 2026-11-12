-- ==============================================================================
-- IDEORA: Projects Hub & Collaboration Workspaces
-- Migration: 20261112000007_projects_workspace_system.sql
-- Description:
--   1. Creates public.projects and public.project_members tables representing
--      ideas that have progressed into active collaborations.
--   2. Implements non-recursive SECURITY DEFINER membership helper and strict
--      Row Level Security (RLS) so only project owners and accepted
--      collaborators can access private project workspaces.
--   3. Automatically provisions projects & team memberships when collaboration
--      requests are accepted, and backfills existing accepted collaborations.
-- ==============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_member_role AS ENUM ('owner', 'collaborator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROJECTS TABLE (1:1 with an originating idea once collaboration begins)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL UNIQUE REFERENCES public.ideas(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status project_status DEFAULT 'active'::project_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_projects_title_length CHECK (char_length(trim(title)) >= 3)
);

-- 3. PROJECT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    collaboration_request_id UUID REFERENCES public.collaboration_requests(id) ON DELETE SET NULL,
    role_title TEXT NOT NULL DEFAULT 'Collaborator',
    member_role project_member_role DEFAULT 'collaborator'::project_member_role NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_project_members_project_user UNIQUE (project_id, user_id)
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_idea_id ON public.projects(idea_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_last_activity ON public.projects(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- 5. AUTOMATIC UPDATED_AT & LAST_ACTIVITY_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_project_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    NEW.last_activity_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_project_timestamps();

-- 6. NON-RECURSIVE MEMBERSHIP CHECK HELPER (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = p_project_id
          AND p.owner_id = p_user_id
    )
    OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p_project_id
          AND pm.user_id = p_user_id
    );
$$;

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES FOR public.projects
-- Only the project owner or an accepted project member can view a project
DROP POLICY IF EXISTS "Project owners and members can view projects" ON public.projects;
CREATE POLICY "Project owners and members can view projects"
    ON public.projects FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR public.is_project_member(id, auth.uid())
    );

-- Only the idea owner can create a project directly
DROP POLICY IF EXISTS "Owners can create projects" ON public.projects;
CREATE POLICY "Owners can create projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Only the project owner can update project details or status
DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;
CREATE POLICY "Project owners can update projects"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Only the project owner can delete a project
DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;
CREATE POLICY "Project owners can delete projects"
    ON public.projects FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- 9. RLS POLICIES FOR public.project_members
-- Only owners and authorized collaborators of the project can view its members
DROP POLICY IF EXISTS "Project members can view team roster" ON public.project_members;
CREATE POLICY "Project members can view team roster"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (public.is_project_member(project_id, auth.uid()));

-- Only project owners can add members directly
DROP POLICY IF EXISTS "Project owners can insert members" ON public.project_members;
CREATE POLICY "Project owners can insert members"
    ON public.project_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
              AND p.owner_id = auth.uid()
        )
    );

-- Only project owners can update member roles
DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;
CREATE POLICY "Project owners can update members"
    ON public.project_members FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
              AND p.owner_id = auth.uid()
        )
    );

-- Project owners can remove members, or a collaborator can leave
DROP POLICY IF EXISTS "Project owners can remove members or self leave" ON public.project_members;
CREATE POLICY "Project owners can remove members or self leave"
    ON public.project_members FOR DELETE
    TO authenticated
    USING (
        (
            member_role != 'owner'
            AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
              AND p.owner_id = auth.uid()
        )
    );

-- 10. AUTOMATIC PROJECT PROVISIONING TRIGGER ON COLLABORATION ACCEPTANCE
CREATE OR REPLACE FUNCTION public.sync_project_on_collaboration_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_project_id UUID;
    v_idea_title TEXT;
    v_idea_summary TEXT;
    v_idea_creator UUID;
    v_role_title TEXT;
BEGIN
    -- Handle accepted collaboration request
    IF (NEW.status = 'accepted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted')) THEN
        SELECT title, summary, creator_id
        INTO v_idea_title, v_idea_summary, v_idea_creator
        FROM public.ideas
        WHERE id = NEW.idea_id;

        IF v_idea_creator IS NOT NULL THEN
            -- Ensure a project exists for this idea
            INSERT INTO public.projects (idea_id, owner_id, title, description, status)
            VALUES (
                NEW.idea_id,
                v_idea_creator,
                COALESCE(v_idea_title, 'Untitled Project'),
                COALESCE(v_idea_summary, ''),
                'active'::project_status
            )
            ON CONFLICT (idea_id) DO UPDATE
            SET last_activity_at = TIMEZONE('utc', NOW())
            RETURNING id INTO v_project_id;

            -- Ensure project owner is in project_members
            INSERT INTO public.project_members (project_id, user_id, role_title, member_role)
            VALUES (v_project_id, v_idea_creator, 'Project Owner', 'owner'::project_member_role)
            ON CONFLICT (project_id, user_id) DO NOTHING;

            -- Resolve role title if linked to an idea role
            IF NEW.role_id IS NOT NULL THEN
                SELECT role_title INTO v_role_title
                FROM public.idea_roles_needed
                WHERE id = NEW.role_id;
            END IF;

            -- Add or update accepted collaborator in project_members
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
                'collaborator'::project_member_role
            )
            ON CONFLICT (project_id, user_id) DO UPDATE
            SET collaboration_request_id = EXCLUDED.collaboration_request_id,
                role_title = EXCLUDED.role_title;
        END IF;

    -- If an accepted request is later withdrawn or declined, remove collaborator membership
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
            SET last_activity_at = TIMEZONE('utc', NOW())
            WHERE id = v_project_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_on_collaboration_acceptance ON public.collaboration_requests;
CREATE TRIGGER trg_sync_project_on_collaboration_acceptance
    AFTER INSERT OR UPDATE ON public.collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION public.sync_project_on_collaboration_acceptance();

-- 11. BACKFILL EXISTING ACCEPTED COLLABORATIONS INTO PROJECTS
DO $$
DECLARE
    rec RECORD;
    v_project_id UUID;
    v_role_title TEXT;
BEGIN
    FOR rec IN
        SELECT
            cr.id AS request_id,
            cr.idea_id,
            cr.role_id,
            cr.requester_id,
            i.title AS idea_title,
            i.summary AS idea_summary,
            i.creator_id AS owner_id
        FROM public.collaboration_requests cr
        JOIN public.ideas i ON i.id = cr.idea_id
        WHERE cr.status = 'accepted'
    LOOP
        INSERT INTO public.projects (idea_id, owner_id, title, description, status)
        VALUES (
            rec.idea_id,
            rec.owner_id,
            COALESCE(rec.idea_title, 'Untitled Project'),
            COALESCE(rec.idea_summary, ''),
            'active'::project_status
        )
        ON CONFLICT (idea_id) DO NOTHING;

        SELECT id INTO v_project_id
        FROM public.projects
        WHERE idea_id = rec.idea_id;

        IF v_project_id IS NOT NULL THEN
            INSERT INTO public.project_members (project_id, user_id, role_title, member_role)
            VALUES (v_project_id, rec.owner_id, 'Project Owner', 'owner'::project_member_role)
            ON CONFLICT (project_id, user_id) DO NOTHING;

            v_role_title := NULL;
            IF rec.role_id IS NOT NULL THEN
                SELECT role_title INTO v_role_title
                FROM public.idea_roles_needed
                WHERE id = rec.role_id;
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
                rec.requester_id,
                rec.request_id,
                COALESCE(v_role_title, 'Collaborator'),
                'collaborator'::project_member_role
            )
            ON CONFLICT (project_id, user_id) DO UPDATE
            SET collaboration_request_id = EXCLUDED.collaboration_request_id,
                role_title = EXCLUDED.role_title;
        END IF;
    END LOOP;
END $$;

-- 12. PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;

