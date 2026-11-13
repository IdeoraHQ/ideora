import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Lightbulb,
  FolderGit2,
  Flag,
  ShieldAlert,
  ScrollText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  fetchAdminPlatformStats,
  fetchAdminProjectsOverview,
  fetchRecentAdminAuditLogs,
  fetchAdminOpenReports,
  fetchAdminFlaggedIdeas,
  type AdminProjectOverviewItem,
  type AdminModeratedIdeaSummary,
} from '@/services/api/admin';
import type { AdminAuditLog, AdminPlatformStats, Report } from '@/types';
import { PROJECT_STATUS_META } from '@/utils/projectStatus';
import { cn } from '@/utils/cn';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [projects, setProjects] = useState<AdminProjectOverviewItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [openReports, setOpenReports] = useState<Report[]>([]);
  const [flaggedIdeas, setFlaggedIdeas] = useState<AdminModeratedIdeaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [statsRes, projectsRes, logsRes, reportsRes, flaggedRes] =
      await Promise.all([
        fetchAdminPlatformStats(),
        fetchAdminProjectsOverview(),
        fetchRecentAdminAuditLogs(8),
        fetchAdminOpenReports(5),
        fetchAdminFlaggedIdeas(5),
      ]);

    const firstError =
      statsRes.error ||
      projectsRes.error ||
      logsRes.error ||
      reportsRes.error ||
      flaggedRes.error;

    if (firstError) {
      setError(firstError.message || 'Failed to load administrative overview.');
    }

    setStats(statsRes.data);
    setProjects(projectsRes.data);
    setAuditLogs(logsRes.data);
    setOpenReports(reportsRes.data);
    setFlaggedIdeas(flaggedRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOverviewData();
  }, [loadOverviewData]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-2xl border border-surface-border bg-surface-white p-5 animate-pulse"
            >
              <div className="h-3 w-24 rounded bg-surface-light mb-4" />
              <div className="h-7 w-16 rounded bg-surface-light" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl border border-surface-border bg-surface-white animate-pulse" />
          <div className="h-64 rounded-2xl border border-surface-border bg-surface-white animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-typography-navy font-heading">
            Platform Statistics &amp; Activity
          </h2>
          <p className="text-xs text-typography-slate mt-0.5">
            Live overview of accounts, idea moderation, open reports, project activity, and audit logs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverviewData()}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-surface-border bg-surface-white px-3.5 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5 text-brand-royal" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-functional-error/30 bg-functional-error-light/60 px-4 py-3 text-functional-error">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadOverviewData()}
            className="self-start sm:self-auto rounded-lg bg-surface-white px-3 py-1.5 text-xs font-semibold text-functional-error border border-functional-error/30 hover:bg-surface-soft"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-surface-border bg-surface-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-typography-slate">
                Total Users
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-typography-navy">
              {stats.total_users}
            </p>
            <p className="mt-1 text-[11px] text-typography-slate">
              {stats.active_users} active &bull; {stats.suspended_users} suspended &bull; {stats.banned_users} banned
            </p>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-typography-slate">
                Ideas &amp; Moderation
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
                <Lightbulb className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-typography-navy">
              {stats.published_ideas}
            </p>
            <p className="mt-1 text-[11px] text-typography-slate">
              published &bull; {stats.draft_ideas} drafts &bull; {stats.flagged_or_removed_ideas} flagged/removed
            </p>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-typography-slate">
                Active Projects
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-functional-success-light text-functional-success">
                <FolderGit2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-typography-navy">
              {stats.active_projects}
            </p>
            <p className="mt-1 text-[11px] text-typography-slate">
              of {stats.total_projects} total collaboration projects
            </p>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-typography-slate">
                Open Reports
              </span>
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl',
                  stats.open_reports > 0
                    ? 'bg-functional-warning-light text-functional-warning'
                    : 'bg-surface-light text-typography-muted'
                )}
              >
                <Flag className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-typography-navy">
              {stats.open_reports}
            </p>
            <p className="mt-1 text-[11px] text-typography-slate">
              open or investigating &bull; {stats.admin_users} admins
            </p>
          </div>
        </div>
      )}

      {/* Moderation & Reports Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Reports Summary */}
        <section className="rounded-2xl border border-surface-border bg-surface-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-brand-royal" />
              <h3 className="text-sm font-semibold text-typography-navy">
                Reports Queue Summary
              </h3>
            </div>
            <span className="text-[11px] font-medium text-typography-muted">
              Latest {openReports.length}
            </span>
          </div>

          {openReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl bg-surface-soft border border-surface-border/60">
              <CheckCircle2 className="h-6 w-6 text-functional-success mb-2" />
              <p className="text-xs font-semibold text-typography-navy">
                No open reports
              </p>
              <p className="text-[11px] text-typography-slate mt-0.5">
                User-submitted complaints requiring investigation will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {openReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-surface-border/70 bg-surface-soft p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-functional-warning-light text-functional-warning">
                        {report.status}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-typography-muted">
                        {report.target_type}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-typography-navy mt-1.5 truncate">
                      {report.reason}
                    </p>
                    <p className="text-[11px] text-typography-slate mt-0.5">
                      Reported by @{report.reporter?.username || 'user'}
                    </p>
                  </div>
                  <span className="text-[11px] text-typography-muted shrink-0">
                    {formatDate(report.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Idea Moderation Summary */}
        <section className="rounded-2xl border border-surface-border bg-surface-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-brand-royal" />
              <h3 className="text-sm font-semibold text-typography-navy">
                Idea Moderation Summary
              </h3>
            </div>
            <span className="text-[11px] font-medium text-typography-muted">
              Non-approved ({flaggedIdeas.length})
            </span>
          </div>

          {flaggedIdeas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl bg-surface-soft border border-surface-border/60">
              <CheckCircle2 className="h-6 w-6 text-functional-success mb-2" />
              <p className="text-xs font-semibold text-typography-navy">
                Moderation queue clear
              </p>
              <p className="text-[11px] text-typography-slate mt-0.5">
                All active ideas currently have approved moderation status.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {flaggedIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-surface-border/70 bg-surface-soft p-3"
                >
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-functional-error-light text-functional-error">
                      {idea.moderation_status.replace('_', ' ')}
                    </span>
                    <p className="text-xs font-semibold text-typography-navy mt-1.5 truncate">
                      {idea.title}
                    </p>
                    <p className="text-[11px] text-typography-slate truncate mt-0.5">
                      by @{idea.creator?.username || 'creator'}
                      {idea.moderation_reason ? ` — ${idea.moderation_reason}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-typography-muted shrink-0">
                    {formatDate(idea.updated_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Project Oversight (Metadata-only via admin_list_projects RPC) & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-surface-border bg-surface-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-brand-royal" />
              <h3 className="text-sm font-semibold text-typography-navy">
                Project Oversight (Metadata)
              </h3>
            </div>
            <span className="text-[11px] font-medium text-typography-muted">
              {projects.length} total
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl bg-surface-soft border border-surface-border/60">
              <FolderGit2 className="h-6 w-6 text-typography-muted mb-2" />
              <p className="text-xs font-semibold text-typography-navy">
                No collaboration projects yet
              </p>
              <p className="text-[11px] text-typography-slate mt-0.5">
                Projects appear once collaboration requests are accepted.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {projects.slice(0, 6).map((project) => {
                const statusMeta =
                  PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.active;
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-surface-border/70 bg-surface-soft p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-typography-navy truncate">
                        {project.title}
                      </p>
                      <p className="text-[11px] text-typography-slate truncate mt-0.5">
                        Owner: @{project.owner_username} &bull; {project.member_count}{' '}
                        {Number(project.member_count) === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          statusMeta.badgeClass
                        )}
                      >
                        {statusMeta.label}
                      </span>
                      <span className="text-[10px] text-typography-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(project.last_activity_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Administrative Activity */}
        <section className="rounded-2xl border border-surface-border bg-surface-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-brand-royal" />
              <h3 className="text-sm font-semibold text-typography-navy">
                Recent Administrative Activity
              </h3>
            </div>
            <span className="text-[11px] font-medium text-typography-muted">
              Append-only log
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl bg-surface-soft border border-surface-border/60">
              <ScrollText className="h-6 w-6 text-typography-muted mb-2" />
              <p className="text-xs font-semibold text-typography-navy">
                No administrative actions recorded yet
              </p>
              <p className="text-[11px] text-typography-slate mt-0.5">
                Role updates, suspensions, moderation decisions, and report resolutions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-surface-border/70 bg-surface-soft p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-ice text-brand-royal">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-medium text-typography-muted uppercase">
                        {log.target_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-typography-charcoal mt-1.5">
                      Actor:{' '}
                      <span className="font-semibold">
                        {log.actor_type === 'system'
                          ? 'System'
                          : `@${log.admin?.username || 'admin'}`}
                      </span>
                      {log.reason ? ` — ${log.reason}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-typography-muted shrink-0">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

