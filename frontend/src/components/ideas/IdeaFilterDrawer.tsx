import React, { useMemo } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { CustomSelect, type CustomSelectOption } from '@/components/common/CustomSelect';
import type { FilterState } from './IdeaFilters';
import {
  CATEGORIES,
  COLLABORATION_TYPES,
  DEVELOPMENT_STATUSES,
  SKILL_CATEGORIES,
} from './filterConstants';
import type { CollaborationType, IdeaStatus, SkillCategory } from '@/types';

interface IdeaFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export const IdeaFilterDrawer: React.FC<IdeaFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onChange,
  onClear,
  hasActiveFilters,
}) => {
  const categoryOptions: CustomSelectOption[] = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        label: c,
        value: c === 'All Categories' ? 'all' : c,
      })),
    []
  );

  const collaborationOptions: CustomSelectOption[] = useMemo(
    () =>
      COLLABORATION_TYPES.map((t) => ({
        label: t.label,
        value: t.value,
      })),
    []
  );

  const statusOptions: CustomSelectOption[] = useMemo(
    () =>
      DEVELOPMENT_STATUSES.map((s) => ({
        label: s.label,
        value: s.value,
      })),
    []
  );

  const skillOptions: CustomSelectOption[] = useMemo(
    () =>
      SKILL_CATEGORIES.map((sk) => ({
        label: sk.label,
        value: sk.value,
      })),
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-typography-navy/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-surface-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200 no-scrollbar"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 1.25rem)' }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-typography-navy font-heading">
              Filter Ideas
            </h3>
            <p className="text-xs font-normal text-typography-slate">
              Narrow down ideas by domain, model, status, or role
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-typography-slate hover:text-typography-navy hover:bg-surface-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Category */}
        <CustomSelect
          label="Domain Category"
          value={filters.category}
          onChange={(val) => onChange({ ...filters, category: val })}
          options={categoryOptions}
          placeholder="All Categories"
        />

        {/* 2. Collaboration Type */}
        <CustomSelect
          label="Collaboration Model"
          value={filters.collaborationType}
          onChange={(val) =>
            onChange({
              ...filters,
              collaborationType: val as CollaborationType | 'all',
            })
          }
          options={collaborationOptions}
          placeholder="Select Model"
        />

        {/* 3. Development Status */}
        <CustomSelect
          label="Development Status"
          value={filters.status}
          onChange={(val) =>
            onChange({
              ...filters,
              status: val as IdeaStatus | 'all',
            })
          }
          options={statusOptions}
          placeholder="Select Status"
        />

        {/* 4. Skills Required */}
        <CustomSelect
          label="Skills Required"
          value={filters.skill}
          onChange={(val) =>
            onChange({
              ...filters,
              skill: val as SkillCategory | 'all',
            })
          }
          options={skillOptions}
          placeholder="Select Skill"
        />

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-surface-border">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-functional-error hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

