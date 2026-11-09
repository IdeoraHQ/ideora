import React from 'react';
import { Link } from 'react-router-dom';
import {
  ThumbsUp,
  ArrowUpRight,
  Layers,
  Users,
  Code2,
  Palette,
  Terminal,
  Cpu,
  Sparkles,
  Compass,
} from 'lucide-react';
import type { Idea, SkillCategory } from '@/types';
import { cn } from '@/utils/cn';

export interface IdeaCardProps {
  idea: Idea;
  isUpvoted?: boolean;
  onToggleUpvote?: (ideaId: string, e: React.MouseEvent) => void;
  className?: string;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  isUpvoted = false,
  onToggleUpvote,
  className,
}) => {
  const [isUpvoting, setIsUpvoting] = React.useState(false);

  const handleUpvoteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onToggleUpvote || isUpvoting) return;
    setIsUpvoting(true);
    try {
      await onToggleUpvote(idea.id, e);
    } finally {
      setIsUpvoting(false);
    }
  };
  // Format Collaboration Model readable label
  const formatCollabType = (type: string) => {
    switch (type) {
      case 'co_founder':
        return { label: 'Looking for Co-Founder', icon: Users, style: 'bg-brand-ice text-brand-royal border-brand-pale' };
      case 'contributor':
        return { label: 'Seeking Contributors', icon: Code2, style: 'bg-surface-soft text-typography-navy border-surface-border' };
      case 'open_source':
        return { label: 'Open Source Build', icon: Sparkles, style: 'bg-functional-success-light text-functional-success border-functional-success/30' };
      case 'advisor':
        return { label: 'Advisory & Guidance', icon: Compass, style: 'bg-surface-light text-typography-slate border-surface-border' };
      default:
        return { label: type.replace(/_/g, ' '), icon: Users, style: 'bg-surface-soft text-typography-navy border-surface-border' };
    }
  };

  // Format Status Indicator
  const formatStatus = (status: string) => {
    switch (status) {
      case 'seeking_collaborators':
        return {
          label: 'Seeking Collaborators',
          dotStyle: 'bg-brand-royal animate-pulse',
          badgeStyle: 'bg-brand-ice text-brand-royal border-brand-pale',
        };
      case 'in_progress':
        return {
          label: 'In Development',
          dotStyle: 'bg-functional-warning',
          badgeStyle: 'bg-functional-warning-light text-functional-warning border-functional-warning/30',
        };
      case 'launched':
        return {
          label: 'Active Project',
          dotStyle: 'bg-functional-success',
          badgeStyle: 'bg-functional-success-light text-functional-success border-functional-success/30',
        };
      case 'draft':
        return {
          label: 'Draft Concept',
          dotStyle: 'bg-typography-muted',
          badgeStyle: 'bg-surface-light text-typography-muted border-surface-border',
        };
      default:
        return {
          label: status.replace(/_/g, ' '),
          dotStyle: 'bg-typography-slate',
          badgeStyle: 'bg-surface-soft text-typography-slate border-surface-border',
        };
    }
  };

  // Get icon for role categories
  const getRoleIcon = (category: SkillCategory | string) => {
    switch (category) {
      case 'frontend':
      case 'fullstack':
        return Code2;
      case 'backend':
        return Terminal;
      case 'design':
        return Palette;
      case 'ai':
        return Cpu;
      default:
        return Users;
    }
  };

  const collabConfig = formatCollabType(idea.collaboration_type);
  const statusConfig = formatStatus(idea.status);
  const CollabIcon = collabConfig.icon;

  // Calculate open role seats
  const totalOpenSpots =
    idea.rolesNeeded?.reduce(
      (sum, r) => sum + Math.max(0, r.spots_available - r.spots_filled),
      0
    ) || 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-white p-5 sm:p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-royal/40 hover:shadow-xl hover:shadow-brand-royal/5 min-w-0 overflow-hidden',
        className
      )}
    >
      <div className="min-w-0">
        {/* 1. Header Badges: Category, Collaboration Model & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {/* Category Pill */}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-soft border border-surface-border px-2.5 py-1 text-[11px] font-semibold text-typography-navy">
              <Layers className="h-3 w-3 text-brand-royal" />
              <span>{idea.category}</span>
            </span>

            {/* Collaboration Model */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold',
                collabConfig.style
              )}
            >
              <CollabIcon className="h-3 w-3" />
              <span>{collabConfig.label}</span>
            </span>
          </div>

          {/* Status Indicator with Dot */}
          <span
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border capitalize',
              statusConfig.badgeStyle
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dotStyle)} />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* 2. Main Title & Elevator Summary */}
        <Link to={`/ideas/${idea.slug}`} className="block group/link min-w-0 max-w-full overflow-hidden">
          <h3 className="text-base sm:text-lg font-medium text-typography-navy tracking-tight group-hover/link:text-brand-royal transition-colors flex items-start justify-between gap-2 break-all [word-break:break-all]">
            <span className="min-w-0">{idea.title}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 mt-1 text-typography-muted group-hover/link:text-brand-royal group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all" />
          </h3>
          <p className="mt-2 text-xs sm:text-sm font-normal text-typography-slate leading-relaxed line-clamp-2 break-all [word-break:break-all]">
            {idea.summary}
          </p>
        </Link>

        {/* 3. Open Roles Needed Strip */}
        {idea.rolesNeeded && idea.rolesNeeded.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-surface-border/60 min-w-0">
            <div className="flex items-center justify-between text-[11px] mb-2.5">
              <span className="font-semibold uppercase tracking-wider text-typography-muted flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-brand-royal" />
                Required Roles
              </span>
              <span className="text-[10px] font-semibold text-brand-royal bg-brand-ice px-2 py-0.5 rounded-full border border-brand-pale">
                {totalOpenSpots} {totalOpenSpots === 1 ? 'seat open' : 'seats open'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 min-w-0">
              {idea.rolesNeeded.slice(0, 3).map((role) => {
                const isFull = role.spots_filled >= role.spots_available;
                const RoleIcon = getRoleIcon(role.category);
                return (
                  <span
                    key={role.id}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] transition-colors',
                      isFull
                        ? 'bg-surface-light border-surface-border text-typography-muted line-through'
                        : 'bg-surface-soft border-surface-border text-typography-charcoal font-medium hover:border-brand-pale'
                    )}
                    title={role.description || role.role_title}
                  >
                    <RoleIcon className="h-3 w-3 text-typography-muted shrink-0" />
                    <span className="truncate max-w-[120px]">{role.role_title}</span>
                  </span>
                );
              })}
              {idea.rolesNeeded.length > 3 && (
                <span className="rounded-lg bg-surface-light px-2 py-1 text-[11px] font-medium text-typography-muted">
                  +{idea.rolesNeeded.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* 4. Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {idea.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-md bg-surface-soft px-2 py-0.5 text-[10px] font-normal text-typography-slate border border-surface-border/60"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5. Creator Profile & Engagement Footer */}
      <div className="mt-5 border-t border-surface-border/70 pt-4 flex items-center justify-between gap-3 text-xs min-w-0">
        {/* Creator Info */}
        <Link
          to={idea.author?.username ? `/profile/${idea.author.username}` : '#'}
          className="flex items-center gap-2.5 min-w-0 group/author hover:text-brand-royal transition-colors"
        >
          {idea.author?.avatar_url ? (
            <img
              src={idea.author.avatar_url}
              alt={idea.author.full_name || 'Creator'}
              className="h-7 w-7 shrink-0 rounded-full object-cover border border-surface-border group-hover/author:border-brand-royal"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-ice text-brand-royal font-semibold text-xs border border-brand-pale group-hover/author:border-brand-royal">
              {idea.author?.full_name?.charAt(0).toUpperCase() || 'C'}
            </div>
          )}

          <div className="min-w-0">
            <span className="block text-xs font-semibold text-typography-navy truncate group-hover/author:text-brand-royal">
              {idea.author?.full_name || 'Anonymous Founder'}
            </span>
            <span className="block text-[10px] text-typography-muted truncate">
              @{idea.author?.username || 'builder'} &bull;{' '}
              <span className="capitalize">{idea.author?.role || 'Founder'}</span>
            </span>
          </div>
        </Link>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Interactive Upvote Pill */}
          <button
            type="button"
            disabled={isUpvoting}
            onClick={handleUpvoteClick}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold text-xs transition-all active:scale-95 shadow-2xs',
              isUpvoted
                ? 'bg-brand-royal text-white shadow-brand-royal/20'
                : 'bg-surface-soft text-typography-slate hover:bg-brand-ice hover:text-brand-royal border border-surface-border',
              isUpvoting && 'opacity-60 cursor-not-allowed'
            )}
            title={isUpvoted ? 'You have upvoted this idea' : 'Upvote this idea'}
          >
            <ThumbsUp className={cn('h-3.5 w-3.5', isUpvoted && 'fill-white')} />
            <span>{idea.upvotes_count}</span>
          </button>

          {/* View Workspace / Details Button */}
          <Link
            to={`/ideas/${idea.slug}`}
            className="inline-flex items-center gap-1 rounded-xl bg-brand-ice text-brand-royal hover:bg-brand-pale/60 px-3 py-1.5 text-xs font-semibold border border-brand-royal/20 transition-colors"
          >
            <span>View</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
