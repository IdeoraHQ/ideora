import { supabase } from '@/services/supabase/client';
import type { NotificationItem } from '@/types';

export interface FetchNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Fetch notifications for the current authenticated user
 */
export async function fetchUserNotifications(
  options?: FetchNotificationsOptions
): Promise<{
  data: NotificationItem[] | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: [], error: null };

    let query = supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(*),
        idea:ideas(id, title, slug)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: (data as unknown as NotificationItem[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch exact count of unread notifications for current user
 */
export async function fetchUnreadNotificationsCount(): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read or unread
 */
export async function markNotificationAsRead(
  notificationId: string,
  isRead = true
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: isRead })
      .eq('id', notificationId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Mark all notifications for the current user as read
 */
export async function markAllNotificationsAsRead(): Promise<{
  error: Error | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: null };

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}
