import { supabase } from '@/services/supabase/client';

export type AiScope = 'public' | 'internal';
export type AiAgentId = 'idea_development' | 'analytics';

export interface AiConversation {
  id: string;
  user_id: string;
  scope: AiScope;
  agent_id: AiAgentId;
  idea_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface AiNavigationAction {
  id: string;
  label: string;
  path: string;
  description: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  agent_id: string | null;
  content: string;
  metadata: Record<string, unknown> & {
    navigationActions?: AiNavigationAction[];
  };
  created_at: string;
}

export interface AiUsageAllowance {
  scope: AiScope;
  dailyRequestLimit: number;
  dailyRequestsUsed: number;
  dailyRequestsRemaining: number;
  dailyTokenLimit: number;
  dailyTokensUsed: number;
  dailyTokensRemaining: number;
  rateLimitPerMinute: number;
}

export interface AdminAiAnalyticsSnapshot {
  generated_at: string;
  users: {
    total: number;
    founders: number;
    collaborators: number;
    new_last_7_days: number;
    new_last_30_days: number;
    users_without_any_idea: number;
    users_with_empty_bio: number;
  };
  ideas: {
    total: number;
    published: number;
    drafts: number;
    flagged_or_removed: number;
    new_last_7_days: number;
    ideas_with_zero_applications: number;
  };
  collaborations: {
    total_requests: number;
    pending: number;
    accepted: number;
    declined: number;
    withdrawn: number;
    total_projects: number;
    active_projects: number;
  };
  engagement: {
    total_upvotes: number;
    total_comments: number;
    total_conversations: number;
    total_messages: number;
    open_feedback_items: number;
  };
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Please sign in to use Ideora AI.');
  }
  return session.access_token;
}

async function aiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const payload = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(payload?.error || `AI request failed (${res.status}).`);
  }
  return payload;
}

export async function fetchAiConversations(
  scope: AiScope
): Promise<{ data: AiConversation[] | null; error: Error | null }> {
  try {
    const res = await aiRequest<{ conversations: AiConversation[] }>(
      `/api/ai/conversations?scope=${scope}`
    );
    return { data: res.conversations || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function fetchAiConversationDetail(
  scope: AiScope,
  conversationId: string
): Promise<{
  conversation: AiConversation | null;
  messages: AiMessage[];
  error: Error | null;
}> {
  try {
    const res = await aiRequest<{
      conversation: AiConversation;
      messages: AiMessage[];
    }>(
      `/api/ai/conversations?scope=${scope}&id=${encodeURIComponent(conversationId)}`
    );
    return {
      conversation: res.conversation,
      messages: res.messages || [],
      error: null,
    };
  } catch (err) {
    return { conversation: null, messages: [], error: err as Error };
  }
}

export async function deleteAiConversation(
  scope: AiScope,
  conversationId: string
): Promise<{ error: Error | null }> {
  try {
    await aiRequest(
      `/api/ai/conversations?scope=${scope}&id=${encodeURIComponent(conversationId)}`,
      { method: 'DELETE' }
    );
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function fetchAiUsage(
  scope: AiScope
): Promise<{ data: AiUsageAllowance | null; error: Error | null }> {
  try {
    const res = await aiRequest<{ usage: AiUsageAllowance }>(
      `/api/ai/usage?scope=${scope}`
    );
    return { data: res.usage, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function sendAiChatMessage(params: {
  scope: AiScope;
  agentId: AiAgentId;
  message: string;
  conversationId?: string | null;
  ideaId?: string | null;
}): Promise<{
  data: {
    conversation: AiConversation;
    userMessage: AiMessage;
    assistantMessage: AiMessage;
    usage: AiUsageAllowance;
  } | null;
  error: Error | null;
}> {
  try {
    const data = await aiRequest<{
      conversation: AiConversation;
      userMessage: AiMessage;
      assistantMessage: AiMessage;
      usage: AiUsageAllowance;
    }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export interface SuggestedIdeaRole {
  role_title: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'design' | 'product' | 'ai' | 'marketing';
  spots_available: number;
  description: string;
}

export async function suggestIdeaRoles(params: {
  title: string;
  summary: string;
  description: string;
  category: string;
  collaborationType: string;
}): Promise<{ data: SuggestedIdeaRole[] | null; error: Error | null }> {
  try {
    const data = await aiRequest<{ roles: SuggestedIdeaRole[] }>(
      '/api/ai/suggest-roles',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
    return { data: data.roles || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function fetchAdminAiAnalyticsSnapshot(): Promise<{
  data: AdminAiAnalyticsSnapshot | null;
  error: Error | null;
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      'admin_get_ai_analytics_snapshot'
    );
    if (error) throw error;
    return { data: (data as AdminAiAnalyticsSnapshot) || null, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

