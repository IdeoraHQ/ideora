import type { ProjectStatus } from '@/types';

export interface ProjectStatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const PROJECT_STATUS_META: Record<ProjectStatus, ProjectStatusMeta> = {
  active: {
    label: 'Active',
    badgeClass: 'bg-functional-success-light text-functional-success border-functional-success/30',
    dotClass: 'bg-functional-success',
  },
  paused: {
    label: 'Paused',
    badgeClass: 'bg-functional-warning-light text-functional-warning border-functional-warning/30',
    dotClass: 'bg-functional-warning',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-brand-ice text-brand-royal border-brand-pale',
    dotClass: 'bg-brand-royal',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-surface-light text-typography-slate border-surface-border',
    dotClass: 'bg-typography-muted',
  },
};

export const PROJECT_STATUS_OPTIONS: Array<{ label: string; value: ProjectStatus }> = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
];

