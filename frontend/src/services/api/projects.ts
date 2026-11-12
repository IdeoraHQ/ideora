import { supabase } from '@/services/supabase/client';
import type { Project, ProjectStatus } from '@/types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROJECT_SELECT_QUERY = `
  *,
  owner:profiles!projects_owner_id_fkey(*),
  idea:ideas!projects_idea_id_fkey(
    id,
    title,
    slug,
    summary,
    category,
    collaboration_type,
    status,
    tags,
    created_at
  ),
  members:project_members(
    *,
    user:profiles!project_members_user_id_fkey(*)
  )
`;

/**
 * Fetch all active/historical projects the authenticated user owns or participates in.
 * Authorization is enforced by Supabase RLS on public.projects and public.project_members.
 */
export async function fetchUserProjects(): Promise<{
  data: Project[] | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from('projects')
      .select(PROJECT_SELECT_QUERY)
      .order('last_activity_at', { ascending: false });

    if (error) throw error;

    return { data: (data as unknown as Project[]) || [], error: null };
  } catch (err) {
    console.error('[IDEORA] fetchUserProjects error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch a single project workspace by ID.
 * Unauthorized users receive null / access error enforced by PostgreSQL RLS.
 */
export async function fetchProjectById(projectId: string): Promise<{
  data: Project | null;
  error: Error | null;
}> {
  try {
    if (!UUID_REGEX.test(projectId)) {
      return {
        data: null,
        error: new Error('Project not found or you do not have access.'),
      };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) {
      return {
        data: null,
        error: new Error('Please sign in to access this project workspace.'),
      };
    }

    const { data, error } = await supabase
      .from('projects')
      .select(PROJECT_SELECT_QUERY)
      .eq('id', projectId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        data: null,
        error: new Error('Project not found or you do not have permission to view it.'),
      };
    }

    return { data: data as unknown as Project, error: null };
  } catch (err) {
    console.error('[IDEORA] fetchProjectById error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Update project lifecycle status (owner-only, enforced by Supabase RLS).
 */
export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<{
  data: Project | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', projectId)
      .select(PROJECT_SELECT_QUERY)
      .single();

    if (error) throw error;
    return { data: data as unknown as Project, error: null };
  } catch (err) {
    console.error('[IDEORA] updateProjectStatus error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Update project title or description (owner-only, enforced by Supabase RLS).
 */
export async function updateProjectDetails(
  projectId: string,
  updates: { title?: string; description?: string }
): Promise<{
  data: Project | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select(PROJECT_SELECT_QUERY)
      .single();

    if (error) throw error;
    return { data: data as unknown as Project, error: null };
  } catch (err) {
    console.error('[IDEORA] updateProjectDetails error:', err);
    return { data: null, error: err as Error };
  }
}

