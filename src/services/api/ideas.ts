import { supabase } from '@/services/supabase/client';
import type { Database, CreateIdeaPayload } from '@/types';

type IdeaRow = Database['public']['Tables']['ideas']['Row'];
type RoleRow = Database['public']['Tables']['idea_roles_needed']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface IdeaWithRelations extends IdeaRow {
  author?: ProfileRow;
  rolesNeeded?: RoleRow[];
}

export interface FetchIdeasFilter {
  category?: string;
  search?: string;
  tag?: string;
}

/**
 * Fetch published ideas with author profile and required roles
 */
export async function fetchPublishedIdeas(
  filter: FetchIdeasFilter = {}
): Promise<{ data: IdeaWithRelations[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('ideas')
      .select(`
        *,
        author:profiles(*),
        rolesNeeded:idea_roles_needed(*)
      `)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (filter.category && filter.category !== 'all') {
      query = query.eq('category', filter.category);
    }

    if (filter.tag) {
      query = query.contains('tags', [filter.tag]);
    }

    if (filter.search) {
      query = query.or(
        `title.ilike.%${filter.search}%,summary.ilike.%${filter.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: (data as unknown as IdeaWithRelations[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch a single idea by slug
 */
export async function fetchIdeaBySlug(
  slug: string
): Promise<{ data: IdeaWithRelations | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ideas')
      .select(`
        *,
        author:profiles(*),
        rolesNeeded:idea_roles_needed(*)
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return { data: (data as unknown as IdeaWithRelations) || null, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Create a new idea and optionally provision its required collaboration roles
 */
export async function createIdea(
  payload: CreateIdeaPayload
): Promise<{ data: IdeaRow | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to submit an idea');
    }

    // Slug generation utility
    const baseSlug = payload.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Insert idea record
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .insert({
        creator_id: user.id,
        title: payload.title,
        slug: uniqueSlug,
        summary: payload.summary,
        description: payload.description,
        category: payload.category,
        collaboration_type: payload.collaboration_type,
        tags: payload.tags,
      })
      .select()
      .single();

    if (ideaError) throw ideaError;

    // 2. Insert roles needed if provided
    if (payload.roles_needed && payload.roles_needed.length > 0) {
      const rolesToInsert = payload.roles_needed.map((r) => ({
        idea_id: idea.id,
        role_title: r.role_title,
        category: r.category,
        spots_available: r.spots_available,
        spots_filled: 0,
        description: r.description || null,
      }));

      const { error: rolesError } = await supabase
        .from('idea_roles_needed')
        .insert(rolesToInsert);

      if (rolesError) throw rolesError;
    }

    return { data: idea, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Toggle upvote on an idea
 */
export async function toggleIdeaUpvote(
  ideaId: string
): Promise<{ upvoted: boolean; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to upvote');
    }

    // Check if already upvoted
    const { data: existing } = await supabase
      .from('idea_upvotes')
      .select('created_at')
      .eq('idea_id', ideaId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Remove upvote
      const { error } = await supabase
        .from('idea_upvotes')
        .delete()
        .eq('idea_id', ideaId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { upvoted: false, error: null };
    } else {
      // Add upvote
      const { error } = await supabase
        .from('idea_upvotes')
        .insert({ idea_id: ideaId, user_id: user.id });

      if (error) throw error;
      return { upvoted: true, error: null };
    }
  } catch (err) {
    return { upvoted: false, error: err as Error };
  }
}
