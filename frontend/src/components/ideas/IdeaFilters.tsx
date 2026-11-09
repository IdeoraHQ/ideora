import React, { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { CustomSelect, type CustomSelectOption } from '@/components/common/CustomSelect';
import type { SkillCategory, CollaborationType, IdeaStatus } from '@/types';
import {
  CATEGORIES,
  COLLABORATION_TYPES,
  DEVELOPMENT_STATUSES,
  SKILL_CATEGORIES,
} from './filterConstants';
import { cn } from '@/utils/cn';

export interface FilterState {
  category: string;
  collaborationType: CollaborationType | 'all';
  status: IdeaStatus | 'all';
  skill: SkillCategory | 'all';
}

interface IdeaFiltersProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  className?: string;
}

export const IdeaFilters: React.FC<IdeaFiltersProps> = ({
  filters,
  onChange,
  onClear,
  hasActiveFilters,
  className,
}) => {
  const categoryOptions: CustomSelectOption[] = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        label: cat,
        value: cat === 'All Categories' ? 'all' : cat,
      })),
    []
  );

  const collaborationOptions: CustomSelectOption[] = useMemo(
    () =>
      COLLABORATION_TYPES.map((type) => ({
        label: type.label,
        value: type.value,
      })),
    []
  );

  const statusOptions: CustomSelectOption[] = useMemo(
    () =>
      DEVELOPMENT_STATUSES.map((status) => ({
        label: status.label,
        value: status.value,
      })),
    []
  );

  const skillOptions: CustomSelectOption[] = useMemo(
    () =>
      SKILL_CATEGORIES.map((skill) => ({
        label: skill.label,
        value: skill.value,
      })),
    []
  );

  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      {/* Category Dropdown */}
      <CustomSelect
        value={filters.category}
        onChange={(val) => onChange({ ...filters, category: val })}
        options={categoryOptions}
        placeholder="All Categories"
        className="w-auto min-w-[150px]"
      />

      {/* Collaboration Type Dropdown */}
      <CustomSelect
        value={filters.collaborationType}
        onChange={(val) =>
          onChange({
            ...filters,
            collaborationType: val as CollaborationType | 'all',
          })
        }
        options={collaborationOptions}
        placeholder="Collaboration Model"
        className="w-auto min-w-[175px]"
      />

      {/* Development Status Dropdown */}
      <CustomSelect
        value={filters.status}
        onChange={(val) =>
          onChange({
            ...filters,
            status: val as IdeaStatus | 'all',
          })
        }
        options={statusOptions}
        placeholder="Development Status"
        className="w-auto min-w-[160px]"
      />

      {/* Skills Required Dropdown */}
      <CustomSelect
        value={filters.skill}
        onChange={(val) =>
          onChange({
            ...filters,
            skill: val as SkillCategory | 'all',
          })
        }
        options={skillOptions}
        placeholder="Required Skills"
        className="w-auto min-w-[155px]"
      />

      {/* Clear Filters Button (Visible only when filters active) */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-xl border border-functional-error/30 bg-functional-error-light px-3 py-2 text-xs font-semibold text-functional-error hover:bg-functional-error/15 transition-colors"
          title="Reset all filters"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Clear Filters</span>
        </button>
      )}
    </div>
  );
};

