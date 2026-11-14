import { supabase } from '@/services/supabase/client';
import { recordFeedbackEngagement } from '@/services/api/feedback';
import type {
  Database,
  SubmitCollaborationPayload,
  CollaborationRequest,
} from '@/types';

type CollabRequestRow = Database['public']['Tables']['collaboration_requests']['Row'];
type RequestStatus = Database['public']['Tables']['collaboration_requests']['Row']['status'];

const COLLAB_SELECT = `
  *,
  requester:profiles!collaboration_requests_requester_id_fkey(*),
  recipient:profiles!collaboration_requests_recipient_id_fkey(*),
  idea:ideas(*),
  role:idea_roles_needed(*)
`;

/**
 * Submit a request to collaborate on an idea OR directly with a person (idea-independent)
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

    const isIdeaBased = Boolean(payload.idea_id);
    if (!isIdeaBased && !payload.recipient_id) {
      throw new Error('Please select a recipient for your collaboration request.');
    }

    if (payload.recipient_id && payload.recipient_id === user.id) {
      throw new Error('You cannot send a collaboration request to yourself.');
    }

    const { data, error } = await supabase
      .from('collaboration_requests')
      .insert({
        idea_id: payload.idea_id || null,
        role_id: isIdeaBased ? payload.role_id || null : null,
        recipient_id: payload.recipient_id || null,
        request_type: isIdeaBased ? 'idea_based' : 'general',
        purpose: payload.purpose?.trim() || (isIdeaBased ? null : 'General Collaboration'),
        skills_offered: payload.skills_offered ?? [],
        requester_id: user.id,
        message: payload.message.trim(),
      })
      .select(COLLAB_SELECT)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          isIdeaBased
            ? 'You have already submitted an application for this role.'
            : 'You already have a pending collaboration request with this person.'
        );
      }
      throw error;
    }
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
      .select(COLLAB_SELECT)
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
      .select(COLLAB_SELECT)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as unknown as CollaborationRequest[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch incoming collaboration requests (both idea-based for user's ideas AND direct general requests)
 */
export async function fetchFounderIncomingRequests(
  userId: string
): Promise<{ data: CollaborationRequest[] | null; error: Error | null }> {
  try {
    const { data: myIdeas } = await supabase
      .from('ideas')
      .select('id')
      .eq('creator_id', userId);

    const ideaIds = (myIdeas || []).map((i) => i.id);

    let query = supabase
      .from('collaboration_requests')
      .select(COLLAB_SELECT)
      .order('created_at', { ascending: false });

    if (ideaIds.length > 0) {
      query = query.or(`recipient_id.eq.${userId},idea_id.in.(${ideaIds.join(',')})`);
    } else {
      query = query.eq('recipient_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: (data as unknown as CollaborationRequest[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Check if there is an existing general (idea-independent) collaboration request
 * between the authenticated user and targetUserId.
 */
export async function fetchGeneralRequestBetween(
  targetUserId: string
): Promise<{ data: CollaborationRequest | null; error: Error | null }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id === targetUserId) return { data: null, error: null };

    const { data, error } = await supabase
      .from('collaboration_requests')
      .select(COLLAB_SELECT)
      .is('idea_id', null)
      .or(
        `and(requester_id.eq.${user.id},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${user.id})`
      )
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { data: (data as unknown as CollaborationRequest) || null, error: null };
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

    // Only fall back to direct update if the RPC function does not exist (PGRST202).
    // Business-logic, concurrency, or authorization errors from the RPC must surface directly.
    if (rpcError && rpcError.code !== 'PGRST202') {
      console.error('[IDEORA] respond_to_collaboration_request RPC error:', rpcError);
      throw new Error(rpcError.message || 'Failed to update collaboration request.');
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
