import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  FolderGit2,
  Users,
} from 'lucide-react';
import {
  fetchAdminProjectsOverview,
  type AdminProjectOverviewItem,
} from '@/services/api/admin';
import { CustomSelect } from '@/components/common';
import type { ProjectStatus } from '@/types';
import { cn } from '@/utils/cn';

const STATUS_OPTIONS = [
  { label: 'All Project Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
];

const STATUS_BADGE: Record<ProjectStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-brand-ice text-brand-royal border-brand-royal/20',
  archived: 'bg-surface-light text-typography-slate border-surface-border',
};

export const AdminProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<AdminProjectOverviewItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchAdminProjectsOverview();
    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load projects.');
    } else {
      setProjects(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (
        q &&
        !p.title.toLowerCase().includes(q) &&
        !p.owner_username.toLowerCase().includes(q) &&
        !p.owner_full_name.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-typography-navy font-heading tracking-tight">
            Project Oversight
          </h1>
          <p className="text-xs text-typography-slate mt-0.5">
            Privacy-preserving metadata view of active collaborations and project workspaces.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadProjects()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-soft transition-colors disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project title or owner..."
            className="w-full rounded-xl border border-surface-border bg-surface-soft py-2 pl-9 pr-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as ProjectStatus | 'all')}
          options={STATUS_OPTIONS}
          triggerClassName="bg-surface-soft"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-4 text-xs font-semibold text-functional-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-surface-border bg-surface-white p-12 flex items-center justify-center gap-2 text-sm text-typography-slate">
          <Loader2 className="h-5 w-5 animate-spin text-brand-royal" />
          <span>Loading projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-white p-12 text-center">
          <p className="text-sm font-semibold text-typography-navy">
            No projects match your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-surface-border bg-surface-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-royal shrink-0">
                  <FolderGit2 className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize',
                    STATUS_BADGE[project.status]
                  )}
                >
                  {project.status}
                </span>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-typography-navy line-clamp-1">
                  {project.title}
                </h2>
                <p className="text-xs text-typography-muted mt-0.5">
                  Owner: {project.owner_full_name} (@{project.owner_username})
                </p>
              </div>

              <div className="border-t border-surface-border pt-3 flex items-center justify-between text-[11px] text-typography-slate">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Users className="h-3.5 w-3.5 text-brand-royal" />
                  {project.member_count} members
                </span>
                <span>
                  Updated {new Date(project.last_activity_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

