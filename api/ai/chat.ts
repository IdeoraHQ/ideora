import type { AiAgentId, AiScope, ApiRequest, ApiResponse } from '../_ai/core/types';
import { authenticateCaller, HttpError } from '../_ai/core/supabase-server';
import { orchestrateAiChat } from '../_ai/core/orchestrator';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const caller = await authenticateCaller(req);
    const body = (typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body || {}) as {
      scope?: unknown;
      agentId?: unknown;
      message?: unknown;
      conversationId?: unknown;
      ideaId?: unknown;
    };

    const scope: AiScope = body.scope === 'internal' ? 'internal' : 'public';
    const defaultAgent: AiAgentId =
      scope === 'internal' ? 'analytics' : 'idea_development';
    const agentId = (
      typeof body.agentId === 'string' && body.agentId ? body.agentId : defaultAgent
    ) as AiAgentId;

    if (typeof body.message !== 'string') {
      throw new HttpError(400, 'A text message is required.');
    }

    const result = await orchestrateAiChat({
      caller,
      scope,
      agentId,
      message: body.message,
      conversationId:
        typeof body.conversationId === 'string' ? body.conversationId : null,
      ideaId: typeof body.ideaId === 'string' ? body.ideaId : null,
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[IDEORA AI] /api/ai/chat error:', err);
    return res.status(500).json({
      error: 'Unexpected AI server error. Please try again shortly.',
    });
  }
}

