import React from 'react';
import { Sparkles, Users, Award } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ShortcutKey = 'all' | 'recent' | 'collaborators' | 'adoption';

interface IdeaDiscoveryShortcutsProps {
  activeShortcut: ShortcutKey;
  onSelect: (key: ShortcutKey) => void;
  className?: string;
}

export const IdeaDiscoveryShortcuts: React.FC<IdeaDiscoveryShortcutsProps> = ({
  activeShortcut,
  onSelect,
  className,
}) => {
  const shortcuts = [
    {
      key: 'all' as ShortcutKey,
      label: 'All Ideas',
      icon: Sparkles,
      description: 'Full ecosystem',
    },
    {
      key: 'recent' as ShortcutKey,
      label: 'Recently Published',
      icon: Sparkles,
      description: 'Latest concepts',
    },
    {
      key: 'collaborators' as ShortcutKey,
      label: 'Seeking Collaborators',
      icon: Users,
      description: 'Actively recruiting builders',
    },
    {
      key: 'adoption' as ShortcutKey,
      label: 'Open for Adoption / Co-Founder',
      icon: Award,
      description: 'Early vision needing co-owners',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3', className)}>
      {shortcuts.map((sc) => {
        const Icon = sc.icon;
        const isActive = activeShortcut === sc.key;
        return (
          <button
            key={sc.key}
            type="button"
            onClick={() => onSelect(sc.key)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border p-3 sm:p-3.5 text-left transition-all duration-200 shadow-2xs',
              isActive
                ? 'border-brand-royal bg-brand-ice/80 text-brand-royal shadow-sm'
                : 'border-surface-border bg-surface-white text-typography-slate hover:border-brand-pale hover:text-typography-navy'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors',
                isActive ? 'bg-brand-royal text-white' : 'bg-surface-soft text-typography-muted'
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <span className="text-xs font-medium block truncate text-typography-navy">
                {sc.label}
              </span>
              <span className="text-[10px] font-normal text-typography-slate truncate block">
                {sc.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

