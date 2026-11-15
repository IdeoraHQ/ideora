import type { ApiRequest, AuthenticatedCaller } from './types';

function getSupabaseEnv(): {
  url: string;
  anonKey: string;
  serviceRoleKey: string | null;
} {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).replace(/\/+$/, '');
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

  if (!url || !anonKey) {
    throw new Error('Server Supabase configuration is missing.');
  }

  return { url, anonKey, serviceRoleKey };
}

export function extractBearerToken(req: ApiRequest): string | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!raw || !raw.startsWith('Bearer ')) return null;
  const token = raw.slice(7).trim();
  return token || null;
}

export async function supabaseRest<T>(params: {
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
  useServiceRole?: boolean;
  prefer?: string;
}): Promise<T> {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();

  if (params.useServiceRole && !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.');
  }

  const bearer = params.useServiceRole
    ? serviceRoleKey!
    : params.accessToken || anonKey;
  const apiKey = params.useServiceRole ? serviceRoleKey! : anonKey;

  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
  };

  if (params.prefer) {
    headers.Prefer = params.prefer;
  }

  const res = await fetch(`${url}/rest/v1/${params.path}`, {
    method: params.method || 'GET',
    headers,
    body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let message = `Database request failed (${res.status})`;
    try {
      const parsed = JSON.parse(errText) as { message?: string; error?: string };
      message = parsed.message || parsed.error || message;
    } catch {
      if (errText) message = errText.slice(0, 200);
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function authenticateCaller(
  req: ApiRequest
): Promise<AuthenticatedCaller> {
  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    throw new HttpError(401, 'Authentication required.');
  }

  const { url, anonKey } = getSupabaseEnv();

  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userRes.ok) {
    throw new HttpError(401, 'Invalid or expired session. Please sign in again.');
  }

  const authUser = (await userRes.json()) as { id?: string };
  if (!authUser?.id) {
    throw new HttpError(401, 'Unable to verify authenticated user.');
  }

  const [profiles, isAdminRpc, isActiveRpc] = await Promise.all([
    supabaseRest<
      Array<{
        id: string;
        role: 'founder' | 'collaborator' | 'admin';
        username: string;
        full_name: string;
      }>
    >({
      path: `profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,role,username,full_name&limit=1`,
      accessToken,
    }),
    supabaseRest<boolean>({
      path: 'rpc/is_admin',
      method: 'POST',
      body: {},
      accessToken,
    }).catch(() => false),
    supabaseRest<boolean>({
      path: 'rpc/is_active_user',
      method: 'POST',
      body: {},
      accessToken,
    }).catch(() => true),
  ]);

  const profile = profiles?.[0];
  if (!profile) {
    throw new HttpError(403, 'User profile not found.');
  }

  if (!isActiveRpc) {
    throw new HttpError(403, 'Your account is not active.');
  }

  return {
    userId: profile.id,
    accessToken,
    role: profile.role,
    username: profile.username,
    fullName: profile.full_name,
    isAdmin: profile.role === 'admin' && Boolean(isAdminRpc),
    isActive: Boolean(isActiveRpc),
  };
}

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

