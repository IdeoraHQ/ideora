import { supabase } from '@/services/supabase/client';
import type { NotificationItem } from '@/types';

/**
 * Fetch notifications for the current authenticated user
 */
export async function fetchUserNotifications(): Promise<{
  data: NotificationItem[] | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(*),
        idea:ideas(id, title, slug)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return { data: (data as unknown as NotificationItem[]) || [], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
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
