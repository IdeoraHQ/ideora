import type { AiMessageRecord, ModelMessage } from './types';
import { supabaseRest } from './supabase-server';

const MAX_HISTORY_MESSAGES = 8;

export async function buildConversationModelMessages(params: {
  conversationId: string;
  accessToken: string;
}): Promise<ModelMessage[]> {
  const rows = await supabaseRest<AiMessageRecord[]>({
    path: `ai_messages?conversation_id=eq.${encodeURIComponent(
      params.conversationId
    )}&order=created_at.desc&limit=${MAX_HISTORY_MESSAGES}`,
    accessToken: params.accessToken,
  });

  const chronological = (rows || []).slice().reverse();

  return chronological
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      text: m.content,
    }));
}

