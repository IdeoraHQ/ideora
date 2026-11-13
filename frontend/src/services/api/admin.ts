import { supabase } from '@/services/supabase/client';
import type {
  AdminAuditLog,
  AdminPlatformStats,
  IdeaModerationStatus,
  ProjectStatus,
  Report,
} from '@/types';

export interface AdminProjectOverviewItem {
  id: string;
  idea_id: string;
  owner_id: string;
  owner_username: string;
  owner_full_name: string;
  title: string;
  status: ProjectStatus;
  member_count: number;
  created_at: string;
  last_activity_at: string;
}

export interface AdminModeratedIdeaSummary {
  id: string;
  title: string;
  slug: string;
  moderation_status: IdeaModerationStatus;
  moderation_reason: string | null;
  updated_at: string;
  creator?: {
    id: string;
    username: string;
    full_name: string;
  } | null;
}

/**
 * Fetch aggregate platform metrics from `admin_get_platform_stats` RPC
 */
export async function fetchAdminPlatformStats(): Promise<{
  data: AdminPlatformStats | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_get_platform_stats');
    if (error) throw error;
    return { data: data as unknown as AdminPlatformStats, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch privacy-preserving project metadata from `admin_list_projects` RPC
 */
export async function fetchAdminProjectsOverview(): Promise<{
  data: AdminProjectOverviewItem[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_list_projects');
    if (error) throw error;
    return {
      data: (data as AdminProjectOverviewItem[] | null) || [],
      error: null,
    };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Fetch recent administrative and system audit log entries
 */
export async function fetchRecentAdminAuditLogs(limit = 10): Promise<{
  data: AdminAuditLog[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select(
        `
        *,
        admin:profiles!admin_audit_logs_admin_id_fkey(id, username, full_name, avatar_url)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: (data as unknown as AdminAuditLog[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Fetch open or investigating reports for admin overview
 */
export async function fetchAdminOpenReports(limit = 5): Promise<{
  data: Report[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select(
        `
        *,
        reporter:profiles!reports_reporter_id_fkey(id, username, full_name, avatar_url)
      `
      )
      .in('status', ['open', 'investigating'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: (data as unknown as Report[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Fetch non-approved / moderation-flagged ideas summary for overview
 */
export async function fetchAdminFlaggedIdeas(limit = 5): Promise<{
  data: AdminModeratedIdeaSummary[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('ideas')
      .select(
        `
        id,
        title,
        slug,
        moderation_status,
        moderation_reason,
        updated_at,
        creator:profiles!ideas_creator_id_fkey(id, username, full_name)
      `
      )
      .neq('moderation_status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return {
      data: (data as unknown as AdminModeratedIdeaSummary[]) || [],
      error: null,
    };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

