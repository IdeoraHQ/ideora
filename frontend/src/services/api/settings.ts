import { supabase } from '@/services/supabase/client';
import type { AccountDeletionRequest, ThemePreference, UserSettings } from '@/types';

const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Fetch the authenticated user's persisted notification settings.
 * Returns sensible defaults if no row exists yet.
 */
export async function fetchUserSettings(): Promise<{
  data: UserSettings | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        data: {
          user_id: user.id,
          notify_collaboration_requests: true,
          notify_messages: true,
          notify_idea_activity: true,
          notify_platform_announcements: true,
          theme_preference: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Persist notification preferences to Supabase.
 */
export async function updateUserSettings(prefs: {
  notify_collaboration_requests: boolean;
  notify_messages: boolean;
  notify_idea_activity: boolean;
  notify_platform_announcements: boolean;
  theme_preference?: ThemePreference;
}): Promise<{ data: UserSettings | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Authentication required.');
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        notify_collaboration_requests: prefs.notify_collaboration_requests,
        notify_messages: prefs.notify_messages,
        notify_idea_activity: prefs.notify_idea_activity,
        notify_platform_announcements: prefs.notify_platform_announcements,
        ...(prefs.theme_preference ? { theme_preference: prefs.theme_preference } : {}),
      })
      .select('*')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Persist only the user's theme preference to Supabase without overwriting
 * notification toggles.
 */
export async function updateThemePreference(
  themePreference: ThemePreference
): Promise<{ data: UserSettings | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          theme_preference: themePreference,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Upload an avatar image to the existing 'avatars' storage bucket and return its public URL.
 */
export async function uploadUserAvatar(
  file: File
): Promise<{ publicUrl: string | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Authentication required.');
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      throw new Error('Avatar must be a PNG, JPEG, or WebP image.');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new Error('Avatar image must be 2 MB or smaller.');
    }

    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg';
    const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return { publicUrl: data.publicUrl, error: null };
  } catch (err) {
    return { publicUrl: null, error: err as Error };
  }
}

/**
 * Fetch active pending deletion request (if any) for the current user.
 */
export async function fetchPendingDeletionRequest(): Promise<{
  data: AccountDeletionRequest | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Submit an authorized account deletion request via Supabase RPC.
 */
export async function requestAccountDeletion(
  reason?: string
): Promise<{ data: AccountDeletionRequest | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('request_account_deletion', {
      p_reason: reason?.trim() || null,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Cancel a pending account deletion request via Supabase RPC.
 */
export async function cancelAccountDeletionRequest(): Promise<{
  data: AccountDeletionRequest | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('cancel_account_deletion_request');
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

