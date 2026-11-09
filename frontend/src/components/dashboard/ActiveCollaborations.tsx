import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, ArrowUpRight, FolderGit2 } from 'lucide-react';
import type { CollaborationRequest } from '@/types';

interface ActiveCollaborationsProps {
  collaborations: CollaborationRequest[];
  loading?: boolean;
}

export const ActiveCollaborations: React.FC<ActiveCollaborationsProps> = ({
  collaborations,
  loading,
}) => {
  const activeCollabs = collaborations.filter((c) => c.status === 'accepted');

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-surface-border/70 pb-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-typography-navy font-heading flex items-center gap-2">
            <Users className="h-5 w-5 text-functional-success" />
            <span>Active Collaborations</span>
          </h2>
          <p className="text-xs font-normal text-typography-slate mt-0.5">
            Teams and ideas you have officially joined
          </p>
        </div>

        <Link
          to="/dashboard?tab=sent"
          className="text-xs font-semibold text-brand-royal hover:text-brand-deep flex items-center gap-1 transition-colors"
        >
          <span>View all</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-typography-muted">
          Loading collaborations...
        </div>
      ) : activeCollabs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-6 text-center bg-surface-soft/60">
          <FolderGit2 className="mx-auto h-7 w-7 text-typography-muted mb-2 opacity-60" />
          <h3 className="text-sm font-medium text-typography-navy">
            No active collaborations yet
          </h3>
          <p className="text-[11px] text-typography-slate mt-0.5 max-w-xs mx-auto">
            Browse open roles on Explore and submit an application to join a build team.
          </p>
          <Link
            to="/explore"
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-surface-white border border-surface-border px-3 py-1 text-xs font-semibold text-brand-royal hover:border-brand-pale transition-colors"
          >
            Explore Open Roles &rarr;
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-surface-border/60">
          {activeCollabs.slice(0, 3).map((collab) => (
            <div
              key={collab.id}
              className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0">
                <Link
                  to={`/ideas/${collab.idea?.slug || ''}`}
                  className="text-xs sm:text-sm font-medium text-typography-navy group-hover:text-brand-royal transition-colors truncate block"
                >
                  {collab.idea?.title || 'Collaboration Project'}
                </Link>
                <div className="flex items-center gap-2 text-[11px] text-typography-slate mt-0.5">
                  <span className="font-medium text-functional-success">
                    {collab.role?.role_title || 'Active Contributor'}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-typography-muted">
                    <Clock className="h-3 w-3" />
                    Joined {new Date(collab.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Link
                to={`/ideas/${collab.idea?.slug || ''}`}
                className="shrink-0 p-2 rounded-lg text-typography-muted hover:text-brand-royal hover:bg-surface-light transition-colors"
                title="Open Idea Workspace"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

