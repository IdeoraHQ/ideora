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
        try {
          localStorage.removeItem('ideora_user_profile');
        } catch {
          // ignore
        }
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
 * Register a new account and create profile
 */
export async function signUpWithEmail(
  payload: SignUpPayload
): Promise<{ profile: UserProfile | null; error: Error | null }> {
  try {
    const cleanUsername = payload.username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          username: cleanUsername,
          full_name: payload.full_name.trim(),
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Could not create user account');

    // Update profile with role, skills, and bio
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        username: cleanUsername,
        full_name: payload.full_name.trim(),
        role: payload.role,
        skills: payload.skills,
        bio: payload.bio?.trim() || null,
      })
      .select()
      .single();

    if (profileError) throw profileError;
    return { profile: updatedProfile, error: null };
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
        redirectTo: `${window.location.origin}/dashboard`,
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
