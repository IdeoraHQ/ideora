import { supabase } from '@/services/supabase/client';
import type { Database } from '@/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Fetch profile by user ID or username
 */
export async function fetchProfile(
  identifier: string
): Promise<{ data: ProfileRow | null; error: Error | null }> {
  try {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        identifier
      );

    const query = supabase.from('profiles').select('*');
    const { data, error } = isUuid
      ? await query.eq('id', identifier).single()
      : await query.eq('username', identifier).single();

    if (error) throw error;
    return { data, error: null };
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

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
