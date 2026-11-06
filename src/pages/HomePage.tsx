import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Users,
  Rocket,
  ShieldCheck,
  Database,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { IdeaCard } from '@/features/ideas/components/IdeaCard';
import type { Idea } from '@/types';
import { useSupabaseStatus } from '@/hooks/useSupabaseStatus';

const sampleIdeas: Idea[] = [
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
];

export const HomePage: React.FC = () => {
  const { isConfigured } = useSupabaseStatus();

  return (
    <div className="relative isolate overflow-hidden bg-surface-soft">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 text-center">
        {/* Slogan Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-pale bg-brand-ice px-4 py-1.5 text-xs font-bold text-brand-royal mb-6 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Where ideas find their builders.
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold tracking-tight text-typography-navy sm:text-6xl max-w-4xl mx-auto leading-tight">
          Turn your unfinished ideas into{' '}
          <span className="text-brand-royal underline decoration-brand-light/50 underline-offset-8">
            real projects
          </span>
        </h1>

        <p className="mt-6 text-lg leading-8 text-typography-slate max-w-2xl mx-auto font-normal">
          Don&apos;t let brilliant concepts die in notes apps. Publish your vision, assemble co-founders and contributors, and co-create real-world software.
        </p>

        {/* Call to Actions matching palette buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep transition-all hover:scale-105"
          >
            Explore Projects
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/IdeoraHQ/ideora"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-royal/40 bg-brand-ice px-6 py-3.5 text-sm font-bold text-brand-royal hover:bg-brand-pale/50 transition-all"
          >
            Secondary Action / Repo
          </a>
        </div>

        {/* Feature Highlights Grid from Brand Guidelines */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-brand-ice flex items-center justify-center text-brand-royal mb-4">
              <Rocket className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-typography-navy">
              Build Together
            </h2>
            <p className="mt-1 text-sm text-typography-slate">
              Turn ideas into reality with co-founders who complement your skill gaps.
            </p>
            <Link
              to="/explore"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-royal hover:text-brand-deep"
            >
              Learn more &rarr;
            </Link>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-brand-ice flex items-center justify-center text-brand-royal mb-4">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-typography-navy">
              Publish Unfinished Work
            </h2>
            <p className="mt-1 text-sm text-typography-slate">
              Share half-baked drafts, wireframes, and problem statements without fear.
            </p>
            <Link
              to="/explore"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-royal hover:text-brand-deep"
            >
              Share vision &rarr;
            </Link>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-brand-ice flex items-center justify-center text-brand-royal mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-typography-navy">
              Serverless & Scalable
            </h2>
            <p className="mt-1 text-sm text-typography-slate">
              Engineered with React 18, TypeScript, Tailwind, and Supabase cloud.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-functional-success">
              ✓ Ready for production
            </span>
          </div>
        </div>

        {/* Foundation Status Card */}
        <div className="mt-10 max-w-4xl mx-auto rounded-2xl border border-surface-border bg-surface-white p-6 text-left shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-functional-success" />
              <h2 className="text-sm font-bold text-typography-navy">
                IDEORA Development Environment Health
              </h2>
            </div>
            <span className="text-xs font-semibold text-functional-success bg-functional-success-light px-2.5 py-0.5 rounded-full border border-functional-success/20">
              Verified & Configured
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-surface-soft p-3 border border-surface-border">
              <span className="text-typography-muted block mb-1 font-medium">Stack</span>
              <span className="text-typography-navy font-bold flex items-center gap-1.5">
                <Rocket className="h-3.5 w-3.5 text-brand-royal" /> Vite + React 18 + TS
              </span>
            </div>
            <div className="rounded-xl bg-surface-soft p-3 border border-surface-border">
              <span className="text-typography-muted block mb-1 font-medium">Palette</span>
              <span className="text-typography-navy font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-royal" /> Official Brand System
              </span>
            </div>
            <div className="rounded-xl bg-surface-soft p-3 border border-surface-border">
              <span className="text-typography-muted block mb-1 font-medium">Backend</span>
              <span className="text-typography-navy font-bold flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-brand-royal" />
                {isConfigured ? 'Supabase Connected' : 'Supabase (Config in .env)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Ideas Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-typography-navy flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-royal" />
              Featured Collaboration Ideas
            </h2>
            <p className="text-sm text-typography-slate mt-1 font-medium">
              Real projects waiting for designers, engineers, and marketers
            </p>
          </div>
          <Link
            to="/explore"
            className="text-sm font-bold text-brand-royal hover:text-brand-deep flex items-center gap-1"
          >
            View all ideas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sampleIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </div>
    </div>
  );
};
