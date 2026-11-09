import type { SkillCategory, CollaborationType, IdeaStatus } from '@/types';

export const CATEGORIES = [
  'All Categories',
  'Developer Tools',
  'Fintech',
  'HealthTech',
  'Creator Economy',
  'Climate & Sustainability',
  'Education',
  'Consumer Social',
];

export const COLLABORATION_TYPES: { label: string; value: CollaborationType | 'all' }[] = [
  { label: 'All Collaboration Types', value: 'all' },
  { label: 'Up for Adoption / Co-Founder', value: 'co_founder' },
  { label: 'Looking for Collaborators', value: 'contributor' },
  { label: 'Open Source / Community Build', value: 'open_source' },
  { label: 'Advisory & Mentorship', value: 'advisor' },
];

export const DEVELOPMENT_STATUSES: { label: string; value: IdeaStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Concept / Draft', value: 'draft' },
  { label: 'Seeking Collaborators', value: 'seeking_collaborators' },
  { label: 'In Development', value: 'in_progress' },
  { label: 'Active Project / Launched', value: 'launched' },
];

export const SKILL_CATEGORIES: { label: string; value: SkillCategory | 'all' }[] = [
  { label: 'All Skills', value: 'all' },
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Fullstack', value: 'fullstack' },
  { label: 'UI/UX Design', value: 'design' },
  { label: 'Product', value: 'product' },
  { label: 'AI / ML', value: 'ai' },
  { label: 'Marketing', value: 'marketing' },
];

