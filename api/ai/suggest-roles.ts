import type { ApiRequest, ApiResponse } from '../_ai/core/types';
import { authenticateCaller, HttpError } from '../_ai/core/supabase-server';
import { assertCallerAuthorizedForScope } from '../_ai/core/permissions';
import { getModelProvider } from '../_ai/core/model-provider';

const VALID_CATEGORIES = new Set([
  'frontend',
  'backend',
  'fullstack',
  'design',
  'product',
  'ai',
  'marketing',
]);

interface SuggestedRole {
  role_title: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'design' | 'product' | 'ai' | 'marketing';
  spots_available: number;
  description: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const caller = await authenticateCaller(req);
    assertCallerAuthorizedForScope(caller, 'public');

    const body = (typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body || {}) as {
      title?: unknown;
      summary?: unknown;
      description?: unknown;
      category?: unknown;
      collaborationType?: unknown;
    };

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 140) : '';
    const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 400) : '';
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 1200) : '';
    const category =
      typeof body.category === 'string' ? body.category.trim().slice(0, 80) : '';
    const collaborationType =
      typeof body.collaborationType === 'string'
        ? body.collaborationType.trim().slice(0, 40)
        : 'co_founder';

    if (!title && !summary && !description) {
      throw new HttpError(
        400,
        'Enter an idea title or summary first so ORA can suggest relevant roles.'
      );
    }

    const provider = getModelProvider();
    const prompt = [
      'Suggest 2 to 4 realistic collaboration roles needed to build this Ideora project.',
      `Title: ${title || 'Untitled'}`,
      `Category: ${category || 'General'}`,
      `Collaboration Model: ${collaborationType}`,
      `Summary: ${summary || 'N/A'}`,
      `Description: ${description || 'N/A'}`,
      '',
      'Respond ONLY with a valid JSON array (no markdown fences) of objects with keys:',
      '- "role_title": concise role name (e.g. "Founding AI Engineer", "UI/UX Designer")',
      '- "category": one of "frontend", "backend", "fullstack", "design", "product", "ai", "marketing"',
      '- "spots_available": integer between 1 and 3',
      '- "description": 1-sentence responsibility summary',
    ].join('\n');

    const modelRes = await provider.generate({
      systemPrompt:
        'You are ORA, Ideora’s project scoping assistant. Return strictly valid JSON array output with no extra prose.',
      messages: [{ role: 'user', text: prompt }],
      maxOutputTokens: 550,
      temperature: 0.3,
    });

    const rawText = modelRes.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const start = rawText.indexOf('[');
      const end = rawText.lastIndexOf(']');
      if (start !== -1 && end > start) {
        parsed = JSON.parse(rawText.slice(start, end + 1));
      } else {
        throw new Error('Could not parse suggested roles.');
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Unexpected response format.');
    }

    const roles: SuggestedRole[] = parsed
      .slice(0, 4)
      .map((item): SuggestedRole | null => {
        if (!item || typeof item !== 'object') return null;
        const r = item as Record<string, unknown>;
        const roleTitle =
          typeof r.role_title === 'string' ? r.role_title.trim().slice(0, 80) : '';
        if (!roleTitle) return null;
        const rawCat =
          typeof r.category === 'string' ? r.category.trim().toLowerCase() : 'fullstack';
        const safeCat = (
          VALID_CATEGORIES.has(rawCat) ? rawCat : 'fullstack'
        ) as SuggestedRole['category'];
        const spots =
          typeof r.spots_available === 'number' && Number.isFinite(r.spots_available)
            ? Math.min(3, Math.max(1, Math.round(r.spots_available)))
            : 1;
        const desc =
          typeof r.description === 'string' ? r.description.trim().slice(0, 220) : '';

        return {
          role_title: roleTitle,
          category: safeCat,
          spots_available: spots,
          description: desc,
        };
      })
      .filter((r): r is SuggestedRole => r !== null);

    return res.status(200).json({ roles });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[IDEORA AI] /api/ai/suggest-roles error:', err);
    return res.status(500).json({
      error: 'Unable to suggest roles right now. Please add roles manually.',
    });
  }
}
