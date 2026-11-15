import type { AiScope, ApiRequest, ApiResponse } from '../_ai/core/types';
import { authenticateCaller, HttpError } from '../_ai/core/supabase-server';
import { assertCallerAuthorizedForScope } from '../_ai/core/permissions';
import { getCallerUsageSummary } from '../_ai/core/usage-manager';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const caller = await authenticateCaller(req);
    const rawScope = req.query?.scope;
    const scopeParam = Array.isArray(rawScope) ? rawScope[0] : rawScope;
    const scope: AiScope = scopeParam === 'internal' ? 'internal' : 'public';

    assertCallerAuthorizedForScope(caller, scope);
    const usage = await getCallerUsageSummary(caller, scope);

    return res.status(200).json({ usage });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[IDEORA AI] /api/ai/usage error:', err);
    return res.status(500).json({
      error: (err as Error)?.message || 'Unable to fetch AI usage.',
    });
  }
}

