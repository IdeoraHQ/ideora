import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CustomSelectOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

export interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  className,
  triggerClassName,
  menuClassName,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        onChange(options[nextIndex].value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        onChange(options[prevIndex].value);
      }
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const SelectedIcon = selectedOption?.icon;

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wider text-typography-muted mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between gap-2.5 rounded-xl border bg-surface-white px-3 py-2 text-xs font-medium text-typography-navy transition-all duration-150 shadow-2xs select-none',
          isOpen
            ? 'border-brand-royal ring-2 ring-brand-pale/50 bg-surface-white'
            : 'border-surface-border hover:border-brand-pale hover:bg-surface-soft/40',
          disabled && 'opacity-60 cursor-not-allowed bg-surface-light',
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {SelectedIcon && <SelectedIcon className="h-3.5 w-3.5 text-brand-royal shrink-0" />}
          <span className={cn('truncate', !selectedOption && 'text-typography-muted')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 text-[10px] font-semibold text-brand-royal bg-brand-ice px-1.5 py-0.2 rounded">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-typography-muted transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180 text-brand-royal'
          )}
        />
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={cn(
            'absolute left-0 top-full mt-1.5 z-50 w-full min-w-[180px] rounded-xl border border-surface-border bg-surface-white p-1.5 shadow-xl shadow-typography-navy/5 animate-in fade-in zoom-in-95 duration-150',
            menuClassName
          )}
        >
          <div className="max-h-60 overflow-y-auto space-y-0.5 no-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              const OptionIcon = option.icon;

              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer select-none',
                    isSelected
                      ? 'bg-brand-ice/90 text-brand-royal font-semibold'
                      : 'text-typography-charcoal hover:bg-surface-light hover:text-typography-navy font-normal'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {OptionIcon && (
                      <OptionIcon
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          isSelected ? 'text-brand-royal' : 'text-typography-muted'
                        )}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="truncate flex items-center gap-1.5">
                        <span>{option.label}</span>
                        {option.badge && (
                          <span className="text-[10px] font-semibold text-brand-royal bg-brand-ice px-1.5 py-0.2 rounded">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-[10px] text-typography-muted truncate mt-0.5 font-normal">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="h-3.5 w-3.5 text-brand-royal shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

