import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lightbulb,
  Plus,
  Trash2,
  Rocket,
  Save,
  ArrowLeft,
  AlertCircle,
  Users,
  Tag,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createIdea } from '@/services/api';
import { SeoHead } from '@/components/seo/SeoHead';
import { CustomSelect } from '@/components/common';
import type { CollaborationType, IdeaStatus, SkillCategory } from '@/types';

interface RoleDraft {
  role_title: string;
  category: SkillCategory;
  spots_available: number;
  description: string;
}

const categories = [
  'Developer Tools',
  'Fintech',
  'HealthTech',
  'Creator Economy',
  'Climate & Sustainability',
  'Education',
  'AI & Automation',
  'Consumer Social',
];

const collaborationTypes: {
  label: string;
  value: CollaborationType;
  desc: string;
}[] = [
  {
    label: 'Co-Founder',
    value: 'co_founder',
    desc: 'Long-term partner sharing core ownership & product direction',
  },
  {
    label: 'Core Contributor',
    value: 'contributor',
    desc: 'Active builder contributing specific features or design',
  },
  {
    label: 'Open Source',
    value: 'open_source',
    desc: 'Community-driven open-source project welcoming PRs',
  },
  {
    label: 'Advisor / Mentor',
    value: 'advisor',
    desc: 'Domain expert providing strategic or technical guidance',
  },
];

const skillCategories: { label: string; value: SkillCategory }[] = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Fullstack', value: 'fullstack' },
  { label: 'UI/UX Design', value: 'design' },
  { label: 'Product', value: 'product' },
  { label: 'AI / ML', value: 'ai' },
  { label: 'Marketing / Growth', value: 'marketing' },
];

export const CreateIdeaPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [collaborationType, setCollaborationType] =
    useState<CollaborationType>('co_founder');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['TypeScript', 'AI']);
  const [roles, setRoles] = useState<RoleDraft[]>([
    {
      role_title: 'Fullstack Engineer',
      category: 'fullstack',
      spots_available: 1,
      description: '',
    },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-10 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-4">
            <Lightbulb className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-light text-typography-navy">
            Sign in to Publish an Idea
          </h1>
          <p className="mt-2 text-sm font-normal text-typography-slate leading-relaxed">
            Create or sign in to your builder profile so collaborators know who is behind the vision.
          </p>
          <Link
            to="/auth"
            state={{ from: '/ideas/new' }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep"
          >
            Sign In / Switch Persona
          </Link>
        </div>
      </div>
    );
  }

  const commitTag = (rawValue: string = tagInput) => {
    const candidates = rawValue
      .split(',')
      .map((part) => part.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (candidates.length === 0) {
      setTagInput('');
      return;
    }

    setTags((prev) => {
      const next = [...prev];
      for (const candidate of candidates) {
        if (next.length >= 8) break;
        if (!next.some((existing) => existing.toLowerCase() === candidate.toLowerCase())) {
          next.push(candidate);
        }
      }
      return next;
    });
    setTagInput('');
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(',')) {
      const endsWithComma = val.endsWith(',');
      const parts = val.split(',');
      const toCommit = endsWithComma ? parts.join(',') : parts.slice(0, -1).join(',');
      const remainder = endsWithComma ? '' : parts[parts.length - 1];
      if (toCommit.trim()) {
        commitTag(toCommit);
      }
      setTagInput(remainder);
      return;
    }
    setTagInput(val);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag(tagInput);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const addRoleRow = () => {
    setRoles([
      ...roles,
      {
        role_title: '',
        category: 'frontend',
        spots_available: 1,
        description: '',
      },
    ]);
  };

  const updateRoleRow = <K extends keyof RoleDraft>(
    index: number,
    field: K,
    value: RoleDraft[K]
  ) => {
    setRoles((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeRoleRow = (index: number) => {
    setRoles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePublish = async (status: IdeaStatus) => {
    setError(null);

    if (title.trim().length < 5) {
      setError('Idea title must be at least 5 characters long.');
      return;
    }
    if (summary.trim().length < 15) {
      setError('Please provide a clear elevator summary (at least 15 characters).');
      return;
    }
    if (description.trim().length < 30) {
      setError('Please provide a detailed description of the problem and vision.');
      return;
    }

    const validRoles = roles.filter((r) => r.role_title.trim().length > 0);

    setSubmitting(true);
    try {
      const { data, error: createErr } = await createIdea({
        title,
        summary,
        description,
        category,
        collaboration_type: collaborationType,
        status,
        tags: tags.length > 0 ? tags : ['Startup'],
        roles_needed: validRoles,
      });

      if (createErr || !data) {
        throw createErr || new Error('Failed to create idea');
      }

      setSuccessMessage('Idea published successfully! Opening project workspace...');
      setTimeout(() => {
        navigate(`/ideas/${data.slug}`);
      }, 700);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <SeoHead
        title="Publish an Idea | Ideora"
        description="Publish an unfinished idea and invite collaborators on Ideora."
        canonicalPath="/ideas/new"
        noindex
      />
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-typography-slate hover:text-brand-royal mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Explore
      </Link>

      <div className="rounded-2xl border border-surface-border bg-surface-white p-8 shadow-sm">
        <div className="border-b border-surface-border pb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal mb-3">
            <Lightbulb className="h-3.5 w-3.5" />
            Publish Your Concept
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-typography-navy tracking-tight">
            Turn your idea into a collaborative project
          </h1>
          <p className="mt-1 text-sm font-normal text-typography-slate leading-relaxed">
            Define the problem, share your current progress, and specify the exact co-founders or contributors you need.
          </p>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-4 text-xs font-semibold text-functional-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-functional-success/30 bg-functional-success-light p-4 text-xs font-semibold text-functional-success animate-in fade-in">
            <Sparkles className="h-4 w-4 shrink-0 text-functional-success" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {/* Title & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                Idea Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Open Source AI Pair Programmer for Maintainers"
                className="w-full rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                Domain / Category *
              </label>
              <CustomSelect
                value={category}
                onChange={setCategory}
                options={categories.map((c) => ({ label: c, value: c }))}
                triggerClassName="py-2.5 bg-surface-soft text-sm"
              />
            </div>
          </div>

          {/* Elevator Summary */}
          <div>
            <label className="block text-xs font-bold text-typography-navy mb-1.5">
              One-Sentence Elevator Pitch *
            </label>
            <input
              type="text"
              maxLength={220}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Concise summary displayed on discovery cards (max 220 chars)"
              className="w-full rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
            />
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-xs font-bold text-typography-navy mb-1.5">
              Detailed Vision, Problem & Architecture *
            </label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the problem you're solving, any prototypes or research completed so far, and what the first milestone looks like..."
              className="w-full rounded-xl border border-surface-border bg-surface-soft p-4 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none leading-relaxed"
            />
          </div>

          {/* Collaboration Model */}
          <div>
            <label className="block text-xs font-bold text-typography-navy mb-2">
              Collaboration Structure *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {collaborationTypes.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setCollaborationType(ct.value)}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    collaborationType === ct.value
                      ? 'border-brand-royal bg-brand-ice/60 text-brand-royal shadow-sm'
                      : 'border-surface-border bg-surface-soft text-typography-slate hover:border-brand-light'
                  }`}
                >
                  <span className="block text-xs font-bold">{ct.label}</span>
                  <span className="mt-1 block text-[11px] opacity-80">
                    {ct.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-typography-navy mb-1.5">
              Tech Stack & Topic Tags (Press Enter, comma, or tap Add)
            </label>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-surface-soft p-2.5">
              <Tag className="h-4 w-4 text-typography-muted ml-1 shrink-0" />
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-ice border border-brand-pale px-2.5 py-1 text-xs font-bold text-brand-royal"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-functional-error"
                    aria-label={`Remove ${t}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
              <div className="flex flex-1 items-center gap-2 min-w-[180px]">
                <input
                  type="text"
                  enterKeyHint="done"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleAddTag}
                  onBlur={() => {
                    if (tagInput.trim()) commitTag(tagInput);
                  }}
                  placeholder="Add tag (e.g. Rust, React, WebGPU)..."
                  className="flex-1 min-w-0 bg-transparent text-xs text-typography-navy focus:outline-none"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitTag(tagInput)}
                  disabled={!tagInput.trim() || tags.length >= 8}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-brand-royal px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Roles Needed Builder */}
          <div className="border-t border-surface-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-royal" />
                  Open Roles Needed
                </h2>
                <p className="text-xs font-normal text-typography-slate">
                  Specify the collaborators and skill sets you are actively recruiting.
                </p>
              </div>
              <button
                type="button"
                onClick={addRoleRow}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-royal/30 bg-brand-ice px-3 py-1.5 text-xs font-semibold text-brand-royal hover:bg-brand-pale/60 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Role
              </button>
            </div>

            <div className="space-y-4">
              {roles.map((role, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-surface-border bg-surface-soft p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-typography-slate mb-1">
                        Role Title
                      </label>
                      <input
                        type="text"
                        value={role.role_title}
                        onChange={(e) =>
                          updateRoleRow(index, 'role_title', e.target.value)
                        }
                        placeholder="e.g. Founding Frontend Engineer"
                        className="w-full rounded-lg border border-surface-border bg-surface-white px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-typography-slate mb-1">
                        Skill Category
                      </label>
                      <CustomSelect
                        value={role.category}
                        onChange={(val) =>
                          updateRoleRow(index, 'category', val as SkillCategory)
                        }
                        options={skillCategories.map((sc) => ({
                          label: sc.label,
                          value: sc.value,
                        }))}
                        triggerClassName="py-2 text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-typography-slate mb-1">
                        Open Spots
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={role.spots_available}
                        onChange={(e) =>
                          updateRoleRow(
                            index,
                            'spots_available',
                            parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="w-full rounded-lg border border-surface-border bg-surface-white px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      {roles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRoleRow(index)}
                          className="rounded-lg p-2 text-typography-muted hover:bg-functional-error-light hover:text-functional-error transition-colors"
                          title="Remove role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={role.description}
                      onChange={(e) =>
                        updateRoleRow(index, 'description', e.target.value)
                      }
                      placeholder="Key responsibilities or ideal experience for this role (optional)"
                      className="w-full rounded-lg border border-surface-border bg-surface-white px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="border-t border-surface-border pt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handlePublish('draft')}
              className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-5 py-2.5 text-sm font-bold text-typography-slate hover:text-typography-navy hover:bg-surface-light transition-colors disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handlePublish('seeking_collaborators')}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep transition-all disabled:opacity-60"
            >
              <Rocket className="h-4 w-4" />
              {submitting ? 'Publishing...' : 'Publish & Recruit Builders'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

