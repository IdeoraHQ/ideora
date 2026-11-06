import React from 'react';
import type { Idea } from '@/types';
import { Users, ThumbsUp, ArrowUpRight } from 'lucide-react';

interface IdeaCardProps {
  idea: Idea;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({ idea }) => {
  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm transition-all hover:border-brand-light hover:shadow-lg hover:shadow-brand-royal/5">
      <div>
        {/* Header Tags & Status */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {idea.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-surface-light px-2.5 py-1 text-xs font-semibold text-typography-slate"
              >
                #{tag}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center rounded-full bg-brand-ice px-3 py-1 text-xs font-bold text-brand-royal border border-brand-pale">
            {idea.status.replace('_', ' ')}
          </span>
        </div>

        {/* Title and summary */}
        <h3 className="mt-4 text-lg font-bold text-typography-navy group-hover:text-brand-royal transition-colors flex items-center justify-between">
          <span>{idea.title}</span>
          <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-brand-royal" />
        </h3>
        <p className="mt-2 text-sm text-typography-slate leading-relaxed">
          {idea.summary}
        </p>

        {/* Roles Needed */}
        {idea.rolesNeeded && idea.rolesNeeded.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-typography-muted">
              Roles Needed
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {idea.rolesNeeded.map((role) => (
                <span
                  key={role.id}
                  className="rounded-lg bg-brand-ice border border-brand-pale px-2.5 py-1 text-xs font-semibold text-brand-royal"
                >
                  {role.role_title} ({role.spots_filled}/{role.spots_available})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Meta Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-surface-border pt-4 text-xs text-typography-slate">
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-brand-light" />
            {idea.collaborators_count} collaborators
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5 text-brand-light" />
            {idea.upvotes_count}
          </span>
        </div>
        <span className="text-typography-muted font-medium">
          by {idea.author?.full_name || 'Anonymous'}
        </span>
      </div>
    </div>
  );
};
