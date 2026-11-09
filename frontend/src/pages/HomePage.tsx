import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Rocket,
  ShieldCheck,
  ArrowRight,
  Lightbulb,
  PlusCircle,
  Compass,
  FolderGit2,
  TrendingUp,
  Cpu,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { IdeaCard } from '@/features/ideas/components/IdeaCard';
import type { Idea } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  fetchPublishedIdeas,
  toggleIdeaUpvote,
  fetchUserUpvotedIdeaIds,
} from '@/services/api';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [featuredIdeas, setFeaturedIdeas] = useState<Idea[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadFeatured = async () => {
      setLoading(true);
      try {
        const [{ data }, upvoted] = await Promise.all([
          fetchPublishedIdeas({ sortBy: 'trending' }),
          fetchUserUpvotedIdeaIds(),
        ]);
        if (isMounted) {
          if (data) {
            setFeaturedIdeas(data.slice(0, 4));
          }
          setUpvotedIds(upvoted);
        }
      } catch (err) {
        console.error('Failed to load featured initiatives:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void loadFeatured();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleToggleUpvote = async (ideaId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (upvotingIds.has(ideaId)) return;

    setUpvotingIds((prev) => new Set(prev).add(ideaId));
    try {
      const { upvoted, upvotesCount, error } = await toggleIdeaUpvote(ideaId);
      if (!error) {
        setUpvotedIds((prev) =>
          upvoted ? [...prev, ideaId] : prev.filter((id) => id !== ideaId)
        );
        setFeaturedIdeas((prev) =>
          prev.map((item) =>
            item.id === ideaId
              ? {
                  ...item,
                  upvotes_count:
                    upvotesCount !== undefined
                      ? upvotesCount
                      : Math.max(0, item.upvotes_count + (upvoted ? 1 : -1)),
                }
              : item
          )
        );
      }
    } finally {
      setUpvotingIds((prev) => {
        const next = new Set(prev);
        next.delete(ideaId);
        return next;
      });
    }
  };

  return (
    <div className="relative isolate overflow-hidden bg-surface-soft">
      {/* 1. Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-pale bg-brand-ice px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-royal mb-6 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-brand-royal" />
            The Venture-Grade Co-Founding & Adoption Network
          </div>

          {/* Main Headline (Outfit Light 300) */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-typography-navy leading-[1.15]">
            Where ambitious ideas{' '}
            <span className="text-brand-royal font-normal underline decoration-brand-light/40 underline-offset-8">
              find their builders
            </span>
          </h1>

          {/* Subheading (Outfit Regular 400) */}
          <p className="mt-6 text-base sm:text-lg text-typography-slate font-normal leading-relaxed max-w-2xl mx-auto">
            IDEORA connects visionary product architects with senior engineers, AI practitioners, and design leaders to turn early-stage concepts into production software ventures.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-royal/25 hover:bg-brand-deep active:scale-98 transition-all"
            >
              <Compass className="h-4 w-4" />
              Explore Curated Initiatives
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </Link>

            <Link
              to="/ideas/new"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-royal/30 bg-surface-white px-6 py-3.5 text-sm font-semibold text-brand-royal shadow-2xs hover:bg-brand-ice/60 active:scale-98 transition-all"
            >
              <PlusCircle className="h-4 w-4 text-brand-royal" />
              Publish an Initiative
            </Link>
          </div>
        </div>

        {/* 2. Platform Value Metrics Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-surface-border bg-surface-white p-5 text-center shadow-2xs">
            <span className="block text-2xl sm:text-3xl font-bold text-typography-navy">
              100%
            </span>
            <span className="mt-1 block text-xs font-medium text-typography-slate">
              Verified Technical Builders
            </span>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-5 text-center shadow-2xs">
            <span className="block text-2xl sm:text-3xl font-bold text-brand-royal">
              &lt; 48h
            </span>
            <span className="mt-1 block text-xs font-medium text-typography-slate">
              Average Co-Founder Match
            </span>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-5 text-center shadow-2xs">
            <span className="block text-2xl sm:text-3xl font-bold text-typography-navy">
              3
            </span>
            <span className="mt-1 block text-xs font-medium text-typography-slate">
              Structured Adoption Models
            </span>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-5 text-center shadow-2xs">
            <span className="block text-2xl sm:text-3xl font-bold text-functional-success">
              Zero
            </span>
            <span className="mt-1 block text-xs font-medium text-typography-slate">
              Equity or Intermediary Cut
            </span>
          </div>
        </div>

        {/* 3. Live Architectural Preview Card */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-functional-success animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-typography-slate">
                  Active Collaboration Showcase
                </span>
              </div>
              <span className="rounded-full bg-brand-ice px-3 py-1 text-xs font-semibold text-brand-royal border border-brand-royal/20">
                Co-Founder Search
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-surface-soft px-2 py-0.5 text-[11px] font-semibold text-typography-slate">
                    AI & Automation
                  </span>
                  <span className="text-[11px] text-typography-muted">
                    Published by verified founder
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-light text-typography-navy">
                  Autonomous Multi-Agent Orchestration Harness
                </h2>
                <p className="text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
                  Deterministic task queue engine with real-time browser instrumentation and failure replay debugging for AI agents.
                </p>

                <div className="pt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-royal/20 bg-brand-ice px-2.5 py-1 text-xs font-medium text-brand-royal">
                    <Cpu className="h-3.5 w-3.5" />
                    Founding Backend Lead (1 spot)
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-soft px-2.5 py-1 text-xs font-medium text-typography-slate">
                    <Layers className="h-3.5 w-3.5" />
                    Design Systems Engineer (1 spot)
                  </span>
                </div>
              </div>

              <div className="md:border-l md:border-surface-border md:pl-6 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-typography-muted">
                  Workspace Readiness
                </div>
                <div className="space-y-1.5 text-xs text-typography-slate">
                  <div className="flex items-center justify-between">
                    <span>Architecture Spec</span>
                    <span className="font-semibold text-functional-success">Ready</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Milestone 1 Scope</span>
                    <span className="font-semibold text-functional-success">Defined</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Applicant Vetting</span>
                    <span className="font-semibold text-brand-royal">Active</span>
                  </div>
                </div>

                <Link
                  to="/explore"
                  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-ice px-4 py-2.5 text-xs font-semibold text-brand-royal hover:bg-brand-pale/50 transition-colors"
                >
                  Explore Similar Ideas
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Pillars for Senior Builders */}
      <section className="py-16 bg-surface-white border-y border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-royal">
              Engineered for High-Conviction Collaboration
            </span>
            <h2 className="mt-2 text-3xl font-light text-typography-navy tracking-tight">
              A serious workspace, not a social feed
            </h2>
            <p className="mt-3 text-sm text-typography-slate font-normal leading-relaxed">
              Every feature in IDEORA is optimized to minimize coordination friction, validate technical scope, and help builders assemble balanced teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-6 transition-all hover:border-brand-pale hover:shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-ice text-brand-royal mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-typography-navy">
                High-Signal Problem Specs
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
                Filter ideas by technical domain, architecture stack, and development maturity. Every initiative specifies the exact skills and seats required.
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-soft p-6 transition-all hover:border-brand-pale hover:shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-ice text-brand-royal mb-4">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-typography-navy">
                Transparent Adoption Models
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
                Whether you want to claim full stewardship through Idea Adoption, join as an equal co-founder, or contribute to an open-source project, terms are clear upfront.
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-soft p-6 transition-all hover:border-brand-pale hover:shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-ice text-brand-royal mb-4">
                <FolderGit2 className="h-5 w-5" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-typography-navy">
                Integrated Project Workspaces
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
                Review applicant GitHub and portfolio signals, approve or decline seats, track status transitions, and coordinate product milestones in dedicated workspaces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How IDEORA Works (3-Step Roadmap) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-royal">
            The Roadmap to Launch
          </span>
          <h2 className="mt-2 text-3xl font-light text-typography-navy tracking-tight">
            How ideas transform into ventures
          </h2>
          <p className="mt-3 text-sm text-typography-slate font-normal leading-relaxed">
            From initial problem formulation to assembling your founding core.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative rounded-2xl border border-surface-border bg-surface-white p-6 shadow-2xs">
            <span className="text-3xl font-light text-brand-royal/40 mb-2 block">
              01
            </span>
            <h3 className="text-base font-medium text-typography-navy">
              Architect & Publish
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
              Define the problem, specify your target audience, and detail the technical roles and open seats you need to execute.
            </p>
          </div>

          <div className="relative rounded-2xl border border-surface-border bg-surface-white p-6 shadow-2xs">
            <span className="text-3xl font-light text-brand-royal/40 mb-2 block">
              02
            </span>
            <h3 className="text-base font-medium text-typography-navy">
              Vet & Onboard Senior Builders
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
              Builders apply directly to your open roles with their background, GitHub, and commitment level. Review and select the right fit.
            </p>
          </div>

          <div className="relative rounded-2xl border border-surface-border bg-surface-white p-6 shadow-2xs">
            <span className="text-3xl font-light text-brand-royal/40 mb-2 block">
              03
            </span>
            <h3 className="text-base font-medium text-typography-navy">
              Execute in Private Workspaces
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
              Transition the initiative into active development, track milestones, and ship together with shared ownership.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Dynamic Live Initiatives from Database */}
      <section className="py-16 bg-surface-white border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-royal mb-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Live from the Community
              </div>
              <h2 className="text-2xl sm:text-3xl font-light text-typography-navy">
                Trending Initiatives Seeking Collaborators
              </h2>
              <p className="text-sm font-normal text-typography-slate mt-1">
                Real initiatives ready for engineers, founders, and product builders.
              </p>
            </div>

            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-royal hover:text-brand-deep transition-colors self-start sm:self-end"
            >
              Browse All Initiatives
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-surface-border bg-surface-soft p-6 h-64 animate-pulse flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-4 bg-surface-border/60 rounded w-1/4" />
                    <div className="h-6 bg-surface-border/60 rounded w-3/4" />
                    <div className="h-4 bg-surface-border/60 rounded w-full" />
                  </div>
                  <div className="h-8 bg-surface-border/60 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : featuredIdeas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  isUpvoted={upvotedIds.includes(idea.id)}
                  onToggleUpvote={handleToggleUpvote}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-10 text-center max-w-lg mx-auto">
              <Lightbulb className="h-10 w-10 text-brand-royal/60 mx-auto mb-3" />
              <h3 className="text-base font-medium text-typography-navy">
                Be the First to Publish
              </h3>
              <p className="mt-1 text-xs text-typography-slate leading-relaxed">
                No initiatives published yet. Turn your unfinished concept into the first initiative on IDEORA.
              </p>
              <Link
                to="/ideas/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Publish an Initiative
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 7. High-Conviction Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-surface-border bg-surface-white p-8 sm:p-12 text-center shadow-sm max-w-4xl mx-auto">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-4">
            <Rocket className="h-6 w-6" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-light text-typography-navy tracking-tight">
            Ready to bring your next product to life?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-typography-slate font-normal max-w-xl mx-auto leading-relaxed">
            Whether you have a validated concept looking for builders or the technical skills to take an idea to scale, IDEORA is where partnerships are formed.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ideas/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep active:scale-98 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              Publish an Initiative
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-6 py-3 text-sm font-semibold text-typography-navy hover:bg-surface-light active:scale-98 transition-all"
            >
              <Compass className="h-4 w-4 text-brand-royal" />
              Browse Open Roles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
