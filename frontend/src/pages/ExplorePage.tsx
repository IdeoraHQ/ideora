import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusCircle,
  Filter,
  MessageSquare,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePresence } from '@/context/PresenceContext';
import { SeoHead } from '@/components/seo/SeoHead';
import {
  fetchPublishedIdeas,
  toggleIdeaUpvote,
  fetchUserUpvotedIdeaIds,
  searchDiscoverablePeople,
  fetchRecentIdeaDiscussions,
  type RecentIdeaDiscussion,
} from '@/services/api';
import type { Idea, DiscoverablePerson } from '@/types';
import {
  IdeaSearch,
  IdeaFilters,
  IdeaFilterDrawer,
  IdeaDiscoveryShortcuts,
  ExploreFeedCard,
  ExploreCommunitySidebar,
  type FilterState,
  type ShortcutKey,
} from '@/components/ideas';
import { CustomSelect } from '@/components/common/CustomSelect';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { isUserOnline } = usePresence();

  // Search input state (pre-populate from URL query if user typed into DashboardHeader)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeShortcut, setActiveShortcut] = useState<ShortcutKey>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'upvoted' | 'roles'>('latest');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    collaborationType: 'all',
    status: 'all',
    skill: 'all',
  });

  const [rawIdeas, setRawIdeas] = useState<Idea[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [contributors, setContributors] = useState<DiscoverablePerson[]>([]);
  const [discussions, setDiscussions] = useState<RecentIdeaDiscussion[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);

  // Load ideas exclusively from Supabase API (no hardcoded fallback)
  const loadIdeas = useCallback(async () => {
    setLoading(true);

    try {
      const [{ data }, userUpvoted] = await Promise.all([
        fetchPublishedIdeas(),
        fetchUserUpvotedIdeaIds(),
      ]);

      setRawIdeas(data || []);
      setUpvotedIds(userUpvoted || []);
    } catch {
      setRawIdeas([]);
      setUpvotedIds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCommunityFeed = useCallback(async () => {
    setLoadingCommunity(true);
    try {
      const [peopleRes, discussionsRes] = await Promise.all([
        searchDiscoverablePeople({ limit: 8 }),
        fetchRecentIdeaDiscussions(4),
      ]);
      setContributors(peopleRes.data || []);
      setDiscussions(discussionsRes.data || []);
    } catch {
      setContributors([]);
      setDiscussions([]);
    } finally {
      setLoadingCommunity(false);
    }
  }, []);

  useEffect(() => {
    void loadIdeas();
    void loadCommunityFeed();
  }, [loadIdeas, loadCommunityFeed]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.category !== 'all' ||
      filters.collaborationType !== 'all' ||
      filters.status !== 'all' ||
      filters.skill !== 'all' ||
      searchQuery.trim().length > 0 ||
      activeShortcut !== 'all'
    );
  }, [filters, searchQuery, activeShortcut]);

  // Reset all filters
  const handleClearFilters = () => {
    setFilters({
      category: 'all',
      collaborationType: 'all',
      status: 'all',
      skill: 'all',
    });
    setSearchQuery('');
    setActiveShortcut('all');
  };

  // Upvote handling
  const handleToggleUpvote = async (ideaId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: '/explore' } });
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
        setRawIdeas((prev) =>
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

  // Compute live shortcut counts from real ideas
  const shortcutCounts = useMemo(() => {
    const threeDaysAgo = Date.now() - 86400000 * 3;
    let recent = 0;
    let collaborators = 0;
    let adoption = 0;

    for (const idea of rawIdeas) {
      const createdMs = new Date(idea.created_at).getTime();
      if (createdMs >= threeDaysAgo) recent += 1;
      if (idea.status === 'seeking_collaborators') collaborators += 1;
      if (idea.collaboration_type === 'co_founder') adoption += 1;
    }

    return {
      all: rawIdeas.length,
      recent,
      collaborators,
      adoption,
    };
  }, [rawIdeas]);

  // Client-side filtering & sorting logic
  const filteredIdeas = useMemo(() => {
    const filtered = rawIdeas.filter((idea) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = idea.title.toLowerCase().includes(q);
        const matchesSummary = idea.summary.toLowerCase().includes(q);
        const matchesCategory = idea.category.toLowerCase().includes(q);
        const matchesTags = idea.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesSkills = idea.rolesNeeded?.some((r) =>
          r.role_title.toLowerCase().includes(q)
        );

        if (!matchesTitle && !matchesSummary && !matchesCategory && !matchesTags && !matchesSkills) {
          return false;
        }
      }

      // 2. Shortcut Filter
      if (activeShortcut === 'recent') {
        const threeDaysAgo = Date.now() - 86400000 * 3;
        if (new Date(idea.created_at).getTime() < threeDaysAgo) return false;
      } else if (activeShortcut === 'collaborators') {
        if (idea.status !== 'seeking_collaborators') return false;
      } else if (activeShortcut === 'adoption') {
        if (idea.collaboration_type !== 'co_founder') return false;
      }

      // 3. Category Filter
      if (filters.category !== 'all' && idea.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }

      // 4. Collaboration Type Filter
      if (filters.collaborationType !== 'all' && idea.collaboration_type !== filters.collaborationType) {
        return false;
      }

      // 5. Development Status Filter
      if (filters.status !== 'all' && idea.status !== filters.status) {
        return false;
      }

      // 6. Required Skill Category Filter
      if (filters.skill !== 'all') {
        const hasMatchingRole = idea.rolesNeeded?.some(
          (role) => role.category === filters.skill
        );
        if (!hasMatchingRole) return false;
      }

      return true;
    });

    if (sortBy === 'upvoted') {
      return [...filtered].sort(
        (a, b) => (b.upvotes_count ?? 0) - (a.upvotes_count ?? 0)
      );
    }
    if (sortBy === 'roles') {
      return [...filtered].sort(
        (a, b) => (b.rolesNeeded?.length ?? 0) - (a.rolesNeeded?.length ?? 0)
      );
    }
    return filtered;
  }, [rawIdeas, searchQuery, activeShortcut, filters, sortBy]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <SeoHead
        title="Explore Unfinished Ideas & Collaboration Projects | Ideora"
        description="Browse unfinished ideas, active initiatives, and open collaboration roles on Ideora. Filter by category, skills, and collaboration type to find your next project."
        canonicalPath="/explore"
      />
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-light text-typography-navy font-heading tracking-tight leading-tight">
            Explore Ideas
          </h1>
          <p className="mt-2 text-sm sm:text-base font-normal text-typography-slate leading-relaxed">
            Discover promising ideas, find opportunities to contribute, and connect with people building something meaningful.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap lg:flex-col items-stretch gap-2.5 self-start lg:self-auto shrink-0">
          <Link
            to="/ideas/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-deep active:scale-95 transition-all shadow-brand-royal/15"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Publish an Idea</span>
          </Link>
          <a
            href="https://discord.gg/SwaJqVftV"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-medium text-typography-navy hover:border-brand-pale hover:text-brand-royal transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-brand-royal" />
            <span>Join Community Discord</span>
          </a>
        </div>
      </div>

      {/* 2. Discovery Shortcuts (Top of page quick toggles with live counts) */}
      <IdeaDiscoveryShortcuts
        activeShortcut={activeShortcut}
        onSelect={(key) => setActiveShortcut(key)}
        counts={shortcutCounts}
      />

      {/* 3. Search Bar, Filters & Sort Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {/* Main Search Input */}
          <div className="flex-1">
            <IdeaSearch value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Mobile Filter Button (Triggers Drawer on <768px) */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="md:hidden inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-3.5 py-2.5 text-xs font-medium text-typography-navy shadow-2xs hover:bg-surface-light transition-colors shrink-0"
          >
            <Filter className="h-4 w-4 text-brand-royal" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-brand-royal" />
            )}
          </button>
        </div>

        {/* Desktop & Tablet Filter Dropdowns + Sort */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <IdeaFilters
              filters={filters}
              onChange={setFilters}
              onClear={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
            />
            <div className="inline-flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-typography-muted" />
              <CustomSelect
                value={sortBy}
                onChange={(val) =>
                  setSortBy(val as 'latest' | 'upvoted' | 'roles')
                }
                options={[
                  { label: 'Sort: Latest', value: 'latest' },
                  { label: 'Sort: Most Upvoted', value: 'upvoted' },
                  { label: 'Sort: Most Open Roles', value: 'roles' },
                ]}
                className="w-auto min-w-[170px]"
              />
            </div>
          </div>

          <span className="text-xs text-typography-muted whitespace-nowrap">
            Showing <strong className="font-semibold text-typography-navy">{filteredIdeas.length}</strong>{' '}
            {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
          </span>
        </div>
      </div>

      {/* 4. Active Filters Badges Indicator */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-typography-muted font-normal mr-1">Active filters:</span>
          {filters.category !== 'all' && (
            <span className="rounded-lg bg-surface-white border border-surface-border px-2 py-0.5 font-semibold text-brand-royal">
              Category: {filters.category}
            </span>
          )}
          {filters.collaborationType !== 'all' && (
            <span className="rounded-lg bg-surface-white border border-surface-border px-2 py-0.5 font-semibold text-brand-royal capitalize">
              Model: {filters.collaborationType.replace(/_/g, ' ')}
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="rounded-lg bg-surface-white border border-surface-border px-2 py-0.5 font-semibold text-brand-royal capitalize">
              Status: {filters.status.replace(/_/g, ' ')}
            </span>
          )}
          {filters.skill !== 'all' && (
            <span className="rounded-lg bg-surface-white border border-surface-border px-2 py-0.5 font-semibold text-brand-royal capitalize">
              Skill: {filters.skill}
            </span>
          )}
          {activeShortcut !== 'all' && (
            <span className="rounded-lg bg-brand-ice border border-brand-pale px-2 py-0.5 font-semibold text-brand-royal">
              Shortcut: {activeShortcut}
            </span>
          )}
          {searchQuery.trim() && (
            <span className="rounded-lg bg-surface-white border border-surface-border px-2 py-0.5 font-semibold text-typography-navy">
              &ldquo;{searchQuery}&rdquo;
            </span>
          )}
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-[11px] font-semibold text-functional-error hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 5. Main Two-Column Discovery Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Left: Wide Actionable Idea Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-56 rounded-2xl border border-surface-border bg-surface-white p-6 animate-pulse space-y-4"
                >
                  <div className="flex justify-between">
                    <div className="h-6 w-48 rounded-lg bg-surface-soft" />
                    <div className="h-8 w-24 rounded-xl bg-surface-soft" />
                  </div>
                  <div className="h-6 w-3/4 rounded-lg bg-surface-soft" />
                  <div className="h-12 w-full rounded-lg bg-surface-soft" />
                  <div className="h-8 w-1/2 rounded-lg bg-surface-soft" />
                </div>
              ))}
            </div>
          ) : filteredIdeas.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-white p-10 text-center space-y-3">
              <p className="text-base font-medium text-typography-navy">
                No matching ideas found
              </p>
              <p className="text-sm text-typography-slate max-w-md mx-auto">
                {hasActiveFilters
                  ? 'Try adjusting or clearing your active filters to see more projects.'
                  : 'Be the first to publish an idea and invite collaborators.'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-semibold text-typography-navy hover:border-brand-pale hover:text-brand-royal transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Filters
                </button>
              ) : (
                <Link
                  to="/ideas/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Publish an Idea
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIdeas.map((idea) => (
                <ExploreFeedCard
                  key={idea.id}
                  idea={idea}
                  isUpvoted={upvotedIds.includes(idea.id)}
                  isAuthorOnline={isUserOnline(idea.creator_id)}
                  onToggleUpvote={handleToggleUpvote}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Community Feed Sidebar (desktop only, sticky on scroll) */}
        <ExploreCommunitySidebar
          contributors={contributors}
          discussions={discussions}
          loading={loadingCommunity}
          isUserOnline={isUserOnline}
          className="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-1"
        />
      </div>

      {/* 6. Mobile Filter Drawer Modal */}
      <IdeaFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onChange={setFilters}
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
};
