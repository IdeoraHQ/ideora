import React from 'react';
import { Lightbulb, Users, Inbox, FolderGit2, ThumbsUp } from 'lucide-react';
import { cn } from '@/utils/cn';

interface StatsOverviewProps {
  ideasCount: number;
  collaborationsCount: number;
  pendingRequestsCount: number;
  activeProjectsCount: number;
  totalUpvotesCount?: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  ideasCount,
  collaborationsCount,
  pendingRequestsCount,
  activeProjectsCount,
  totalUpvotesCount,
}) => {
  const stats = [
    {
      label: 'Ideas Published',
      value: ideasCount,
      icon: Lightbulb,
      iconColor: 'text-brand-royal',
      iconBg: 'bg-brand-ice',
    },
    {
      label: 'Active Collaborations',
      value: collaborationsCount,
      icon: Users,
      iconColor: 'text-functional-success',
      iconBg: 'bg-functional-success-light',
    },
    {
      label: 'Pending Requests',
      value: pendingRequestsCount,
      icon: Inbox,
      iconColor: pendingRequestsCount > 0 ? 'text-functional-warning' : 'text-typography-muted',
      iconBg: pendingRequestsCount > 0 ? 'bg-functional-warning-light' : 'bg-surface-light',
      highlight: pendingRequestsCount > 0,
    },
    {
      label: 'Active Projects',
      value: activeProjectsCount,
      icon: FolderGit2,
      iconColor: 'text-brand-deep',
      iconBg: 'bg-surface-light',
    },
    ...(totalUpvotesCount !== undefined
      ? [
          {
            label: 'Total Upvotes & Likes',
            value: totalUpvotesCount,
            icon: ThumbsUp,
            iconColor: 'text-brand-royal',
            iconBg: 'bg-brand-ice',
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        totalUpvotesCount !== undefined
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-2 lg:grid-cols-4'
      )}
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-white p-4 sm:p-5 shadow-sm transition-all hover:border-brand-light/70',
              stat.highlight && 'border-functional-warning/40 bg-functional-warning-light/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted truncate">
                {stat.label}
              </span>
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl shrink-0',
                  stat.iconBg,
                  stat.iconColor
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-typography-navy font-heading">
                {stat.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

