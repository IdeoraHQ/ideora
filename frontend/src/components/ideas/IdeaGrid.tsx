import React from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { IdeaCard } from './IdeaCard';
import type { Idea } from '@/types';

interface IdeaGridProps {
  ideas: Idea[];
  loading?: boolean;
  upvotedIds?: string[];
  onToggleUpvote?: (ideaId: string, e: React.MouseEvent) => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
}

export const IdeaGrid: React.FC<IdeaGridProps> = ({
  ideas,
  loading,
  upvotedIds = [],
  onToggleUpvote,
  onResetFilters,
  hasActiveFilters,
}) => {
  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Sparkles className="mx-auto h-7 w-7 animate-spin text-brand-royal" />
        <p className="text-xs font-semibold text-typography-slate">
          Loading discovery ideas...
        </p>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-white p-12 text-center shadow-sm">
        <Sparkles className="mx-auto h-8 w-8 text-typography-muted mb-3 opacity-60" />
        <h3 className="text-base sm:text-lg font-medium text-typography-navy font-heading">
          No matching ideas found
        </h3>
        <p className="mt-1 text-xs font-normal text-typography-slate max-w-sm mx-auto leading-relaxed">
          We couldn&apos;t find any ideas matching your current search query or filter settings. Try adjusting your parameters or resetting filters.
        </p>

        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-ice border border-brand-pale px-4 py-2 text-xs font-semibold text-brand-royal hover:bg-brand-pale/50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          isUpvoted={upvotedIds.includes(idea.id)}
          onToggleUpvote={onToggleUpvote}
        />
      ))}
    </div>
  );
};

