import React from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, ArrowUpRight, Users, ThumbsUp, PlusCircle } from 'lucide-react';
import type { Idea } from '@/types';

interface RecentIdeasProps {
  ideas: Idea[];
  loading?: boolean;
}

export const RecentIdeas: React.FC<RecentIdeasProps> = ({ ideas, loading }) => {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-surface-border/70 pb-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-typography-navy font-heading flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand-royal" />
            <span>Recent Ideas</span>
          </h2>
          <p className="text-xs font-normal text-typography-slate mt-0.5">
            Concepts you have published or saved as drafts
          </p>
        </div>

        <Link
          to="/dashboard?tab=ideas"
          className="text-xs font-semibold text-brand-royal hover:text-brand-deep flex items-center gap-1 transition-colors"
        >
          <span>View all</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-typography-muted">
          Loading your published ideas...
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-8 text-center bg-surface-soft/60">
          <Lightbulb className="mx-auto h-8 w-8 text-typography-muted mb-2.5 opacity-60" />
          <h3 className="text-sm sm:text-base font-medium text-typography-navy">
            No ideas published yet
          </h3>
          <p className="mt-1 text-xs text-typography-slate max-w-sm mx-auto">
            Ready to bring an unfinished concept to life? Publish your idea to start finding co-founders.
          </p>
          <Link
            to="/ideas/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-ice border border-brand-pale px-3.5 py-1.5 text-xs font-semibold text-brand-royal hover:bg-brand-pale/50 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Publish First Idea</span>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-surface-border/60">
          {ideas.slice(0, 3).map((idea) => (
            <div
              key={idea.id}
              className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-md bg-brand-ice px-2 py-0.5 text-[10px] font-semibold text-brand-royal">
                    {idea.category}
                  </span>
                  <span className="rounded-full bg-surface-light px-2 py-0.5 text-[10px] font-medium text-typography-muted capitalize">
                    {idea.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <Link
                  to={`/ideas/${idea.slug}`}
                  className="text-sm sm:text-base font-medium text-typography-navy group-hover:text-brand-royal transition-colors line-clamp-1"
                >
                  {idea.title}
                </Link>
                <p className="text-xs font-normal text-typography-slate line-clamp-1 mt-0.5">
                  {idea.summary}
                </p>

                <div className="flex items-center gap-3 mt-2 text-[11px] text-typography-muted">
                  <span className="flex items-center gap-1" title="Active Collaborators">
                    <Users className="h-3 w-3" />
                    <span>{idea.collaborators_count ?? 0}</span>
                  </span>
                  <span className="flex items-center gap-1" title="Community Upvotes & Likes">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{idea.upvotes_count ?? 0}</span>
                  </span>
                  <span>&bull;</span>
                  <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <Link
                to={`/ideas/${idea.slug}`}
                className="shrink-0 p-2 rounded-lg text-typography-muted hover:text-brand-royal hover:bg-surface-light transition-colors"
                title="View Idea"
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

