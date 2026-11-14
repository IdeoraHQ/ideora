import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePreference } from '@/types';
import { cn } from '@/utils/cn';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light Mode',
    shortLabel: 'Light',
    description: 'Clean white & royal-blue surface palette',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    shortLabel: 'Dark',
    description: 'Deep navy & charcoal surfaces for low-light comfort',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System Default',
    shortLabel: 'System',
    description: 'Automatically matches your device appearance',
    icon: Monitor,
  },
];

interface ThemeToggleProps {
  variant?: 'compact' | 'cards';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  className,
}) => {
  const { theme, resolvedTheme, setTheme, savingTheme } = useTheme();

  if (variant === 'cards') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme preference"
        className={cn('grid grid-cols-1 sm:grid-cols-3 gap-3', className)}
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={savingTheme}
              onClick={() => void setTheme(opt.value)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all',
                isSelected
                  ? 'border-brand-royal bg-brand-ice text-typography-navy shadow-sm ring-1 ring-brand-royal/30'
                  : 'border-surface-border bg-surface-soft text-typography-slate hover:bg-surface-light hover:text-typography-navy'
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border',
                    isSelected
                      ? 'border-brand-pale bg-surface-white text-brand-royal'
                      : 'border-surface-border bg-surface-white text-typography-slate'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {isSelected && (
                  <span className="rounded-full bg-brand-royal px-2 py-0.5 text-[10px] font-semibold text-white">
                    Active
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-typography-navy">{opt.label}</p>
                <p className="mt-0.5 text-[11px] text-typography-slate leading-relaxed">
                  {opt.description}
                  {opt.value === 'system' && isSelected
                    ? ` (currently ${resolvedTheme})`
                    : ''}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className={cn(
        'inline-flex items-center rounded-xl border border-surface-border bg-surface-soft p-0.5',
        className
      )}
    >
      {THEME_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => void setTheme(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all',
              isSelected
                ? 'bg-surface-white text-brand-royal shadow-2xs border border-surface-border/70'
                : 'text-typography-slate hover:text-typography-navy border border-transparent'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">{opt.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};

