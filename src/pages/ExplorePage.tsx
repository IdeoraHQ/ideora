import React, { useState } from 'react';
import { Search, Filter, Sparkles } from 'lucide-react';
import { IdeaCard } from '@/features/ideas/components/IdeaCard';
import type { Idea, SkillCategory } from '@/types';

const allIdeas: Idea[] = [
  {
    id: '1',
    creator_id: 'u1',
    title: 'Open Source AI Pair Programmer for Maintainers',
    slug: 'open-source-ai-maintainer',
    summary:
      'A bot that triages incoming issues, drafts reproducibilities, and proposes bug fix branches with zero context switching for maintainers.',
    description: 'Detailed description...',
    category: 'Developer Tools',
    status: 'seeking_collaborators',
    collaboration_type: 'co_founder',
    tags: ['AI', 'OpenSource', 'DevTools'],
    upvotes_count: 42,
    collaborators_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: 'u1',
      username: 'alexv',
      full_name: 'Alex Vance',
      avatar_url: null,
      bio: 'Open source enthusiast',
      skills: ['ai', 'backend'],
      github_url: 'https://github.com/alexv',
      linkedin_url: null,
      website_url: null,
      role: 'founder',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    rolesNeeded: [
      {
        id: 'r1',
        idea_id: '1',
        role_title: 'Fullstack Engineer',
        category: 'fullstack',
        spots_available: 2,
        spots_filled: 1,
        description: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'r2',
        idea_id: '1',
        role_title: 'UI/UX Designer',
        category: 'design',
        spots_available: 1,
        spots_filled: 0,
        description: null,
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: '2',
    creator_id: 'u2',
    title: 'Decentralized Micro-Grant Discovery for Solo Founders',
    slug: 'decentralized-micro-grants',
    summary:
      'Aggregator connecting non-dilutive grant programs with indie hackers building climate and educational tools.',
    description: 'Detailed description...',
    category: 'Fintech',
    status: 'seeking_collaborators',
    collaboration_type: 'co_founder',
    tags: ['Fintech', 'IndieHacker', 'Climate'],
    upvotes_count: 29,
    collaborators_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: 'u2',
      username: 'sarahc',
      full_name: 'Sarah Chen',
      avatar_url: null,
      bio: 'Product builder',
      skills: ['product', 'frontend'],
      github_url: 'https://github.com/sarahc',
      linkedin_url: null,
      website_url: null,
      role: 'founder',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    rolesNeeded: [
      {
        id: 'r3',
        idea_id: '2',
        role_title: 'Backend / Web Scraping',
        category: 'backend',
        spots_available: 1,
        spots_filled: 0,
        description: null,
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: '3',
    creator_id: 'u3',
    title: 'Collaborative Music Production DAW in WebAssembly',
    slug: 'collab-daw-wasm',
    summary:
      'Google Docs style multi-user DAW running directly inside the browser using Rust/Wasm audio worklets and Supabase Realtime.',
    description: 'Detailed description...',
    category: 'Audio',
    status: 'seeking_collaborators',
    collaboration_type: 'open_source',
    tags: ['WebAssembly', 'Audio', 'Realtime'],
    upvotes_count: 88,
    collaborators_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: 'u3',
      username: 'marcusb',
      full_name: 'Marcus Bell',
      avatar_url: null,
      bio: 'Sound designer & engineer',
      skills: ['frontend', 'backend'],
      github_url: 'https://github.com/marcusb',
      linkedin_url: null,
      website_url: null,
      role: 'collaborator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    rolesNeeded: [
      {
        id: 'r4',
        idea_id: '3',
        role_title: 'Audio DSP Engineer',
        category: 'backend',
        spots_available: 1,
        spots_filled: 0,
        description: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'r5',
        idea_id: '3',
        role_title: 'Frontend React/Canvas',
        category: 'frontend',
        spots_available: 1,
        spots_filled: 0,
        description: null,
        created_at: new Date().toISOString(),
      },
    ],
  },
];

const categoryFilters: { label: string; value: SkillCategory | 'all' }[] = [
  { label: 'All Roles', value: 'all' },
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Fullstack', value: 'fullstack' },
  { label: 'Design', value: 'design' },
  { label: 'AI', value: 'ai' },
];

export const ExplorePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<SkillCategory | 'all'>('all');

  const filteredIdeas = allIdeas.filter((idea) => {
    const matchesQuery =
      idea.title.toLowerCase().includes(query.toLowerCase()) ||
      idea.summary.toLowerCase().includes(query.toLowerCase()) ||
      idea.tags.some((t: string) => t.toLowerCase().includes(query.toLowerCase()));

    const matchesRole =
      selectedRole === 'all' ||
      Boolean(idea.rolesNeeded?.some((r) => r.category === selectedRole));

    return matchesQuery && matchesRole;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-surface-soft min-h-[calc(100vh-16rem)]">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-typography-navy sm:text-4xl">
          Explore Ideas
        </h1>
        <p className="mt-2 text-typography-slate font-medium">
          Discover unfinished concepts, partner with founders, and contribute your expertise.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ideas, tags, keywords..."
            className="w-full rounded-xl border border-surface-border bg-surface-white py-2.5 pl-10 pr-4 text-sm text-typography-navy placeholder-typography-muted shadow-sm focus:border-brand-royal focus:outline-none focus:ring-1 focus:ring-brand-royal"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <Filter className="h-4 w-4 text-typography-muted shrink-0 hidden sm:block" />
          {categoryFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedRole(f.value)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all border ${
                selectedRole === f.value
                  ? 'bg-brand-royal text-white border-brand-royal shadow-sm'
                  : 'bg-surface-white text-typography-slate border-surface-border hover:text-typography-navy hover:bg-surface-light'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIdeas.length > 0 ? (
          filteredIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
        ) : (
          <div className="col-span-full rounded-2xl border border-surface-border bg-surface-white p-12 text-center shadow-sm">
            <Sparkles className="mx-auto h-8 w-8 text-typography-muted mb-3" />
            <h3 className="text-base font-bold text-typography-navy">
              No matching ideas found
            </h3>
            <p className="mt-1 text-xs text-typography-slate">
              Try adjusting your search query or role filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
