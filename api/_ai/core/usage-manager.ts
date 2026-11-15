import type { AiAgentId, AiScope, AuthenticatedCaller, UsageAllowance } from './types';
import { HttpError, supabaseRest } from './supabase-server';

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getConfiguredLimits(scope: AiScope) {
  if (scope === 'internal') {
    return {
      dailyRequestLimit: parsePositiveInt(process.env.AI_INTERNAL_DAILY_REQUEST_LIMIT, 200),
      dailyTokenLimit: parsePositiveInt(process.env.AI_INTERNAL_DAILY_TOKEN_LIMIT, 500_000),
      rateLimitPerMinute: parsePositiveInt(process.env.AI_RATE_LIMIT_PER_MINUTE, 15),
    };
  }
  return {
    dailyRequestLimit: parsePositiveInt(process.env.AI_PUBLIC_DAILY_REQUEST_LIMIT, 20),
    dailyTokenLimit: parsePositiveInt(process.env.AI_PUBLIC_DAILY_TOKEN_LIMIT, 60_000),
    rateLimitPerMinute: parsePositiveInt(process.env.AI_RATE_LIMIT_PER_MINUTE, 6),
  };
}

export async function getCallerUsageSummary(
  caller: AuthenticatedCaller,
  scope: AiScope
): Promise<UsageAllowance> {
  const limits = getConfiguredLimits(scope);
  const now = new Date();
  const utcStartOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();

  const events = await supabaseRest<
    Array<{ total_tokens: number; created_at: string }>
  >({
    path: `ai_usage_events?user_id=eq.${encodeURIComponent(
      caller.userId
    )}&scope=eq.${scope}&created_at=gte.${encodeURIComponent(
      utcStartOfDay
    )}&select=total_tokens,created_at`,
    accessToken: caller.accessToken,
  });

  const rows = events || [];
  const dailyRequestsUsed = rows.length;
  const dailyTokensUsed = rows.reduce((sum, r) => sum + (r.total_tokens || 0), 0);

  return {
    scope,
    dailyRequestLimit: limits.dailyRequestLimit,
    dailyRequestsUsed,
    dailyRequestsRemaining: Math.max(0, limits.dailyRequestLimit - dailyRequestsUsed),
    dailyTokenLimit: limits.dailyTokenLimit,
    dailyTokensUsed,
    dailyTokensRemaining: Math.max(0, limits.dailyTokenLimit - dailyTokensUsed),
    rateLimitPerMinute: limits.rateLimitPerMinute,
  };
}

export async function enforceUsageLimits(
  caller: AuthenticatedCaller,
  scope: AiScope
): Promise<UsageAllowance> {
  const summary = await getCallerUsageSummary(caller, scope);
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const recent = await supabaseRest<Array<{ id: string }>>({
    path: `ai_usage_events?user_id=eq.${encodeURIComponent(
      caller.userId
    )}&created_at=gte.${encodeURIComponent(oneMinuteAgo)}&select=id`,
    accessToken: caller.accessToken,
  });

  if ((recent?.length ?? 0) >= summary.rateLimitPerMinute) {
    throw new HttpError(
      429,
      'You are sending AI requests too quickly. Please wait a minute before trying again.'
    );
  }

  if (summary.dailyRequestsUsed >= summary.dailyRequestLimit) {
    throw new HttpError(
      429,
      `Daily AI allowance reached (${summary.dailyRequestLimit} requests/day). Your limit resets at 00:00 UTC.`
    );
  }

  if (summary.dailyTokensUsed >= summary.dailyTokenLimit) {
    throw new HttpError(
      429,
      'Daily AI token allowance reached. Your allowance resets at 00:00 UTC.'
    );
  }

  return summary;
}

export async function recordUsageEvent(params: {
  userId: string;
  runId: string;
  scope: AiScope;
  agentId: AiAgentId;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}): Promise<void> {
  await supabaseRest({
    path: 'ai_usage_events',
    method: 'POST',
    useServiceRole: true,
    body: {
      user_id: params.userId,
      run_id: params.runId,
      scope: params.scope,
      agent_id: params.agentId,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
    },
  });
}

