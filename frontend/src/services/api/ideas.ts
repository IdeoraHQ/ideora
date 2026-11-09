import { supabase } from '@/services/supabase/client';
import type {
  Database,
  CreateIdeaPayload,
  IdeaStatus,
  IdeaComment,
} from '@/types';

type IdeaRow = Database['public']['Tables']['ideas']['Row'];
type RoleRow = Database['public']['Tables']['idea_roles_needed']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface IdeaWithRelations extends IdeaRow {
  author?: ProfileRow;
  rolesNeeded?: RoleRow[];
}

export interface FetchIdeasFilter {
  category?: string;
  roleCategory?: string;
  collaborationType?: string;
  search?: string;
  tag?: string;
  sortBy?: 'newest' | 'trending';
}

// Fast in-memory cache for published ideas to avoid repeated 10s remote roundtrips
const ideasCache = new Map<string, { data: IdeaWithRelations[]; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

export function invalidateIdeasCache(): void {
  ideasCache.clear();
}

/**
 * Fetch published ideas with author profile and required roles
 */
export async function fetchPublishedIdeas(
  filter: FetchIdeasFilter = {}
): Promise<{ data: IdeaWithRelations[] | null; error: Error | null }> {
  const cacheKey = JSON.stringify(filter);
  const cached = ideasCache.get(cacheKey);

  // Return instantly from cache if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { data: cached.data, error: null };
  }

  try {
    let query = supabase
      .from('ideas')
      .select(`
        *,
        author:profiles!ideas_creator_id_fkey(*),
        rolesNeeded:idea_roles_needed(*)
      `)
      .neq('status', 'draft');

    if (filter.sortBy === 'trending') {
      query = query.order('upvotes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (filter.category && filter.category !== 'all') {
      query = query.eq('category', filter.category);
    }

    if (filter.collaborationType && filter.collaborationType !== 'all') {
      query = query.eq(
        'collaboration_type',
        filter.collaborationType as Database['public']['Enums']['collaboration_type']
      );
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
    if (error) {
      // If network fails but we had stale cache, return stale cache gracefully
      if (cached) return { data: cached.data, error: null };
      throw error;
    }

    let results = (data as unknown as IdeaWithRelations[]) || [];
    if (filter.roleCategory && filter.roleCategory !== 'all') {
      results = results.filter((idea) =>
        Boolean(idea.rolesNeeded?.some((r) => r.category === filter.roleCategory))
      );
    }

    ideasCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return { data: results, error: null };
  } catch (err) {
    if (cached) return { data: cached.data, error: null };
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch ideas created by a specific user (including drafts if owner)
 */
export async function fetchUserIdeas(
  userId: string
): Promise<{ data: IdeaWithRelations[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ideas')
      .select(`
        *,
        author:profiles!ideas_creator_id_fkey(*),
        rolesNeeded:idea_roles_needed(*)
      `)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as unknown as IdeaWithRelations[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch a single idea by slug or ID
 */
export async function fetchIdeaBySlug(
  slugOrId: string
): Promise<{ data: IdeaWithRelations | null; error: Error | null }> {
  try {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    let query = supabase
      .from('ideas')
      .select(`
        *,
        author:profiles!ideas_creator_id_fkey(*),
        rolesNeeded:idea_roles_needed(*)
      `);

    if (isUuid) {
      query = query.or(`slug.eq.${slugOrId},id.eq.${slugOrId}`);
    } else {
      query = query.eq('slug', slugOrId);
    }

    const { data, error } = await query.single();

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
        title: payload.title.trim(),
        slug: uniqueSlug,
        summary: payload.summary.trim(),
        description: payload.description.trim(),
        category: payload.category,
        status: payload.status || 'seeking_collaborators',
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
        role_title: r.role_title.trim(),
        category: r.category,
        spots_available: Math.max(1, r.spots_available),
        spots_filled: 0,
        description: r.description?.trim() || null,
      }));

      const { error: rolesError } = await supabase
        .from('idea_roles_needed')
        .insert(rolesToInsert);

      if (rolesError) throw rolesError;
    }

    invalidateIdeasCache();
    return { data: idea, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Update idea status (creator only)
 */
export async function updateIdeaStatus(
  ideaId: string,
  status: IdeaStatus
): Promise<{ data: IdeaRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ideas')
      .update({ status })
      .eq('id', ideaId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Delete an idea (creator only)
 */
export async function deleteIdea(
  ideaId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('ideas').delete().eq('id', ideaId);
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Get IDs of ideas upvoted by the current user
 */
export async function fetchUserUpvotedIdeaIds(): Promise<string[]> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const { data } = await supabase
      .from('idea_upvotes')
      .select('idea_id')
      .eq('user_id', session.user.id);

    return (data || []).map((row) => row.idea_id);
  } catch {
    return [];
  }
}

/**
 * Toggle upvote on an idea (Uses secure atomic backend RPC)
 */
export async function toggleIdeaUpvote(
  ideaId: string
): Promise<{ upvoted: boolean; upvotesCount?: number; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to upvote');
    }

    // Call hardened RPC function toggle_idea_upvote_secure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('toggle_idea_upvote_secure', {
      p_idea_id: ideaId,
    });

    if (error) {
      // Graceful fallback to direct table operation
      const { data: existing, error: checkErr } = await supabase
        .from('idea_upvotes')
        .select('created_at')
        .eq('idea_id', ideaId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existing) {
        const { error: delErr } = await supabase
          .from('idea_upvotes')
          .delete()
          .eq('idea_id', ideaId)
          .eq('user_id', user.id);

        if (delErr) throw delErr;

        const { data: updatedIdea } = await supabase
          .from('ideas')
          .select('upvotes_count')
          .eq('id', ideaId)
          .single();

        return {
          upvoted: false,
          upvotesCount: updatedIdea?.upvotes_count,
          error: null,
        };
      } else {
        const { error: insErr } = await supabase
          .from('idea_upvotes')
          .insert({ idea_id: ideaId, user_id: user.id });

        if (insErr) throw insErr;

        const { data: updatedIdea } = await supabase
          .from('ideas')
          .select('upvotes_count')
          .eq('id', ideaId)
          .single();

        invalidateIdeasCache();
        return {
          upvoted: true,
          upvotesCount: updatedIdea?.upvotes_count,
          error: null,
        };
      }
    }

    invalidateIdeasCache();
    const res = data as { upvoted: boolean; upvotes_count: number };
    return {
      upvoted: res.upvoted,
      upvotesCount: res.upvotes_count,
      error: null,
    };
  } catch (err) {
    return { upvoted: false, error: err as Error };
  }
}

/**
 * Fetch comments for an idea
 */
export async function fetchIdeaComments(
  ideaId: string
): Promise<{ data: IdeaComment[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('idea_comments')
      .select(`
        *,
        author:profiles(*)
      `)
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data as unknown as IdeaComment[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Post a comment on an idea
 */
export async function createIdeaComment(
  ideaId: string,
  content: string
): Promise<{ data: IdeaComment | null; error: Error | null }> {
  try {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('Comment cannot be empty');
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to post a comment');
    }

    const { data, error } = await supabase
      .from('idea_comments')
      .insert({
        idea_id: ideaId,
        author_id: user.id,
        content: trimmed,
      })
      .select(`
        *,
        author:profiles(*)
      `)
      .single();

    if (error) throw error;
    return { data: data as unknown as IdeaComment, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
