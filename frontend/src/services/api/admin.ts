import { supabase } from '@/services/supabase/client';
import type {
  AccountStatus,
  AdminAuditLog,
  AdminPlatformStats,
  IdeaModerationHistoryItem,
  IdeaModerationStatus,
  IdeaStatus,
  Json,
  PlatformSetting,
  ProjectStatus,
  Report,
  ReportStatus,
  ReportTargetType,
  UserRole,
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

export interface AdminUserItem {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  role: UserRole;
  created_at: string;
  updated_at: string;
  security_status?: {
    account_status: AccountStatus;
    status_reason: string | null;
    suspended_until: string | null;
    updated_at: string;
  } | null;
}

export interface AdminIdeaItem {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  status: IdeaStatus;
  moderation_status: IdeaModerationStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  deleted_at: string | null;
  upvotes_count: number;
  collaborators_count: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
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
 * Fetch paginated/filtered audit logs for the Audit Logs page
 */
export async function fetchAdminAuditLogs(filters?: {
  actorType?: 'admin' | 'system' | 'all';
  targetType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AdminAuditLog[]; error: Error | null }> {
  try {
    let query = supabase
      .from('admin_audit_logs')
      .select(
        `
        *,
        admin:profiles!admin_audit_logs_admin_id_fkey(id, username, full_name, avatar_url)
      `
      )
      .order('created_at', { ascending: false });

    if (filters?.actorType && filters.actorType !== 'all') {
      query = query.eq('actor_type', filters.actorType);
    }
    if (filters?.targetType && filters.targetType !== 'all') {
      query = query.eq('target_type', filters.targetType);
    }

    const limit = filters?.limit ?? 30;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
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
 * Fetch all reports with optional status/target_type filters and pagination
 */
export async function fetchAdminReports(filters?: {
  status?: ReportStatus | 'all';
  targetType?: ReportTargetType | 'all';
  limit?: number;
  offset?: number;
}): Promise<{ data: Report[]; error: Error | null }> {
  try {
    let query = supabase
      .from('reports')
      .select(
        `
        *,
        reporter:profiles!reports_reporter_id_fkey(id, username, full_name, avatar_url),
        resolver:profiles!reports_resolved_by_fkey(id, username, full_name, avatar_url)
      `
      )
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.targetType && filters.targetType !== 'all') {
      query = query.eq('target_type', filters.targetType);
    }

    const limit = filters?.limit ?? 30;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data as unknown as Report[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Resolve or update a user report via `admin_resolve_report` RPC
 */
export async function adminResolveReport(params: {
  reportId: string;
  newStatus: ReportStatus;
  resolutionNotes?: string;
}): Promise<{ data: Report | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('admin_resolve_report', {
      p_report_id: params.reportId,
      p_new_status: params.newStatus,
      p_resolution_notes: params.resolutionNotes?.trim() || null,
    });
    if (error) throw error;
    return { data: data as unknown as Report, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
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

/**
 * Fetch users with security status for User Management
 */
export async function fetchAdminUsers(filters?: {
  search?: string;
  role?: UserRole | 'all';
  limit?: number;
  offset?: number;
}): Promise<{ data: AdminUserItem[]; error: Error | null }> {
  try {
    let query = supabase
      .from('profiles')
      .select(
        `
        id,
        username,
        full_name,
        avatar_url,
        bio,
        skills,
        role,
        created_at,
        updated_at,
        security_status:profile_security_status!profile_security_status_user_id_fkey(account_status, status_reason, suspended_until, updated_at)
      `
      )
      .order('created_at', { ascending: false });

    if (filters?.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }

    const search = filters?.search?.trim();
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }

    const limit = filters?.limit ?? 30;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data as unknown as AdminUserItem[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Update a user's role via `admin_update_user_role` RPC
 */
export async function adminUpdateUserRole(params: {
  targetUserId: string;
  newRole: UserRole;
  reason?: string;
}): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('admin_update_user_role', {
      p_target_user_id: params.targetUserId,
      p_new_role: params.newRole,
      p_reason: params.reason?.trim() || null,
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Update a user's account status via `admin_update_user_status` RPC
 */
export async function adminUpdateUserStatus(params: {
  targetUserId: string;
  newStatus: AccountStatus;
  reason?: string;
  suspendedUntil?: string | null;
}): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('admin_update_user_status', {
      p_target_user_id: params.targetUserId,
      p_new_status: params.newStatus,
      p_reason: params.reason?.trim() || null,
      p_suspended_until: params.suspendedUntil || null,
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Fetch ideas for Idea Moderation page
 */
export async function fetchAdminIdeas(filters?: {
  search?: string;
  moderationStatus?: IdeaModerationStatus | 'all';
  limit?: number;
  offset?: number;
}): Promise<{ data: AdminIdeaItem[]; error: Error | null }> {
  try {
    let query = supabase
      .from('ideas')
      .select(
        `
        id,
        creator_id,
        title,
        slug,
        summary,
        description,
        category,
        status,
        moderation_status,
        moderation_reason,
        moderated_at,
        deleted_at,
        upvotes_count,
        collaborators_count,
        created_at,
        updated_at,
        creator:profiles!ideas_creator_id_fkey(id, username, full_name, avatar_url)
      `
      )
      .order('created_at', { ascending: false });

    if (filters?.moderationStatus && filters.moderationStatus !== 'all') {
      query = query.eq('moderation_status', filters.moderationStatus);
    }

    const search = filters?.search?.trim();
    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    const limit = filters?.limit ?? 30;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data as unknown as AdminIdeaItem[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Fetch moderation history for a specific idea
 */
export async function fetchIdeaModerationHistory(ideaId: string): Promise<{
  data: IdeaModerationHistoryItem[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('idea_moderation_history')
      .select(
        `
        *,
        admin:profiles!idea_moderation_history_admin_id_fkey(id, username, full_name, avatar_url)
      `
      )
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return {
      data: (data as unknown as IdeaModerationHistoryItem[]) || [],
      error: null,
    };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Moderate an idea via `admin_moderate_idea` RPC
 */
export async function adminModerateIdea(params: {
  ideaId: string;
  moderationStatus: IdeaModerationStatus;
  reason?: string;
}): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('admin_moderate_idea', {
      p_idea_id: params.ideaId,
      p_moderation_status: params.moderationStatus,
      p_reason: params.reason?.trim() || null,
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Fetch platform settings (admin-only via RLS)
 */
export async function fetchAdminPlatformSettings(): Promise<{
  data: PlatformSetting[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('key', { ascending: true });
    if (error) throw error;
    return { data: (data as PlatformSetting[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Update a platform setting via `admin_update_platform_setting` RPC
 */
export async function adminUpdatePlatformSetting(params: {
  key: string;
  value: Json;
  reason?: string;
}): Promise<{ data: PlatformSetting | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('admin_update_platform_setting', {
      p_key: params.key,
      p_value: params.value,
      p_reason: params.reason?.trim() || null,
    });
    if (error) throw error;
    return { data: data as PlatformSetting, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
