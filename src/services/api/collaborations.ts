import { supabase } from '@/services/supabase/client';
import type { Database, SubmitCollaborationPayload } from '@/types';

type CollabRequestRow = Database['public']['Tables']['collaboration_requests']['Row'];
type RequestStatus = Database['public']['Tables']['collaboration_requests']['Row']['status'];

/**
 * Submit a request to collaborate on an idea
 */
export async function submitCollaborationRequest(
  payload: SubmitCollaborationPayload
): Promise<{ data: CollabRequestRow | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to request collaboration');
    }

    const { data, error } = await supabase
      .from('collaboration_requests')
      .insert({
        idea_id: payload.idea_id,
        role_id: payload.role_id || null,
        requester_id: user.id,
        message: payload.message,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch all collaboration requests for an idea (Idea creator only)
 */
export async function fetchIdeaRequests(
  ideaId: string
): Promise<{ data: CollabRequestRow[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('collaboration_requests')
      .select(`
        *,
        requester:profiles(*),
        role:idea_roles_needed(*)
      `)
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as unknown as CollabRequestRow[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Update request status (accept, decline, withdraw)
 */
export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus
): Promise<{ data: CollabRequestRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('collaboration_requests')
      .update({ status })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
