import { supabase } from '@/services/supabase/client';
import type { Database, DiscoverablePerson } from '@/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Fetch profile by user ID or username
 */
export async function fetchProfile(
  identifier: string
): Promise<{ data: ProfileRow | null; error: Error | null }> {
  try {
    const cleanIdentifier = identifier.trim().replace(/^@+/, '');
    if (!cleanIdentifier) {
      return { data: null, error: null };
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        cleanIdentifier
      );

    if (isUuid) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', cleanIdentifier)
        .maybeSingle();
      if (error) throw error;
      return { data, error: null };
    }

    const { data: exactMatch, error: exactError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', cleanIdentifier)
      .maybeSingle();

    if (exactError) throw exactError;
    if (exactMatch) {
      return { data: exactMatch, error: null };
    }

    // Fallback to case-insensitive lookup if username casing differs
    const escaped = cleanIdentifier.replace(/[\\%_]/g, '\\$&');
    const { data: ilikeMatch, error: ilikeError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', escaped)
      .limit(1)
      .maybeSingle();

    if (ilikeError) throw ilikeError;
    return { data: ilikeMatch, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Update current user's profile
 */
export async function updateCurrentProfile(
  payload: ProfileUpdate
): Promise<{ data: ProfileRow | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { role, ...safeProfileFields } = payload;

    const { data, error } = await supabase
      .from('profiles')
      .update(safeProfileFields)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    if (role === 'founder' || role === 'collaborator') {
      if (data.role !== 'admin' && data.role !== role) {
        const { data: roleUpdated, error: roleError } = await supabase.rpc(
          'switch_creator_collaborator_role',
          { p_role: role }
        );
        if (roleError) throw roleError;
        return { data: roleUpdated, error: null };
      }
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export interface SearchPeopleFilters {
  search?: string;
  skill?: string;
  interest?: string;
  role?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search discoverable people via the authoritative `search_discoverable_people` RPC.
 * Enforces `is_discoverable = true`, active status, and public-only fields in PostgreSQL.
 */
export async function searchDiscoverablePeople(
  filters: SearchPeopleFilters = {}
): Promise<{ data: DiscoverablePerson[]; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('search_discoverable_people', {
      p_search: filters.search?.trim() || null,
      p_skill: filters.skill && filters.skill !== 'all' ? filters.skill : null,
      p_interest: filters.interest?.trim() || null,
      p_role: filters.role && filters.role !== 'all' ? filters.role : null,
      p_limit: filters.limit ?? 30,
      p_offset: filters.offset ?? 0,
    });

    if (error) throw error;
    return { data: (data as DiscoverablePerson[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}
