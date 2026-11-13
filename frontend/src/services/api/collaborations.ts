import { supabase } from '@/services/supabase/client';
import { recordFeedbackEngagement } from '@/services/api/feedback';
import type {
  Database,
  SubmitCollaborationPayload,
  CollaborationRequest,
} from '@/types';

type CollabRequestRow = Database['public']['Tables']['collaboration_requests']['Row'];
type RequestStatus = Database['public']['Tables']['collaboration_requests']['Row']['status'];

/**
 * Submit a request to collaborate on an idea
 */
export async function submitCollaborationRequest(
  payload: SubmitCollaborationPayload
): Promise<{ data: CollaborationRequest | null; error: Error | null }> {
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
        message: payload.message.trim(),
      })
      .select(`
        *,
        requester:profiles(*),
        idea:ideas(*),
        role:idea_roles_needed(*)
      `)
      .single();

    if (error) throw error;
    void recordFeedbackEngagement('meaningful_action', 0, 'collaboration_request');
    return { data: data as unknown as CollaborationRequest, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch all collaboration requests for a specific idea
 */
export async function fetchIdeaRequests(
  ideaId: string
): Promise<{ data: CollaborationRequest[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('collaboration_requests')
      .select(`
        *,
        requester:profiles(*),
        idea:ideas(*),
        role:idea_roles_needed(*)
      `)
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as unknown as CollaborationRequest[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch collaboration requests sent by a specific user
 */
export async function fetchUserSentRequests(
  userId: string
): Promise<{ data: CollaborationRequest[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('collaboration_requests')
      .select(`
        *,
        requester:profiles(*),
        idea:ideas(*),
        role:idea_roles_needed(*)
      `)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as unknown as CollaborationRequest[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch incoming collaboration requests across all ideas created by a founder
 */
export async function fetchFounderIncomingRequests(
  founderId: string
): Promise<{ data: CollaborationRequest[] | null; error: Error | null }> {
  try {
    const { data: myIdeas } = await supabase
      .from('ideas')
      .select('id')
      .eq('creator_id', founderId);

    const ideaIds = (myIdeas || []).map((i) => i.id);
    if (ideaIds.length === 0) return { data: [], error: null };

    const { data, error } = await supabase
      .from('collaboration_requests')
      .select(`
        *,
        requester:profiles(*),
        idea:ideas(*),
        role:idea_roles_needed(*)
      `)
      .in('idea_id', ideaIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as unknown as CollaborationRequest[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Update request status (accept, decline, withdraw)
 * Tries the atomic respond_to_collaboration_request RPC first,
 * falling back to direct update with robust error handling.
 */
export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus
): Promise<{ data: CollabRequestRow | null; error: Error | null }> {
  try {
    // 1. Try atomic database RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'respond_to_collaboration_request',
      {
        p_request_id: requestId,
        p_decision: status,
      }
    );

    if (!rpcError && rpcData?.success) {
      return {
        data: {
          id: requestId,
          status,
        } as unknown as CollabRequestRow,
        error: null,
      };
    }

    // 2. If RPC does not exist (PGRST202) or threw, fall back to direct update
    const { data, error } = await supabase
      .from('collaboration_requests')
      .update({ status })
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) {
      console.error('[IDEORA] updateRequestStatus error:', error);
      throw error;
    }

    return { data: data as unknown as CollabRequestRow, error: null };
  } catch (err) {
    console.error('[IDEORA] updateRequestStatus failed:', err);
    return { data: null, error: err as Error };
  }
}
