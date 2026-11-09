import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchPublishedIdeas, toggleIdeaUpvote, fetchUserUpvotedIdeaIds } from '@/services/api';
import type { Idea } from '@/types';
import {
  IdeaSearch,
  IdeaFilters,
  IdeaFilterDrawer,
  IdeaDiscoveryShortcuts,
  IdeaGrid,
  type FilterState,
  type ShortcutKey,
} from '@/components/ideas';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  // Search input state (pre-populate from URL query if user typed into DashboardHeader)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeShortcut, setActiveShortcut] = useState<ShortcutKey>('all');
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

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

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

  // Client-side filtering logic
  const filteredIdeas = useMemo(() => {
    return rawIdeas.filter((idea) => {
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
  }, [rawIdeas, searchQuery, activeShortcut, filters]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-light text-typography-navy font-heading tracking-tight leading-tight">
            Explore Ideas
          </h1>
          <p className="mt-2 text-sm sm:text-base font-normal text-typography-slate leading-relaxed">
            Discover promising ideas, find opportunities to contribute, and connect with people building something meaningful.
          </p>
        </div>

        <Link
          to="/ideas/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-deep active:scale-95 transition-all self-start sm:self-auto shrink-0 shadow-brand-royal/15"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Publish an Idea</span>
        </Link>
      </div>

      {/* 2. Discovery Shortcuts (Top of page quick toggles) */}
      <IdeaDiscoveryShortcuts
        activeShortcut={activeShortcut}
        onSelect={(key) => setActiveShortcut(key)}
      />

      {/* 3. Search Bar and Filters Bar */}
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

        {/* Desktop & Tablet Filter Dropdowns */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <IdeaFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />

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

      {/* 5. Main Idea Discovery Grid */}
      <IdeaGrid
        ideas={filteredIdeas}
        loading={loading}
        upvotedIds={upvotedIds}
        onToggleUpvote={handleToggleUpvote}
        onResetFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

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
