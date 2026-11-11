import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Compass, Users, Bell, ArrowRight } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      title: 'Publish an Idea',
      description: 'Share a concept, problem statement, and recruit partners.',
      to: '/ideas/new',
      icon: PlusCircle,
      accent: 'text-brand-royal',
      buttonBg: 'bg-brand-royal text-white hover:bg-brand-deep',
    },
    {
      title: 'Notifications Center',
      description: 'Review collaboration updates, comments, and project alerts.',
      to: '/notifications',
      icon: Bell,
      accent: 'text-brand-royal',
      buttonBg: 'bg-surface-soft text-typography-navy hover:bg-surface-light border border-surface-border',
    },
    {
      title: 'Explore Ideas',
      description: 'Search open concepts needing engineers, designers, and marketers.',
      to: '/explore',
      icon: Compass,
      accent: 'text-functional-info',
      buttonBg: 'bg-surface-soft text-typography-navy hover:bg-surface-light border border-surface-border',
    },
    {
      title: 'View Collaborations',
      description: 'Review accepted partnerships and submitted applications.',
      to: '/dashboard?tab=sent',
      icon: Users,
      accent: 'text-functional-success',
      buttonBg: 'bg-surface-soft text-typography-navy hover:bg-surface-light border border-surface-border',
    },
  ];

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
      <h2 className="text-xl sm:text-2xl font-light text-typography-navy font-heading mb-1">
        Quick Actions
      </h2>
      <p className="text-xs font-normal text-typography-slate mb-4">
        Common workflows to accelerate your project
      </p>

      <div className="space-y-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.title}
              to={act.to}
              className="flex items-center justify-between p-3.5 rounded-xl border border-surface-border/70 bg-surface-soft hover:bg-surface-white hover:border-brand-light/80 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-white border border-surface-border shadow-2xs group-hover:border-brand-pale">
                  <Icon className={`h-4 w-4 ${act.accent}`} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-typography-navy block truncate group-hover:text-brand-royal transition-colors">
                    {act.title}
                  </span>
                  <span className="text-[11px] font-normal text-typography-slate truncate block">
                    {act.description}
                  </span>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-typography-muted group-hover:text-brand-royal group-hover:translate-x-0.5 transition-all" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

