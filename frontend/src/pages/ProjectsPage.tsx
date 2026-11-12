import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Lightbulb,
  Users,
  Clock,
  ArrowRight,
  Compass,
  AlertCircle,
  RotateCw,
  Crown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchUserProjects } from '@/services/api';
import type { Project, ProjectStatus } from '@/types';
import { PROJECT_STATUS_META } from '@/utils/projectStatus';

type FilterStatus = 'all' | ProjectStatus;

export const ProjectsPage: React.FC = () => {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchUserProjects();
    if (fetchError) {
      setError(fetchError.message || 'Unable to load your projects right now.');
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      void loadProjects();
    }
  }, [authLoading, loadProjects]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects;
    return projects.filter((project) => project.status === statusFilter);
  }, [projects, statusFilter]);

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 space-y-6">
        <div className="h-24 rounded-2xl bg-surface-white border border-surface-border animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-surface-white border border-surface-border animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="max-w-2xl mx-auto my-12 text-center">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-10 shadow-sm">
          <FolderGit2 className="mx-auto h-10 w-10 text-brand-royal mb-4" />
          <h1 className="text-2xl font-light text-typography-navy font-heading">
            Sign in to access Projects
          </h1>
          <p className="mt-2 text-sm text-typography-slate">
            Your active project workspaces are private to owners and accepted collaborators.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep transition-all"
          >
            Sign In / Register
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-typography-navy font-heading tracking-tight">
            Projects
          </h1>
          <p className="mt-1.5 text-sm text-typography-slate max-w-2xl">
            Manage your active collaborations. Ideas automatically transition into shared project
            workspaces once a collaboration request is accepted.
          </p>
        </div>

        <Link
          to="/explore"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:border-brand-light hover:text-brand-royal transition-colors shrink-0"
        >
          <Compass className="h-4 w-4 text-brand-royal" />
          <span>Discover Ideas</span>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      {!loading && !error && projects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { key: 'all', label: `All (${projects.length})` },
              {
                key: 'active',
                label: `Active (${projects.filter((p) => p.status === 'active').length})`,
              },
              {
                key: 'paused',
                label: `Paused (${projects.filter((p) => p.status === 'paused').length})`,
              },
              {
                key: 'completed',
                label: `Completed (${projects.filter((p) => p.status === 'completed').length})`,
              },
              {
                key: 'archived',
                label: `Archived (${projects.filter((p) => p.status === 'archived').length})`,
              },
            ] as Array<{ key: FilterStatus; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? 'bg-brand-royal text-white shadow-xs'
                  : 'bg-surface-white text-typography-slate border border-surface-border hover:text-typography-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-surface-border bg-surface-white p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 rounded-full bg-surface-light" />
                <div className="h-4 w-24 rounded bg-surface-light" />
              </div>
              <div className="h-6 w-3/4 rounded bg-surface-light" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-surface-light" />
                <div className="h-4 w-5/6 rounded bg-surface-light" />
              </div>
              <div className="pt-4 border-t border-surface-border flex items-center justify-between">
                <div className="h-7 w-28 rounded-lg bg-surface-light" />
                <div className="h-7 w-24 rounded-lg bg-surface-light" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="rounded-2xl border border-functional-error/30 bg-surface-white p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-functional-error mb-3" />
          <h2 className="text-lg font-medium text-typography-navy">
            Could not load projects
          </h2>
          <p className="mt-1 text-sm text-typography-slate max-w-md mx-auto">
            {error}
          </p>
          <button
            type="button"
            onClick={loadProjects}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-surface-border bg-surface-white p-10 sm:p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-4">
            <FolderGit2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-light text-typography-navy font-heading">
            No active projects yet
          </h2>
          <p className="mt-2 text-sm text-typography-slate max-w-lg mx-auto leading-relaxed">
            Projects are created automatically when an idea owner accepts a collaboration
            request. Explore open ideas to join a team, or review incoming requests on your own
            ideas.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/explore"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep transition-colors"
            >
              <Compass className="h-4 w-4" />
              Explore Open Ideas
            </Link>
            <Link
              to="/dashboard?tab=incoming"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-5 py-2.5 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
            >
              <Users className="h-4 w-4 text-brand-royal" />
              Review Collaboration Requests
            </Link>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Empty Filtered State */
        <div className="rounded-2xl border border-surface-border bg-surface-white p-10 text-center">
          <p className="text-sm font-medium text-typography-navy">
            No projects match the "{statusFilter}" filter.
          </p>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="mt-3 text-xs font-semibold text-brand-royal hover:underline"
          >
            Show all projects
          </button>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const statusMeta = PROJECT_STATUS_META[project.status];
            const isOwner = project.owner_id === profile.id;
            const collaborators = (project.members || []).filter(
              (m) => m.member_role !== 'owner'
            );
            const totalMembers = Math.max(1, (project.members || []).length);

            return (
              <div
                key={project.id}
                className="flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-white p-5 sm:p-6 shadow-sm hover:border-brand-light transition-colors"
              >
                <div>
                  {/* Top Meta Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                      {statusMeta.label}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-typography-muted">
                      {isOwner ? (
                        <>
                          <Crown className="h-3 w-3 text-brand-royal" />
                          <span className="text-brand-royal font-semibold">Owner</span>
                        </>
                      ) : (
                        <>
                          <Users className="h-3 w-3" />
                          <span>Collaborator</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <Link
                    to={`/projects/${project.id}`}
                    className="group block"
                  >
                    <h2 className="text-base sm:text-lg font-medium text-typography-navy group-hover:text-brand-royal transition-colors line-clamp-2">
                      {project.title}
                    </h2>
                  </Link>
                  <p className="mt-2 text-xs sm:text-sm text-typography-slate line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Originating Idea Reference */}
                  {project.idea && (
                    <div className="mt-4 rounded-xl border border-surface-border/70 bg-surface-soft px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-typography-muted block">
                        Originating Idea
                      </span>
                      <Link
                        to={`/ideas/${project.idea.slug}`}
                        className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-typography-navy hover:text-brand-royal transition-colors max-w-full"
                      >
                        <Lightbulb className="h-3.5 w-3.5 text-brand-royal shrink-0" />
                        <span className="truncate">{project.idea.title}</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Footer: Owner, Collaborators & Activity */}
                <div className="mt-5 pt-4 border-t border-surface-border space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {/* Owner */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-ice text-brand-royal text-xs font-bold overflow-hidden">
                        {project.owner?.avatar_url ? (
                          <img
                            src={project.owner.avatar_url}
                            alt={project.owner.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          project.owner?.full_name?.charAt(0).toUpperCase() || 'O'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-typography-navy truncate">
                          {project.owner?.full_name || 'Project Owner'}
                        </p>
                        <p className="text-[10px] text-typography-muted truncate">
                          @{project.owner?.username || 'owner'}
                        </p>
                      </div>
                    </div>

                    {/* Team Count */}
                    <div
                      className="inline-flex items-center gap-1.5 rounded-lg bg-surface-soft border border-surface-border px-2.5 py-1 text-[11px] font-medium text-typography-slate shrink-0"
                      title={`${totalMembers} total team members (${collaborators.length} collaborators)`}
                    >
                      <Users className="h-3.5 w-3.5 text-brand-royal" />
                      <span>
                        {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-typography-muted">
                      <Clock className="h-3 w-3" />
                      Updated{' '}
                      {new Date(project.last_activity_at || project.updated_at).toLocaleDateString(
                        undefined,
                        { month: 'short', day: 'numeric', year: 'numeric' }
                      )}
                    </span>

                    <Link
                      to={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-royal hover:text-brand-deep transition-colors"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

