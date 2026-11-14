import { supabase } from '@/services/supabase/client';
import type { Conversation, Message } from '@/types';

/**
 * Fetch all conversations for the authenticated user, ordered by last activity.
 * Includes Idea, Creator profile, Requester profile, and Collaboration Request context.
 */
export async function fetchUserConversations(): Promise<{
  data: Conversation[] | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to access messages');
    }

    // Fetch conversations where user is creator or requester
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        idea:ideas(id, title, slug, category, status),
        creator:profiles!conversations_creator_id_fkey(*),
        requester:profiles!conversations_requester_id_fkey(*),
        collaboration_request:collaboration_requests(
          id,
          status,
          message,
          role_id,
          request_type,
          purpose
        )
      `)
      .or(`creator_id.eq.${user.id},requester_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    if (!data) return { data: [], error: null };

    // For each conversation, fetch the latest message and unread count
    const conversationIds = data.map((c) => c.id);
    if (conversationIds.length === 0) {
      return { data: [], error: null };
    }

    // Fetch unread messages count for this user in parallel
    const [unreadRes, lastMessagesRes] = await Promise.all([
      supabase
        .from('messages')
        .select('conversation_id, id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null),
      supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false }),
    ]);

    // Map unread counts by conversation
    const unreadMap = new Map<string, number>();
    if (unreadRes.data) {
      for (const msg of unreadRes.data) {
        unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
      }
    }

    // Map latest message by conversation
    const latestMessageMap = new Map<string, Message>();
    if (lastMessagesRes.data) {
      for (const msg of lastMessagesRes.data) {
        if (!latestMessageMap.has(msg.conversation_id)) {
          latestMessageMap.set(msg.conversation_id, msg as unknown as Message);
        }
      }
    }

    const rawList = data as unknown as Conversation[];
    const conversations: Conversation[] = rawList.map((c) => ({
      ...c,
      unread_count: unreadMap.get(c.id) || 0,
      last_message: latestMessageMap.get(c.id) || null,
    }));

    return { data: conversations, error: null };
  } catch (err) {
    console.error('[IDEORA] fetchUserConversations error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch a single conversation by ID with all relations.
 */
export async function fetchConversationById(
  conversationId: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to view this conversation');
    }

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        idea:ideas(id, title, slug, category, status),
        creator:profiles!conversations_creator_id_fkey(*),
        requester:profiles!conversations_requester_id_fkey(*),
        collaboration_request:collaboration_requests(
          id,
          status,
          message,
          role_id,
          request_type,
          purpose
        )
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;
    if (!data) return { data: null, error: null };

    // Fetch unread count for current user
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);

    const conv = data as unknown as Conversation;
    return {
      data: {
        ...conv,
        unread_count: unreadCount ?? 0,
      },
      error: null,
    };
  } catch (err) {
    console.error('[IDEORA] fetchConversationById error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Find or create a conversation for a specific collaboration request.
 * Transaction-safe and verified on the database.
 */
export async function getOrCreateConversation(
  requestId: string
): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_request_id: requestId,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[IDEORA] getOrCreateConversation error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch chronological message history for a conversation.
 */
export async function fetchConversationMessages(
  conversationId: string
): Promise<{ data: Message[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data as unknown as Message[]) || [], error: null };
  } catch (err) {
    console.error('[IDEORA] fetchConversationMessages error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Send a message within an authorized conversation.
 */
export async function sendMessage(
  conversationId: string,
  body: string
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty');
    }
    if (trimmed.length > 5000) {
      throw new Error('Message exceeds the 5,000 character limit');
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to send a message');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: trimmed,
      })
      .select(`
        *,
        sender:profiles(*)
      `)
      .single();

    if (error) throw error;
    return { data: (data as unknown as Message) || null, error: null };
  } catch (err) {
    console.error('[IDEORA] sendMessage error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Mark all unread messages in a conversation as read.
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc(
      'mark_conversation_messages_as_read',
      {
        p_conversation_id: conversationId,
      }
    );

    if (error) throw error;
    return { count: data ?? 0, error: null };
  } catch (err) {
    console.error('[IDEORA] markConversationAsRead error:', err);
    return { count: 0, error: err as Error };
  }
}

/**
 * Fetch total unread message count across all conversations for current user.
 */
export async function fetchTotalUnreadMessagesCount(): Promise<number> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return 0;

    // Get all conversation IDs where user is participant
    const { data: convs, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`creator_id.eq.${user.id},requester_id.eq.${user.id}`);

    if (convError || !convs || convs.length === 0) return 0;

    const convIds = convs.map((c) => c.id);

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Realtime subscription helper for new messages in a conversation.
 */
export function subscribeToConversationMessages(
  conversationId: string,
  onNewMessage: (msg: Message) => void
): () => void {
  const channelName = `messages:${conversationId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch sender profile details to hydrate the message
        const raw = payload.new as Message;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', raw.sender_id)
            .single();

          onNewMessage({
            ...raw,
            sender: profile || undefined,
          });
        } catch {
          onNewMessage(raw);
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
