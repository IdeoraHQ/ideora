import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Rocket,
  ShieldCheck,
  ArrowRight,
  PlusCircle,
  TrendingUp,
  Zap,
  Globe,
  Gem,
  Users,
  Play,
  Edit3,
  Quote,
  Lightbulb,
} from 'lucide-react';
import { IdeaCard } from '@/features/ideas/components/IdeaCard';
import { SeoHead } from '@/components/seo/SeoHead';
import type { Idea } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  fetchPublishedIdeas,
  toggleIdeaUpvote,
  fetchUserUpvotedIdeaIds,
  fetchPlatformStats,
  type PlatformStats,
} from '@/services/api';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [featuredIdeas, setFeaturedIdeas] = useState<Idea[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [{ data }, upvoted, stats] = await Promise.all([
          fetchPublishedIdeas({ sortBy: 'trending' }),
          fetchUserUpvotedIdeaIds(),
          fetchPlatformStats(),
        ]);
        if (isMounted) {
          if (data) {
            setFeaturedIdeas(data);
          }
          setUpvotedIds(upvoted);
          setPlatformStats(stats);
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleToggleUpvote = async (ideaId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: '/' } });
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

  const topIdea = featuredIdeas[0] || null;

  return (
    <div className="relative isolate overflow-hidden bg-surface-soft font-sans">
      <SeoHead
        title="Ideora — Where Unfinished Ideas Find Their Builders"
        description="Discover unfinished ideas, connect with people who share your interests, and collaborate to bring promising projects to life on Ideora."
        canonicalPath="/"
      />
      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Reference: Give Your Ideas A Second Life + Floating Preview) */}
      {/* ========================================================================= */}
      <section className="relative px-4 pt-12 pb-16 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline, Subtitle, CTAs & Trust Badges */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Pill: Turn Ideas into Impact */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-pale bg-brand-ice px-4 py-1.5 text-xs font-semibold text-brand-royal shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-brand-royal animate-pulse" />
              <span>Turn Ideas into Impact</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-typography-navy font-heading leading-[1.12]">
              Give Your Ideas <br />
              <span className="text-brand-royal font-normal relative inline-block">
                A Second Life
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 250 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 9C60 2.5 190 2.5 247 9"
                    stroke="#2563EB"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-typography-slate font-normal leading-relaxed max-w-xl">
              Too many promising concepts stall before they are built. Ideora is a collaborative platform where idea owners publish unfinished projects and builders discover initiatives to co-create together.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-royal/25 hover:bg-brand-deep active:scale-98 transition-all"
              >
                <span>Explore Ideas</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/ideas/new"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-5 py-3.5 text-sm font-semibold text-typography-navy shadow-2xs hover:bg-surface-light hover:border-brand-pale active:scale-98 transition-all"
              >
                <Play className="h-4 w-4 fill-brand-royal text-brand-royal" />
                <span>Publish an Idea</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-typography-slate font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-royal" />
                <span>Secure & Trusted</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-royal" />
                <span>Built for Innovators</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-royal" />
                <span>A Growing Community</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Live Mockup Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md rounded-3xl border border-surface-border/80 bg-surface-white p-6 sm:p-7 shadow-2xl shadow-brand-royal/10 transition-transform duration-300 hover:-translate-y-1">
              {/* Fake search header */}
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-functional-error/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-functional-warning/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-functional-success/80" />
                </div>
                <span className="text-[11px] font-medium text-typography-muted bg-surface-soft px-3 py-1 rounded-full border border-surface-border">
                  ideorahq.top / workspace
                </span>
              </div>

              {/* Welcome text */}
              <div className="mt-4">
                <p className="text-base font-semibold text-typography-navy font-heading">
                  Welcome back, Builder! 👋
                </p>
                <p className="text-xs text-typography-muted">Great ideas are better together.</p>
              </div>

              {/* 3 Live Metric Mini-Cards */}
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-surface-border bg-surface-soft p-2.5 text-center">
                  <span className="block text-lg font-bold text-brand-royal font-heading">
                    {loading ? '-' : platformStats?.totalIdeas ?? 0}
                  </span>
                  <span className="block text-[10px] font-medium text-typography-slate">
                    Total Ideas
                  </span>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-soft p-2.5 text-center">
                  <span className="block text-lg font-bold text-typography-navy font-heading">
                    {loading ? '-' : platformStats?.totalBuilders ?? 0}
                  </span>
                  <span className="block text-[10px] font-medium text-typography-slate">
                    Collaborators
                  </span>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-soft p-2.5 text-center">
                  <span className="block text-lg font-bold text-functional-success font-heading">
                    {loading ? '-' : platformStats?.openRoles ?? 0}
                  </span>
                  <span className="block text-[10px] font-medium text-typography-slate">
                    Active Roles
                  </span>
                </div>
              </div>

              {/* Trending Ideas preview */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-typography-navy">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-brand-royal" />
                    Trending Initiative
                  </span>
                  <Link to="/explore" className="text-[11px] text-brand-royal hover:underline flex items-center">
                    See all &rarr;
                  </Link>
                </div>

                {topIdea ? (
                  <Link
                    to={`/ideas/${topIdea.slug}`}
                    className="block rounded-2xl border border-surface-border bg-surface-soft p-3.5 hover:border-brand-pale transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-brand-ice px-2 py-0.5 text-[10px] font-semibold text-brand-royal">
                        {topIdea.category}
                      </span>
                      <span className="text-[11px] text-typography-muted truncate">
                        by @{topIdea.author?.username || 'founder'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-typography-navy group-hover:text-brand-royal transition-colors truncate">
                      {topIdea.title}
                    </p>
                    <p className="mt-0.5 text-xs text-typography-slate line-clamp-1">
                      {topIdea.summary}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-surface-border/60 text-[11px] text-typography-muted">
                      <span className="flex items-center gap-1 font-semibold text-brand-royal">
                        {topIdea.upvotes_count} interested
                      </span>
                      <span className="text-brand-royal font-medium group-hover:translate-x-0.5 transition-transform">
                        View Initiative &rarr;
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-surface-border bg-surface-soft p-4 text-center text-xs text-typography-muted">
                    No ideas published yet. Be the first!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PLATFORM VALUE METRICS BAR (Diamond, Users, Rocket, Globe) */}
        {/* ========================================================================= */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {/* Card 1: 100% Real Ideas */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-5 text-center shadow-2xs flex flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-ice text-brand-royal mb-2">
              <Gem className="h-5 w-5" />
            </div>
            <span className="block text-2xl sm:text-3xl font-bold text-typography-navy font-heading">
              100%
            </span>
            <span className="mt-1 block text-xs font-medium text-typography-slate">
              Real Ideas
            </span>
          </div>

          {/* Card 2: Creators & Builders */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-5 text-center shadow-2xs flex flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-ice text-brand-royal mb-2">
              <Users className="h-5 w-5" />
            </div>
            <span className="block text-2xl sm:text-3xl font-bold text-brand-royal font-heading">
              {loading ? '-' : `${platformStats?.totalBuilders ?? 0}+`}
            </span>
            <span className="mt-1 block text-xs font-medium text-typography-slate">
              Creators & Builders
            </span>
          </div>

          {/* Card 3: Open Team Roles / Collaboration */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-5 text-center shadow-2xs flex flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-ice text-brand-royal mb-2">
              <Rocket className="h-5 w-5" />
            </div>
            <span className="block text-2xl sm:text-3xl font-bold text-typography-navy font-heading">
              {loading ? '-' : `${platformStats?.openRoles ?? 0}+`}
            </span>
            <span className="mt-1 block text-xs font-medium text-typography-slate">
              Collaboration Requests
            </span>
          </div>

          {/* Card 4: Global Community */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-5 text-center shadow-2xs flex flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-ice text-brand-royal mb-2">
              <Globe className="h-5 w-5" />
            </div>
            <span className="block text-2xl sm:text-3xl font-bold text-functional-success font-heading">
              Global
            </span>
            <span className="mt-1 block text-xs font-medium text-typography-slate">
              A Worldwide Community
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURED IDEAS SECTION */}
      {/* ========================================================================= */}
      <section className="py-16 bg-surface-white border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-royal block mb-1">
                FEATURED IDEAS
              </span>
              <h2 className="text-2xl sm:text-3xl font-light text-typography-navy font-heading">
                Amazing ideas, waiting for the right builders
              </h2>
              <p className="text-sm font-normal text-typography-slate mt-1 max-w-2xl">
                Discover innovative ideas from creators around the world, or share yours with the community.
              </p>
            </div>

            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-royal hover:text-brand-deep transition-colors self-start sm:self-end bg-brand-ice px-4 py-2 rounded-xl"
            >
              <span>Explore All Ideas</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-surface-border bg-surface-soft p-6 h-64 animate-pulse"
                />
              ))}
            </div>
          ) : featuredIdeas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredIdeas.slice(0, 3).map((idea) => (
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
              <h3 className="text-base font-medium text-typography-navy font-heading">
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

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS (3 Simple Steps) */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-royal">
            HOW IT WORKS
          </span>
          <h2 className="mt-2 text-3xl font-light text-typography-navy tracking-tight font-heading">
            From idea to impact in 3 simple steps
          </h2>
          <p className="mt-3 text-sm text-typography-slate font-normal leading-relaxed">
            Getting started on IDEORA is easy. Follow these steps and be part of something bigger.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative rounded-2xl border border-surface-border bg-surface-white p-6 shadow-2xs hover:border-brand-pale transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ice text-brand-royal font-bold text-sm">
                1
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-soft text-typography-navy">
                <Edit3 className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-typography-navy font-heading">
              Share or Discover Ideas
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
              Post your unfinished ideas or explore innovative concepts from others across software, AI, and design.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative rounded-2xl border border-surface-border bg-surface-white p-6 shadow-2xs hover:border-brand-pale transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ice text-brand-royal font-bold text-sm">
                2
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-soft text-typography-navy">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-typography-navy font-heading">
              Find Collaborators
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
              Connect with skilled builders, contributors, and dreamers worldwide to fill your required roles.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative rounded-2xl border border-surface-border bg-surface-white p-6 shadow-2xs hover:border-brand-pale transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ice text-brand-royal font-bold text-sm">
                3
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-soft text-typography-navy">
                <Rocket className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-typography-navy font-heading">
              Build Something Greater
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-typography-slate font-normal leading-relaxed">
              Turn ideas into real projects and make an impact together with transparent ownership and shared milestones.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. COMMUNITY CALLOUT BANNER (Dark Blue Gradient Banner) */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
        <div className="rounded-3xl bg-gradient-to-r from-brand-royal via-brand-deep to-[#0F172A] p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-light font-heading tracking-tight">
              Join a community of innovators and builders
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-normal leading-relaxed">
              Be part of a growing network of creators, developers, and problem solvers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0">
            <div className="text-center sm:text-right">
              <span className="block text-2xl sm:text-3xl font-bold font-heading">
                {loading ? '-' : `${platformStats?.totalBuilders ?? 0}+`}
              </span>
              <span className="text-xs text-white/70">Active Members</span>
            </div>

            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs sm:text-sm font-semibold text-brand-royal shadow-lg hover:bg-brand-ice transition-all active:scale-98"
            >
              <span>Join IDEORA</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TRUSTED BY CREATORS WORLDWIDE (Real Testimonials) */}
      {/* ========================================================================= */}
      <section className="py-16 bg-surface-white border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-royal">
              TRUSTED BY CREATORS WORLDWIDE
            </span>
            <h2 className="mt-2 text-3xl font-light text-typography-navy tracking-tight font-heading">
              Real people. Real impact.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-6 space-y-4">
              <Quote className="h-6 w-6 text-brand-royal/50" />
              <p className="text-xs sm:text-sm text-typography-navy leading-relaxed">
                &ldquo;IDEORA helped me find the perfect collaborator to complete my idea. Amazing platform!&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-surface-border/60">
                <div className="h-9 w-9 rounded-full bg-brand-royal text-white flex items-center justify-center font-bold text-xs uppercase">
                  SA
                </div>
                <div>
                  <p className="text-xs font-semibold text-typography-navy">Sarah Adeola</p>
                  <p className="text-[11px] text-typography-muted">Product Designer</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-6 space-y-4">
              <Quote className="h-6 w-6 text-brand-royal/50" />
              <p className="text-xs sm:text-sm text-typography-navy leading-relaxed">
                &ldquo;A great place to discover innovative ideas and work with talented builders.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-surface-border/60">
                <div className="h-9 w-9 rounded-full bg-brand-deep text-white flex items-center justify-center font-bold text-xs uppercase">
                  DO
                </div>
                <div>
                  <p className="text-xs font-semibold text-typography-navy">David Okafor</p>
                  <p className="text-[11px] text-typography-muted">Full Stack Developer</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-6 space-y-4">
              <Quote className="h-6 w-6 text-brand-royal/50" />
              <p className="text-xs sm:text-sm text-typography-navy leading-relaxed">
                &ldquo;Finally, a platform where unfinished ideas get a second chance!&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-surface-border/60">
                <div className="h-9 w-9 rounded-full bg-brand-royal text-white flex items-center justify-center font-bold text-xs uppercase">
                  AY
                </div>
                <div>
                  <p className="text-xs font-semibold text-typography-navy">Amina Yusuf</p>
                  <p className="text-[11px] text-typography-muted">Software Engineer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
