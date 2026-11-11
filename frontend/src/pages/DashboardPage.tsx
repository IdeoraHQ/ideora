import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Inbox,
  Send,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  ArrowUpRight,
  Clock,
  Sparkles,
  ThumbsUp,
  Users,
  RotateCw,
  AlertCircle,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserIdeas,
  fetchFounderIncomingRequests,
  fetchUserSentRequests,
  fetchPublishedIdeas,
  updateRequestStatus,
  updateIdeaStatus,
  deleteIdea,
  fetchUserUpvotedIdeaIds,
  toggleIdeaUpvote,
  getOrCreateConversation,
} from '@/services/api';
import type { Idea, CollaborationRequest, IdeaStatus } from '@/types';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { RecentIdeas } from '@/components/dashboard/RecentIdeas';
import { CollaborationRequests } from '@/components/dashboard/CollaborationRequests';
import { ActiveCollaborations } from '@/components/dashboard/ActiveCollaborations';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { IdeaCard } from '@/features/ideas/components/IdeaCard';
import { CustomSelect } from '@/components/common';

const ideaStatusOptions = [
  { label: 'Seeking Collaborators', value: 'seeking_collaborators' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Launched', value: 'launched' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

export const DashboardPage: React.FC = () => {
  const { profile, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab state can be read/controlled via URL search parameter (e.g. ?tab=ideas or ?tab=incoming)
  const currentTab = (searchParams.get('tab') as 'overview' | 'ideas' | 'incoming' | 'sent') || 'overview';

  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<CollaborationRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<CollaborationRequest[]>([]);
  const [recommendedIdeas, setRecommendedIdeas] = useState<Idea[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [ideasRes, incomingRes, sentRes, recRes, upvotedRes] = await Promise.all([
      fetchUserIdeas(profile.id),
      fetchFounderIncomingRequests(profile.id),
      fetchUserSentRequests(profile.id),
      fetchPublishedIdeas({ sortBy: 'trending' }),
      fetchUserUpvotedIdeaIds(),
    ]);

    if (ideasRes.data) setMyIdeas(ideasRes.data);
    if (incomingRes.data) setIncomingRequests(incomingRes.data);
    if (sentRes.data) setSentRequests(sentRes.data);
    setUpvotedIds(upvotedRes || []);
    if (recRes.data) {
      // Recommend ideas not created by current user
      const filtered = recRes.data.filter((i) => i.creator_id !== profile.id);
      setRecommendedIdeas(filtered.slice(0, 2));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const handleToggleUpvote = async (ideaId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    const { upvoted, upvotesCount, error } = await toggleIdeaUpvote(ideaId);
    if (!error) {
      setUpvotedIds((prev) =>
        upvoted ? [...prev, ideaId] : prev.filter((id) => id !== ideaId)
      );
      setRecommendedIdeas((prev) =>
        prev.map((item) =>
          item.id === ideaId
            ? {
                ...item,
                upvotes_count:
                  upvotesCount !== undefined
                    ? upvotesCount
                    : Math.max(0, (item.upvotes_count ?? 0) + (upvoted ? 1 : -1)),
              }
            : item
        )
      );
    }
  };

  // If unauthenticated, render a clean sign-in prompt
  if (!isAuthenticated || !profile) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-10 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-light text-typography-navy font-heading">
            Sign in to Your Workspace
          </h1>
          <p className="mt-2 text-sm font-normal text-typography-slate leading-relaxed">
            Access your published concepts, collaborate on active projects, and review incoming requests.
          </p>
          <Link
            to="/auth"
            state={{ from: '/dashboard' }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-deep transition-all"
          >
            Sign In / Register
          </Link>
        </div>
      </div>
    );
  }

  // Calculated Metrics
  const activeCollaborationsCount = sentRequests.filter((r) => r.status === 'accepted').length;
  const pendingIncomingCount = incomingRequests.filter((r) => r.status === 'pending').length;
  const activeProjectsCount = myIdeas.filter((i) => i.status === 'in_progress' || i.status === 'launched').length;
  const totalUpvotesCount = myIdeas.reduce((sum, i) => sum + (i.upvotes_count || 0), 0);

  const handleRequestAction = async (
    requestId: string,
    status: 'accepted' | 'declined' | 'withdrawn'
  ) => {
    setActionLoadingId(requestId);
    setActionError(null);
    try {
      const { error } = await updateRequestStatus(requestId, status);
      if (error) {
        setActionError(error.message || 'Failed to update request. Please try again.');
      } else {
        await loadWorkspace();
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusChange = async (ideaId: string, status: IdeaStatus) => {
    await updateIdeaStatus(ideaId, status);
    await loadWorkspace();
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (window.confirm('Are you sure you want to delete this idea?')) {
      await deleteIdea(ideaId);
      await loadWorkspace();
    }
  };

  const handleOpenConversation = async (requestId: string) => {
    setActionLoadingId(requestId);
    setActionError(null);
    try {
      const { data, error } = await getOrCreateConversation(requestId);
      if (error) {
        setActionError(error.message || 'Failed to open conversation.');
      } else if (data) {
        navigate(`/messages?id=${data.id}`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Personalized Welcome Section */}
      <WelcomeSection />

      {/* 2. Overview Statistics Row */}
      <StatsOverview
        ideasCount={myIdeas.length}
        collaborationsCount={activeCollaborationsCount}
        pendingRequestsCount={pendingIncomingCount}
        activeProjectsCount={activeProjectsCount}
        totalUpvotesCount={totalUpvotesCount}
      />

      {/* Sub-view Navigation Tabs (Overview vs Deep Workspace Managers) */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSearchParams({})}
          className={`px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
            currentTab === 'overview'
              ? 'bg-surface-white text-brand-royal shadow-xs border border-surface-border'
              : 'text-typography-slate hover:text-typography-navy'
          }`}
        >
          Dashboard Overview
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'ideas' })}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
            currentTab === 'ideas'
              ? 'bg-surface-white text-brand-royal shadow-xs border border-surface-border'
              : 'text-typography-slate hover:text-typography-navy'
          }`}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          My Ideas ({myIdeas.length})
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'incoming' })}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
            currentTab === 'incoming'
              ? 'bg-surface-white text-brand-royal shadow-xs border border-surface-border'
              : 'text-typography-slate hover:text-typography-navy'
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          Incoming Requests ({incomingRequests.length})
          {pendingIncomingCount > 0 && (
            <span className="rounded-full bg-functional-warning px-1.5 py-0.2 text-[9px] font-bold text-white">
              {pendingIncomingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'sent' })}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
            currentTab === 'sent'
              ? 'bg-surface-white text-brand-royal shadow-xs border border-surface-border'
              : 'text-typography-slate hover:text-typography-navy'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          Sent Applications ({sentRequests.length})
        </button>
        <Link
          to="/notifications"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap text-typography-slate hover:text-typography-navy hover:bg-surface-white transition-colors"
        >
          <Bell className="h-3.5 w-3.5" />
          Notifications
        </Link>
      </div>

      {/* Main Viewport Content Switching */}
      {currentTab === 'overview' ? (
        /* Responsive Two-Column Layout (Desktop: 2 cols, Tablet/Mobile: 1 col) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Primary Column (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Recent Ideas */}
            <RecentIdeas ideas={myIdeas} loading={loading} />

            {/* Your Active Collaborations */}
            <ActiveCollaborations
              collaborations={sentRequests}
              loading={loading}
              onMessage={handleOpenConversation}
            />

            {/* Recommended Ideas Section */}
            {recommendedIdeas.length > 0 && (
              <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-surface-border/70 pb-4 mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-light text-typography-navy font-heading flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-brand-royal" />
                      <span>Recommended for You</span>
                    </h2>
                    <p className="text-xs font-normal text-typography-slate mt-0.5">
                      Promising early-stage projects seeking your skill set
                    </p>
                  </div>
                  <Link
                    to="/explore"
                    className="text-xs font-semibold text-brand-royal hover:text-brand-deep flex items-center gap-1"
                  >
                    <span>Explore more</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedIdeas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      isUpvoted={upvotedIds.includes(idea.id)}
                      onToggleUpvote={handleToggleUpvote}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Secondary Column (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Pending Collaboration Requests */}
            <CollaborationRequests
              requests={incomingRequests}
              loading={loading}
              actionLoadingId={actionLoadingId}
              onAccept={(id) => handleRequestAction(id, 'accepted')}
              onDecline={(id) => handleRequestAction(id, 'declined')}
              onMessage={handleOpenConversation}
            />

            {/* Quick Actions */}
            <QuickActions />
          </div>
        </div>
      ) : currentTab === 'ideas' ? (
        /* Full Ideas Management View */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-light text-typography-navy font-heading">
                My Published Ideas
              </h2>
              <p className="text-xs font-normal text-typography-slate">
                Track and manage the progress of ideas you have introduced to IDEORA.
              </p>
            </div>
            <Link
              to="/ideas/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-deep shadow-sm transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Create New Idea</span>
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-typography-muted">
              Loading ideas...
            </div>
          ) : myIdeas.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-white p-12 text-center shadow-sm">
              <Lightbulb className="mx-auto h-8 w-8 text-typography-muted mb-2.5 opacity-60" />
              <h3 className="text-sm sm:text-base font-medium text-typography-navy">
                You haven&apos;t published any ideas yet
              </h3>
              <p className="mt-1 text-xs font-normal text-typography-slate max-w-sm mx-auto">
                Turn your thoughts into a structured concept with open roles for engineers and designers.
              </p>
              <Link
                to="/ideas/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Publish First Idea</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-surface-white p-5 shadow-sm hover:border-brand-light/70 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-brand-ice px-2 py-0.5 text-[10px] font-semibold text-brand-royal">
                        {idea.category}
                      </span>
                      <span className="rounded-full bg-surface-light px-2.5 py-0.5 text-[10px] font-medium text-typography-muted capitalize">
                        {idea.status.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-surface-soft border border-surface-border px-2 py-0.5 text-[10px] font-semibold text-typography-navy"
                        title="Community Upvotes & Likes"
                      >
                        <ThumbsUp className="h-3 w-3 text-brand-royal" />
                        <span>{idea.upvotes_count ?? 0}</span>
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-surface-soft border border-surface-border px-2 py-0.5 text-[10px] font-semibold text-typography-navy"
                        title="Active Collaborators"
                      >
                        <Users className="h-3 w-3 text-functional-success" />
                        <span>{idea.collaborators_count ?? 0}</span>
                      </span>
                    </div>
                    <Link
                      to={`/ideas/${idea.slug}`}
                      className="text-sm sm:text-base font-medium text-typography-navy hover:text-brand-royal transition-colors truncate block"
                    >
                      {idea.title}
                    </Link>
                    <p className="text-xs font-normal text-typography-slate line-clamp-2 max-w-2xl leading-relaxed">
                      {idea.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-surface-border/60">
                    <div className="w-44">
                      <CustomSelect
                        value={idea.status}
                        onChange={(val) => handleStatusChange(idea.id, val as IdeaStatus)}
                        options={ideaStatusOptions}
                        triggerClassName="py-1.5 px-3 text-xs bg-surface-soft"
                      />
                    </div>

                    <Link
                      to={`/ideas/${idea.slug}`}
                      className="rounded-xl border border-brand-royal/30 bg-brand-ice px-3 py-1.5 text-xs font-semibold text-brand-royal hover:bg-brand-pale/50 transition-colors"
                    >
                      Workspace
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="rounded-xl p-1.5 text-typography-muted hover:bg-functional-error-light hover:text-functional-error transition-colors"
                      title="Delete idea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : currentTab === 'incoming' ? (
        /* Full Incoming Requests Management */
        <div className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-light text-typography-navy font-heading">
              Incoming Collaboration Requests ({incomingRequests.length})
            </h2>
            <p className="text-xs font-normal text-typography-slate">
              Review and accept applications from builders wanting to contribute to your ideas.
            </p>
          </div>

          {actionError && (
            <div className="flex items-center gap-2 rounded-xl bg-functional-error-light border border-functional-error/20 p-3.5 text-xs text-functional-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-typography-muted">
              Loading requests...
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-white p-12 text-center shadow-sm">
              <Inbox className="mx-auto h-8 w-8 text-typography-muted mb-2.5 opacity-60" />
              <h3 className="text-sm sm:text-base font-medium text-typography-navy">
                No incoming collaborator requests
              </h3>
              <p className="mt-1 text-xs font-normal text-typography-slate max-w-sm mx-auto">
                Applications submitted by builders for your open roles will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-surface-border bg-surface-white p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${req.requester?.username || ''}`}
                          className="text-sm font-medium text-typography-navy hover:text-brand-royal"
                        >
                          {req.requester?.full_name || 'Builder'} (@{req.requester?.username})
                        </Link>
                        <span className="rounded-md bg-brand-ice px-2 py-0.5 text-xs font-semibold text-brand-royal">
                          Role: {req.role?.role_title || 'General Collaborator'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-typography-slate">
                        Applied to idea:{' '}
                        <Link
                          to={`/ideas/${req.idea?.slug || ''}`}
                          className="font-medium text-brand-royal hover:underline"
                        >
                          {req.idea?.title || 'Project'}
                        </Link>
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        req.status === 'accepted'
                          ? 'bg-functional-success-light text-functional-success'
                          : req.status === 'declined'
                            ? 'bg-functional-error-light text-functional-error'
                            : 'bg-functional-warning-light text-functional-warning'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="rounded-xl bg-surface-soft p-3 text-xs font-normal text-typography-charcoal border border-surface-border leading-relaxed">
                    {req.message}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {(req.status === 'pending' || req.status === 'accepted') && (
                      <button
                        type="button"
                        disabled={actionLoadingId === req.id}
                        onClick={() => handleOpenConversation(req.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-brand-royal/30 bg-brand-ice px-3.5 py-1.5 text-xs font-semibold text-brand-royal hover:bg-brand-pale/50 transition-colors disabled:opacity-50"
                        title="Direct message this applicant"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Message</span>
                      </button>
                    )}

                    {req.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoadingId === req.id}
                          onClick={() => handleRequestAction(req.id, 'declined')}
                          className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-soft px-3.5 py-1.5 text-xs font-medium text-typography-slate hover:bg-functional-error-light hover:text-functional-error transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Decline
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === req.id}
                          onClick={() => handleRequestAction(req.id, 'accepted')}
                          className="inline-flex items-center gap-1 rounded-xl bg-functional-success px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
                        >
                          {actionLoadingId === req.id ? (
                            <RotateCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {actionLoadingId === req.id ? 'Accepting...' : 'Accept Collaborator'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Full Sent Applications Management */
        <div className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-light text-typography-navy font-heading">
              My Sent Applications ({sentRequests.length})
            </h2>
            <p className="text-xs font-normal text-typography-slate">
              Monitor the status of your applications submitted to other founders.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-typography-muted">
              Loading applications...
            </div>
          ) : sentRequests.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-white p-12 text-center shadow-sm">
              <Send className="mx-auto h-8 w-8 text-typography-muted mb-2.5 opacity-60" />
              <h3 className="text-sm sm:text-base font-medium text-typography-navy">
                No applications sent yet
              </h3>
              <p className="mt-1 text-xs font-normal text-typography-slate max-w-sm mx-auto">
                Explore unfinished concepts and apply to open roles matching your skillset.
              </p>
              <Link
                to="/explore"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-all"
              >
                <span>Explore Open Roles</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sentRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-surface-border bg-surface-white p-5 shadow-sm space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link
                        to={`/ideas/${req.idea?.slug || ''}`}
                        className="text-base font-bold text-typography-navy hover:text-brand-royal transition-colors"
                      >
                        {req.idea?.title || 'Idea'}
                      </Link>
                      <p className="mt-0.5 text-xs text-typography-slate">
                        Applied for:{' '}
                        <span className="font-bold text-brand-royal">
                          {req.role?.role_title || 'General Collaborator'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          req.status === 'accepted'
                            ? 'bg-functional-success-light text-functional-success'
                            : req.status === 'declined'
                              ? 'bg-functional-error-light text-functional-error'
                              : req.status === 'withdrawn'
                                ? 'bg-surface-light text-typography-muted'
                                : 'bg-functional-warning-light text-functional-warning'
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {req.status}
                      </span>

                      {(req.status === 'pending' || req.status === 'accepted') && (
                        <button
                          type="button"
                          disabled={actionLoadingId === req.id}
                          onClick={() => handleOpenConversation(req.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-brand-royal/30 bg-brand-ice px-3 py-1 text-xs font-semibold text-brand-royal hover:bg-brand-pale/50 transition-colors disabled:opacity-50"
                          title="Direct message the idea founder"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Message</span>
                        </button>
                      )}

                      {req.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleRequestAction(req.id, 'withdrawn')}
                          className="rounded-xl border border-surface-border px-3 py-1 text-xs font-bold text-typography-slate hover:text-functional-error transition-colors"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="rounded-xl bg-surface-soft p-3 text-xs text-typography-slate leading-relaxed">
                    {req.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
