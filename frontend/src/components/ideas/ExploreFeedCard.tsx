import React from 'react';
import { Link } from 'react-router-dom';
import {
  ThumbsUp,
  MessageSquare,
  ArrowUpRight,
  Users,
  Code2,
  Sparkles,
  Compass,
  Briefcase,
} from 'lucide-react';
import type { Idea } from '@/types';
import { cn } from '@/utils/cn';

export interface ExploreFeedCardProps {
  idea: Idea;
  isUpvoted?: boolean;
  isAuthorOnline?: boolean;
  onToggleUpvote?: (ideaId: string, e: React.MouseEvent) => void;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getCollabMeta(type: string) {
  switch (type) {
    case 'co_founder':
      return {
        label: 'Open for Co-Founder',
        icon: Users,
        style: 'bg-brand-ice text-brand-royal border-brand-pale',
      };
    case 'contributor':
      return {
        label: 'Seeking Contributors',
        icon: Code2,
        style: 'bg-surface-soft text-typography-navy border-surface-border',
      };
    case 'open_source':
      return {
        label: 'Open Source',
        icon: Sparkles,
        style:
          'bg-functional-success-light text-functional-success border-functional-success/30',
      };
    case 'advisor':
      return {
        label: 'Advisory',
        icon: Compass,
        style: 'bg-surface-light text-typography-slate border-surface-border',
      };
    default:
      return {
        label: type.replace(/_/g, ' '),
        icon: Users,
        style: 'bg-surface-soft text-typography-navy border-surface-border',
      };
  }
}

function getStatusMeta(status: string) {
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
        badgeStyle:
          'bg-functional-warning-light text-functional-warning border-functional-warning/30',
      };
    case 'launched':
      return {
        label: 'Active Project',
        dotStyle: 'bg-functional-success',
        badgeStyle:
          'bg-functional-success-light text-functional-success border-functional-success/30',
      };
    default:
      return {
        label: status.replace(/_/g, ' '),
        dotStyle: 'bg-typography-slate',
        badgeStyle: 'bg-surface-soft text-typography-slate border-surface-border',
      };
  }
}

export const ExploreFeedCard: React.FC<ExploreFeedCardProps> = ({
  idea,
  isUpvoted = false,
  isAuthorOnline = false,
  onToggleUpvote,
  className,
}) => {
  const [isUpvoting, setIsUpvoting] = React.useState(false);

  const collabMeta = getCollabMeta(idea.collaboration_type);
  const CollabIcon = collabMeta.icon;
  const statusMeta = getStatusMeta(idea.status);

  const authorName = idea.author?.full_name || idea.author?.username || 'Builder';
  const authorUsername = idea.author?.username;
  const authorInitials = authorName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roles = idea.rolesNeeded || [];
  const visibleRoles = roles.slice(0, 3);
  const extraRolesCount = Math.max(0, roles.length - 3);
  const visibleTags = (idea.tags || []).slice(0, 4);

  const handleUpvoteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onToggleUpvote || isUpvoting) return;
    setIsUpvoting(true);
    try {
      await onToggleUpvote(idea.id, e);
    } finally {
      setIsUpvoting(false);
    }
  };

  return (
    <article
      className={cn(
        'group rounded-2xl border border-surface-border bg-surface-white p-4 sm:p-6 shadow-2xs transition-all duration-200 hover:border-brand-pale hover:shadow-md',
        className
      )}
    >
      {/* Top Bar: Badges + Author + Primary CTA */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="inline-flex items-center rounded-lg border border-surface-border bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-typography-navy">
            {idea.category}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium',
              collabMeta.style
            )}
          >
            <CollabIcon className="h-3 w-3" />
            {collabMeta.label}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium',
              statusMeta.badgeStyle
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dotStyle)} />
            {statusMeta.label}
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto shrink-0">
          <Link
            to={authorUsername ? `/profile/${authorUsername}` : `/ideas/${idea.slug}`}
            className="flex items-center gap-2 rounded-full pr-1 transition-opacity hover:opacity-85 min-w-0"
            title={isAuthorOnline ? `${authorName} is online now` : authorName}
          >
            <div className="relative h-7 w-7 shrink-0">
              {idea.author?.avatar_url ? (
                <img
                  src={idea.author.avatar_url}
                  alt={authorName}
                  className="h-7 w-7 rounded-full object-cover border border-surface-border"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-ice text-[10px] font-semibold text-brand-royal border border-brand-pale">
                  {authorInitials}
                </div>
              )}
              {isAuthorOnline && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-white"
                  aria-label="Online now"
                />
              )}
            </div>
            <div className="text-left leading-tight min-w-0">
              <span className="block text-xs font-medium text-typography-navy max-w-[140px] sm:max-w-[120px] truncate">
                {authorName}
              </span>
              <span className="block text-[10px] text-typography-muted">
                {isAuthorOnline ? 'Online now' : formatRelativeTime(idea.created_at)}
              </span>
            </div>
          </Link>

          <Link
            to={`/ideas/${idea.slug}`}
            className="inline-flex items-center justify-center rounded-xl bg-brand-royal px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep active:scale-95 transition-all shrink-0"
          >
            Ask to Join
          </Link>
        </div>
      </div>

      {/* Title + Summary */}
      <Link to={`/ideas/${idea.slug}`} className="mt-4 block group/title">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-typography-navy group-hover/title:text-brand-royal transition-colors leading-snug">
            {idea.title}
          </h2>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-typography-muted group-hover/title:text-brand-royal group-hover/title:translate-x-0.5 group-hover/title:-translate-y-0.5 transition-transform mt-1" />
        </div>
        <p className="mt-2 text-sm text-typography-slate line-clamp-2 leading-relaxed">
          {idea.summary}
        </p>
      </Link>

      {/* Required Roles */}
      {visibleRoles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-typography-muted">
            <Briefcase className="h-3.5 w-3.5 text-brand-royal" />
            <span>Required Roles</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {visibleRoles.map((role) => {
              const openSpots = Math.max(
                0,
                (role.spots_available ?? 1) - (role.spots_filled ?? 0)
              );
              return (
                <Link
                  key={role.id}
                  to={`/ideas/${idea.slug}`}
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-surface-border bg-surface-soft/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs text-typography-navy hover:border-brand-pale hover:bg-brand-ice/40 transition-colors"
                >
                  <span className="font-medium">{role.role_title}</span>
                  {openSpots > 1 && (
                    <span className="rounded-md bg-surface-white px-1.5 py-0.5 text-[10px] font-semibold text-typography-slate border border-surface-border">
                      {openSpots} spots
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-brand-royal">
                    Apply
                  </span>
                </Link>
              );
            })}
            {extraRolesCount > 0 && (
              <Link
                to={`/ideas/${idea.slug}`}
                className="text-xs font-medium text-brand-royal hover:underline px-1"
              >
                +{extraRolesCount} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {visibleTags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg border border-surface-border/80 bg-surface-light px-2 py-0.5 text-[11px] font-medium text-typography-slate"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-t border-surface-border/70 pt-3.5 text-xs">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={handleUpvoteClick}
            disabled={isUpvoting}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors',
              isUpvoted
                ? 'bg-brand-ice text-brand-royal border border-brand-pale'
                : 'text-typography-slate hover:bg-surface-soft hover:text-typography-navy'
            )}
          >
            <ThumbsUp className={cn('h-3.5 w-3.5', isUpvoted && 'fill-current')} />
            <span>{idea.upvotes_count ?? 0}</span>
            <span className="hidden sm:inline">Upvotes</span>
          </button>

          <Link
            to={`/ideas/${idea.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-typography-slate hover:bg-surface-soft hover:text-typography-navy transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            <span>{roles.length}</span>
            <span className="hidden sm:inline">
              {roles.length === 1 ? 'Open Role' : 'Open Roles'}
            </span>
          </Link>

          <Link
            to={`/ideas/${idea.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-typography-slate hover:bg-surface-soft hover:text-typography-navy transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Discuss</span>
          </Link>
        </div>

        <Link
          to={`/ideas/${idea.slug}`}
          className="text-xs font-semibold text-brand-royal hover:underline inline-flex items-center gap-1"
        >
          <span>View Workspace</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
};

