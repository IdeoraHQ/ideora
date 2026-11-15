import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, ArrowRight } from 'lucide-react';
import type { DiscoverablePerson } from '@/types';
import type { RecentIdeaDiscussion } from '@/services/api/ideas';
import { cn } from '@/utils/cn';

interface ExploreCommunitySidebarProps {
  contributors: DiscoverablePerson[];
  discussions: RecentIdeaDiscussion[];
  loading: boolean;
  isUserOnline: (userId?: string | null) => boolean;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const ExploreCommunitySidebar: React.FC<ExploreCommunitySidebarProps> = ({
  contributors,
  discussions,
  loading,
  isUserOnline,
  className,
}) => {
  const stripContributors = contributors.slice(0, 7);
  const featuredContributors = contributors.slice(0, 4);

  return (
    <aside className={cn('space-y-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-typography-navy font-heading tracking-tight">
          Community Feed
        </h2>
        <Link
          to="/people"
          className="text-xs font-medium text-brand-royal hover:underline inline-flex items-center gap-1"
        >
          <span>All Builders</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Trending Contributors */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-royal" />
            <h3 className="text-sm font-semibold text-typography-navy">
              Active Builders
            </h3>
          </div>
          <span className="text-[11px] text-typography-muted">
            {contributors.length} discoverable
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full bg-surface-soft animate-pulse ring-2 ring-surface-white"
                />
              ))}
            </div>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-surface-soft animate-pulse"
              />
            ))}
          </div>
        ) : contributors.length === 0 ? (
          <p className="text-xs text-typography-slate py-2">
            No discoverable builders yet.
          </p>
        ) : (
          <>
            {/* Avatar Strip */}
            <div className="flex items-center -space-x-2 overflow-hidden pb-1">
              {stripContributors.map((person) => {
                const name = person.full_name || person.username || 'Builder';
                const online = isUserOnline(person.id);
                return (
                  <Link
                    key={person.id}
                    to={person.username ? `/profile/${person.username}` : '/people'}
                    title={online ? `${name} (Online)` : name}
                    className="relative inline-block rounded-full ring-2 ring-surface-white hover:z-10 transition-transform hover:scale-105"
                  >
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ice text-[10px] font-semibold text-brand-royal">
                        {getInitials(name)}
                      </div>
                    )}
                    {online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-white" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Contributor List */}
            <div className="space-y-2.5">
              {featuredContributors.map((person) => {
                const name = person.full_name || person.username || 'Builder';
                const online = isUserOnline(person.id);
                const topSkills = (person.skills || []).slice(0, 2);
                const profileHref = person.username
                  ? `/profile/${person.username}`
                  : '/people';

                return (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-surface-border/70 bg-surface-soft/50 p-2.5"
                  >
                    <Link
                      to={profileHref}
                      className="flex items-center gap-2.5 min-w-0 flex-1 group"
                    >
                      <div className="relative h-9 w-9 shrink-0">
                        {person.avatar_url ? (
                          <img
                            src={person.avatar_url}
                            alt={name}
                            className="h-9 w-9 rounded-full object-cover border border-surface-border"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ice text-xs font-semibold text-brand-royal border border-brand-pale">
                            {getInitials(name)}
                          </div>
                        )}
                        {online && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-white"
                            aria-label="Online now"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-typography-navy truncate group-hover:text-brand-royal transition-colors">
                            {name}
                          </span>
                          {online && (
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                              Online
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {topSkills.length > 0 ? (
                            topSkills.map((skill) => (
                              <span
                                key={skill}
                                className="rounded-md bg-surface-white border border-surface-border px-1.5 py-0.5 text-[10px] text-typography-slate truncate max-w-[90px]"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-typography-muted capitalize">
                              {person.role || 'Builder'}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <Link
                      to={profileHref}
                      className="shrink-0 rounded-lg border border-surface-border bg-surface-white px-2.5 py-1 text-[11px] font-medium text-typography-navy hover:border-brand-pale hover:text-brand-royal transition-colors"
                    >
                      View
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Recent Discussions & Comments */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-royal" />
          <h3 className="text-sm font-semibold text-typography-navy">
            Recent Discussions
          </h3>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-surface-soft animate-pulse"
              />
            ))}
          </div>
        ) : discussions.length === 0 ? (
          <p className="text-xs text-typography-slate py-2">
            No discussions yet. Start a conversation on any idea!
          </p>
        ) : (
          <div className="space-y-2.5">
            {discussions.map((item) => {
              const commenter =
                item.author?.full_name || item.author?.username || 'Builder';
              const online = isUserOnline(item.author?.id);
              return (
                <Link
                  key={item.id}
                  to={`/ideas/${item.idea.slug}`}
                  className={cn(
                    'block rounded-xl border border-surface-border/70 bg-surface-soft/50 p-3 transition-colors hover:border-brand-pale hover:bg-brand-ice/30'
                  )}
                >
                  <p className="text-xs text-typography-slate leading-relaxed">
                    <span className="inline-flex items-center gap-1 font-semibold text-typography-navy">
                      {online && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                      {commenter}
                    </span>{' '}
                    commented on{' '}
                    <span className="font-medium text-typography-navy">
                      {item.idea.title}
                    </span>
                    :
                  </p>
                  <p className="mt-1 text-xs text-typography-navy/90 line-clamp-2 italic">
                    &ldquo;{item.content}&rdquo;
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-royal">
                    + Join Discussion
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

