import { supabase } from '@/services/supabase/client';
import type { UserProfile, UserRole } from '@/types';

export interface SignUpPayload {
  email: string;
  password: string;
  username: string;
  full_name: string;
  role: UserRole;
  skills: string[];
  bio?: string;
}

/**
 * Retrieve the currently authenticated user profile
 */
export async function getCurrentUserProfile(): Promise<{
  profile: UserProfile | null;
  error: Error | null;
}> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { profile: null, error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      // If the session token is expired or invalid (401), clear local session to stop repeated failures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).status === 401 || (error as any).code === 'PGRST301') {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
      return { profile: null, error: null };
    }
    return { profile: data, error: null };
  } catch (err) {
    return { profile: null, error: err as Error };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ profile: UserProfile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Authentication failed');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    return { profile: profile || null, error: null };
  } catch (err) {
    return { profile: null, error: err as Error };
  }
}

/**
 * Determine the authoritative site origin for auth redirects
 */
const getAuthBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_SITE_URL;
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return envUrl || 'https://ideorahq.top';
};

/**
 * Register a new account. Profile creation is handled atomically by the
 * database handle_new_user() trigger on auth.users so signup works both
 * with email verification enabled (session === null) and immediate sessions.
 */
export async function signUpWithEmail(
  payload: SignUpPayload
): Promise<{
  profile: UserProfile | null;
  error: Error | null;
  requiresEmailVerification?: boolean;
}> {
  try {
    const cleanUsername = payload.username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    const safeRole: 'founder' | 'collaborator' =
      payload.role === 'founder' ? 'founder' : 'collaborator';
    const cleanName = payload.full_name.trim();
    const cleanBio = payload.bio?.trim() || null;
    const cleanSkills = Array.isArray(payload.skills) ? payload.skills : [];

    const { data, error } = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: {
        emailRedirectTo: `${getAuthBaseUrl()}/dashboard`,
        data: {
          username: cleanUsername,
          full_name: cleanName,
          role: safeRole,
          skills: cleanSkills,
          bio: cleanBio,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Could not create user account');

    // When email verification is required, signUp returns session === null.
    // The database trigger handle_new_user() already created the profile; do not
    // issue anon writes to public.profiles.
    if (!data.session) {
      return {
        profile: null,
        error: null,
        requiresEmailVerification: true,
      };
    }

    // Immediate session available (e.g., email confirmation disabled):
    // Fetch the profile created by handle_new_user() without duplicate INSERT/UPSERT.
    const { data: createdProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (createdProfile && createdProfile.role !== safeRole) {
      const { data: roleProfile, error: roleError } = await supabase.rpc(
        'switch_creator_collaborator_role',
        { p_role: safeRole }
      );
      if (roleError) throw roleError;
      return {
        profile: roleProfile,
        error: null,
        requiresEmailVerification: false,
      };
    }

    return {
      profile: createdProfile,
      error: null,
      requiresEmailVerification: false,
    };
  } catch (err) {
    return { profile: null, error: err as Error };
  }
}

/**
 * Sign in via GitHub OAuth
 */
export async function signInWithGithub(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${getAuthBaseUrl()}/dashboard`,
      },
    });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Request password recovery email using Supabase Auth
 * Sends a secure time-limited recovery link to the user's email
 */
export async function requestPasswordReset(
  email: string,
  redirectTo?: string
): Promise<{ error: Error | null }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address');
    }

    const targetRedirect = redirectTo || `${getAuthBaseUrl()}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: targetRedirect,
    });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Update authenticated user password
 * Used after following a valid recovery link or active recovery session
 */
export async function updateUserPassword(
  newPassword: string
): Promise<{ error: Error | null }> {
  try {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}
