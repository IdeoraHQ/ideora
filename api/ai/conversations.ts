import type {
  AiConversationRecord,
  AiMessageRecord,
  AiScope,
  ApiRequest,
  ApiResponse,
} from '../_ai/core/types';
import { authenticateCaller, HttpError, supabaseRest } from '../_ai/core/supabase-server';
import { assertCallerAuthorizedForScope } from '../_ai/core/permissions';

function getSingleQueryParam(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const val = query?.[key];
  return Array.isArray(val) ? val[0] : val;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const caller = await authenticateCaller(req);
    const scopeParam = getSingleQueryParam(req.query, 'scope');
    const scope: AiScope = scopeParam === 'internal' ? 'internal' : 'public';

    assertCallerAuthorizedForScope(caller, scope);

    const conversationId = getSingleQueryParam(req.query, 'id');

    if (req.method === 'GET') {
      if (conversationId) {
        const convRows = await supabaseRest<AiConversationRecord[]>({
          path: `ai_conversations?id=eq.${encodeURIComponent(
            conversationId
          )}&user_id=eq.${encodeURIComponent(caller.userId)}&scope=eq.${scope}&limit=1`,
          accessToken: caller.accessToken,
        });
        const conversation = convRows?.[0];
        if (!conversation) {
          throw new HttpError(404, 'Conversation not found.');
        }

        const messages = await supabaseRest<AiMessageRecord[]>({
          path: `ai_messages?conversation_id=eq.${encodeURIComponent(
            conversationId
          )}&order=created_at.asc`,
          accessToken: caller.accessToken,
        });

        return res.status(200).json({
          conversation,
          messages: messages || [],
        });
      }

      const conversations = await supabaseRest<AiConversationRecord[]>({
        path: `ai_conversations?user_id=eq.${encodeURIComponent(
          caller.userId
        )}&scope=eq.${scope}&order=last_message_at.desc&limit=40`,
        accessToken: caller.accessToken,
      });

      return res.status(200).json({
        conversations: conversations || [],
      });
    }

    if (req.method === 'DELETE') {
      if (!conversationId) {
        throw new HttpError(400, 'Conversation id is required.');
      }

      await supabaseRest({
        path: `ai_conversations?id=eq.${encodeURIComponent(
          conversationId
        )}&user_id=eq.${encodeURIComponent(caller.userId)}&scope=eq.${scope}`,
        method: 'DELETE',
        accessToken: caller.accessToken,
      });

      return res.status(200).json({ deleted: true });
    }

    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[IDEORA AI] /api/ai/conversations error:', err);
    return res.status(500).json({
      error: (err as Error)?.message || 'Unable to load AI conversations.',
    });
  }
}

