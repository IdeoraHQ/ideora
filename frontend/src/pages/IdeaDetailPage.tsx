import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ThumbsUp,
  Users,
  Layers,
  CheckCircle2,
  XCircle,
  Send,
  MessageSquare,
  Github,
  Globe,
  Linkedin,
  Sparkles,
  AlertCircle,
  Clock,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomSelect } from '@/components/common';
import {
  fetchIdeaBySlug,
  toggleIdeaUpvote,
  fetchUserUpvotedIdeaIds,
  updateIdeaStatus,
  fetchIdeaComments,
  createIdeaComment,
  submitCollaborationRequest,
  fetchIdeaRequests,
  updateRequestStatus,
} from '@/services/api';
import type {
  Idea,
  IdeaStatus,
  IdeaComment,
  CollaborationRequest,
  IdeaRoleNeeded,
} from '@/types';

const statusOptions: { label: string; value: IdeaStatus }[] = [
  { label: 'Seeking Collaborators', value: 'seeking_collaborators' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Launched', value: 'launched' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

export const IdeaDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useAuth();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);

  // Application Modal State
  const [applyingRole, setApplyingRole] = useState<IdeaRoleNeeded | null>(null);
  const [applyGeneral, setApplyGeneral] = useState(false);
  const [pitchMessage, setPitchMessage] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Comment State
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const loadIdeaData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const { data } = await fetchIdeaBySlug(slug);
    if (!data) {
      setIdea(null);
      setLoading(false);
      return;
    }

    setIdea(data);

    const [upvotedIds, commentsRes, requestsRes] = await Promise.all([
      fetchUserUpvotedIdeaIds(),
      fetchIdeaComments(data.id),
      fetchIdeaRequests(data.id),
    ]);

    setIsUpvoted(upvotedIds.includes(data.id));
    if (commentsRes.data) setComments(commentsRes.data);
    if (requestsRes.data) setRequests(requestsRes.data);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void loadIdeaData();
  }, [loadIdeaData, profile?.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-bold text-typography-slate">
          <Sparkles className="h-4 w-4 animate-spin text-brand-royal" />
          Loading project workspace...
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-10 shadow-sm">
          <h1 className="text-3xl font-light text-typography-navy">
            Idea Not Found
          </h1>
          <p className="mt-2 text-sm font-normal text-typography-slate">
            This project may have been moved or removed.
          </p>
          <Link
            to="/explore"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Explore Ideas
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = Boolean(profile && profile.id === idea.creator_id);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const myExistingRequests = requests.filter(
    (r) => r.requester_id === profile?.id && r.status !== 'withdrawn'
  );

  const handleUpvote = async () => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: `/ideas/${idea.slug}` } });
      return;
    }
    if (isUpvoting) return;

    setIsUpvoting(true);
    try {
      const { upvoted, upvotesCount, error } = await toggleIdeaUpvote(idea.id);
      if (!error) {
        setIsUpvoted(upvoted);
        setIdea((prev) =>
          prev
            ? {
                ...prev,
                upvotes_count:
                  upvotesCount !== undefined
                    ? upvotesCount
                    : Math.max(0, prev.upvotes_count + (upvoted ? 1 : -1)),
              }
            : null
        );
      }
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleStatusChange = async (newStatus: IdeaStatus) => {
    const { data } = await updateIdeaStatus(idea.id, newStatus);
    if (data) {
      setIdea((prev) => (prev ? { ...prev, status: data.status } : null));
    }
  };

  const openApplicationForm = (role: IdeaRoleNeeded | null) => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: `/ideas/${idea.slug}` } });
      return;
    }
    setApplyingRole(role);
    setApplyGeneral(role === null);
    setApplyError(null);
    setApplySuccess(null);
    setPitchMessage('');
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);

    if (pitchMessage.trim().length < 15) {
      setApplyError(
        'Please introduce yourself and your relevant experience (at least 15 characters).'
      );
      return;
    }

    setSubmittingRequest(true);
    const { data, error } = await submitCollaborationRequest({
      idea_id: idea.id,
      role_id: applyingRole?.id,
      message: pitchMessage,
    });
    setSubmittingRequest(false);

    if (error) {
      setApplyError(error.message);
      return;
    }

    if (data) {
      setRequests((prev) => [data, ...prev]);
      setApplySuccess(
        `Application submitted for ${applyingRole?.role_title || 'General Collaboration'}! The founder has been notified.`
      );
      setApplyingRole(null);
      setApplyGeneral(false);
      setPitchMessage('');
    }
  };

  const handleReviewRequest = async (
    requestId: string,
    decision: 'accepted' | 'declined'
  ) => {
    const { data } = await updateRequestStatus(requestId, decision);
    if (data) {
      await loadIdeaData();
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: `/ideas/${idea.slug}` } });
      return;
    }
    if (!commentText.trim()) return;

    setPostingComment(true);
    const { data } = await createIdeaComment(idea.id, commentText);
    setPostingComment(false);

    if (data) {
      setComments((prev) => [...prev, data]);
      setCommentText('');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-typography-slate hover:text-brand-royal transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore Ideas
        </Link>

        {isCreator && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-typography-slate">
              Project Status:
            </span>
            <div className="w-44">
              <CustomSelect
                value={idea.status}
                onChange={(val) => handleStatusChange(val as IdeaStatus)}
                options={statusOptions}
                triggerClassName="py-1.5 px-3 text-xs bg-brand-ice border-brand-royal/30 text-brand-royal font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {applySuccess && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-functional-success/30 bg-functional-success-light px-5 py-4 text-xs font-bold text-functional-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{applySuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setApplySuccess(null)}
            className="text-sm font-black"
          >
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-w-0 max-w-full">
        {/* Main Left Column (8 cols) */}
        <div className="lg:col-span-8 min-w-0 max-w-full space-y-8">
          {/* Idea Hero Card */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 max-w-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-ice px-3 py-1 text-xs font-bold text-brand-royal">
                  <Layers className="h-3.5 w-3.5" />
                  {idea.category}
                </span>
                <span className="rounded-full border border-brand-pale bg-surface-soft px-3 py-1 text-xs font-bold text-typography-navy capitalize">
                  {idea.collaboration_type.replace(/_/g, ' ')}
                </span>
                <span className="rounded-full bg-functional-success-light px-3 py-1 text-xs font-bold text-functional-success capitalize">
                  {idea.status.replace(/_/g, ' ')}
                </span>
              </div>

              <button
                type="button"
                disabled={isUpvoting}
                onClick={handleUpvote}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm ${
                  isUpvoted
                    ? 'bg-brand-royal text-white shadow-brand-royal/20'
                    : 'border border-surface-border bg-surface-soft text-typography-navy hover:border-brand-royal hover:text-brand-royal'
                } ${isUpvoting ? 'opacity-60 cursor-not-allowed' : ''}`}
                title={isUpvoted ? 'You have upvoted this idea' : 'Upvote this idea'}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{isUpvoted ? 'Upvoted' : 'Upvote Idea'}</span>
                <span className="rounded-md bg-black/10 px-1.5 py-0.5 text-[11px]">
                  {idea.upvotes_count}
                </span>
              </button>
            </div>

            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-[40px] font-light text-typography-navy leading-tight tracking-tight break-all [word-break:break-all]">
              {idea.title}
            </h1>

            <p className="mt-3 text-base font-normal text-typography-slate leading-relaxed break-all [word-break:break-all]">
              {idea.summary}
            </p>

            {/* Tags */}
            <div className="mt-5 flex flex-wrap gap-2">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-surface-light px-3 py-1 text-xs font-normal text-typography-slate break-all"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Detailed Description */}
            <div className="mt-8 border-t border-surface-border pt-6 min-w-0 max-w-full overflow-hidden">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-typography-muted mb-3">
                Project Vision & Details
              </h2>
              <div className="prose prose-sm max-w-none text-typography-charcoal whitespace-pre-line leading-relaxed text-sm font-normal break-all [word-break:break-all] overflow-hidden">
                {idea.description}
              </div>
            </div>
          </div>

          {/* Open Roles Section */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-royal" />
                  Open Collaborator Roles
                </h2>
                <p className="text-xs text-typography-slate mt-1">
                  Apply directly for a role below to join this build team.
                </p>
              </div>

              {!isCreator && (
                <button
                  type="button"
                  onClick={() => openApplicationForm(null)}
                  className="rounded-xl border border-brand-royal/30 bg-brand-ice px-3.5 py-2 text-xs font-bold text-brand-royal hover:bg-brand-pale/60 transition-colors"
                >
                  Pitch Custom Role
                </button>
              )}
            </div>

            {idea.rolesNeeded && idea.rolesNeeded.length > 0 ? (
              <div className="space-y-4">
                {idea.rolesNeeded.map((role) => {
                  const isFull = role.spots_filled >= role.spots_available;
                  const alreadyApplied = myExistingRequests.some(
                    (r) => r.role_id === role.id
                  );

                  return (
                    <div
                      key={role.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-surface-border bg-surface-soft p-5 min-w-0 max-w-full overflow-hidden"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-base font-bold text-typography-navy break-all [word-break:break-all]">
                            {role.role_title}
                          </h3>
                          <span className="rounded-md bg-brand-ice border border-brand-pale px-2 py-0.5 text-[11px] font-bold text-brand-royal uppercase">
                            {role.category}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              isFull
                                ? 'text-typography-muted'
                                : 'text-functional-success'
                            }`}
                          >
                            {role.spots_filled}/{role.spots_available} filled
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-xs text-typography-slate break-all [word-break:break-all] overflow-hidden">
                            {role.description}
                          </p>
                        )}
                      </div>

                      {!isCreator && (
                        <div className="shrink-0">
                          {alreadyApplied ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ice px-4 py-2 text-xs font-bold text-brand-royal">
                              <Clock className="h-3.5 w-3.5" />
                              Application Sent
                            </span>
                          ) : isFull ? (
                            <span className="inline-flex items-center rounded-xl bg-surface-light px-4 py-2 text-xs font-bold text-typography-muted">
                              Role Filled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openApplicationForm(role)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-deep transition-all"
                            >
                              Apply for Role
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-typography-slate">
                No specific roles listed — use &ldquo;Pitch Custom Role&rdquo; to propose how you can contribute!
              </p>
            )}

            {/* Inline Application Composer */}
            {(applyingRole !== null || applyGeneral) && (
              <form
                onSubmit={handleSubmitApplication}
                className="mt-6 rounded-2xl border-2 border-brand-royal/30 bg-brand-ice/30 p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-typography-navy">
                    Apply for:{' '}
                    <span className="text-brand-royal">
                      {applyingRole?.role_title || 'General Collaboration'}
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setApplyingRole(null);
                      setApplyGeneral(false);
                    }}
                    className="text-xs font-bold text-typography-slate hover:text-typography-navy"
                  >
                    Cancel
                  </button>
                </div>

                {applyError && (
                  <div className="flex items-center gap-2 rounded-xl bg-functional-error-light p-3 text-xs font-semibold text-functional-error">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{applyError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Your Pitch & Relevant Experience
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={pitchMessage}
                    onChange={(e) => setPitchMessage(e.target.value)}
                    placeholder="Share why this idea excites you, your technical/design background, and how many hours/week you can commit..."
                    className="w-full rounded-xl border border-surface-border bg-surface-white p-3.5 text-sm text-typography-navy focus:border-brand-royal focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-deep disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submittingRequest
                      ? 'Sending Application...'
                      : 'Submit Collaboration Request'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Founder Request Management Panel (Visible to Creator) */}
          {isCreator && (
            <div className="rounded-2xl border border-brand-pale bg-brand-ice/20 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2">
                    <Shield className="h-5 w-5 text-brand-royal" />
                    Founder Review: Incoming Collaboration Requests (
                    {requests.length})
                  </h2>
                  <p className="text-xs text-typography-slate mt-0.5">
                    Accepting an applicant automatically fills their role seat and adds them to your collaborator count.
                  </p>
                </div>
              </div>

              {requests.length === 0 ? (
                <p className="text-xs text-typography-slate py-4">
                  No applications received for this idea yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-surface-border bg-surface-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-royal text-white text-xs font-bold">
                            {req.requester?.full_name.charAt(0) || 'B'}
                          </div>
                          <div>
                            <Link
                              to={`/profile/${req.requester?.username || ''}`}
                              className="text-sm font-bold text-typography-navy hover:text-brand-royal"
                            >
                              {req.requester?.full_name || 'Builder'}
                            </Link>
                            <span className="ml-2 rounded-md bg-brand-ice px-2 py-0.5 text-[11px] font-bold text-brand-royal">
                              Role: {req.role?.role_title || 'General Collaborator'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
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

                      <p className="mt-3 text-xs text-typography-charcoal leading-relaxed bg-surface-soft p-3.5 rounded-xl border border-surface-border break-all [word-break:break-all]">
                        {req.message}
                      </p>

                      {req.status === 'pending' && (
                        <div className="mt-4 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewRequest(req.id, 'declined')}
                            className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-soft px-3.5 py-1.5 text-xs font-bold text-typography-slate hover:bg-functional-error-light hover:text-functional-error transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewRequest(req.id, 'accepted')}
                            className="inline-flex items-center gap-1 rounded-xl bg-functional-success px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Accept Collaborator
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Community Discussion & Feedback */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2 mb-6">
              <MessageSquare className="h-5 w-5 text-brand-royal" />
              Discussion & Architecture Feedback ({comments.length})
            </h2>

            <div className="space-y-4 mb-6">
              {comments.length === 0 ? (
                <p className="text-xs text-typography-slate py-2">
                  No comments yet. Ask the founder a question or suggest a technical approach!
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-surface-border bg-surface-soft p-4"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <Link
                        to={`/profile/${c.author?.username || ''}`}
                        className="font-bold text-typography-navy hover:text-brand-royal"
                      >
                        {c.author?.full_name || 'Builder'}{' '}
                        <span className="font-normal text-typography-muted">
                          @{c.author?.username || 'user'}
                        </span>
                      </Link>
                      <span className="text-[11px] text-typography-muted">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-typography-charcoal leading-relaxed whitespace-pre-line break-all [word-break:break-all]">
                      {c.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handlePostComment} className="space-y-3">
              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  isAuthenticated
                    ? 'Ask a question, propose an architecture idea, or offer feedback...'
                    : 'Sign in to join the discussion...'
                }
                className="w-full rounded-xl border border-surface-border bg-surface-soft p-3.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={postingComment}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-deep disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {postingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Sidebar (4 cols): Founder Profile & Team Summary */}
        <div className="lg:col-span-4 min-w-0 max-w-full space-y-6">
          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm overflow-hidden min-w-0 max-w-full">
            <h3 className="text-xs font-bold uppercase tracking-wider text-typography-muted mb-4">
              Idea Creator
            </h3>

            {idea.author ? (
              <div className="min-w-0 max-w-full">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-royal text-white text-lg font-black">
                    {idea.author.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/profile/${idea.author.username}`}
                      className="text-base font-bold text-typography-navy hover:text-brand-royal block truncate"
                    >
                      {idea.author.full_name}
                    </Link>
                    <p className="text-xs text-typography-slate truncate">
                      @{idea.author.username} &bull;{' '}
                      <span className="capitalize font-semibold text-brand-royal">
                        {idea.author.role}
                      </span>
                    </p>
                  </div>
                </div>

                {idea.author.bio && (
                  <p className="mt-4 text-xs text-typography-slate leading-relaxed break-all [word-break:break-all]">
                    {idea.author.bio}
                  </p>
                )}

                {idea.author.skills && idea.author.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {idea.author.skills.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-md bg-surface-light px-2.5 py-1 text-[11px] font-semibold text-typography-slate uppercase"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex items-center gap-3 border-t border-surface-border pt-4">
                  {idea.author.github_url && (
                    <a
                      href={idea.author.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-typography-slate hover:text-brand-royal"
                      title="GitHub"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                  {idea.author.linkedin_url && (
                    <a
                      href={idea.author.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-typography-slate hover:text-brand-royal"
                      title="LinkedIn"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {idea.author.website_url && (
                    <a
                      href={idea.author.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-typography-slate hover:text-brand-royal"
                      title="Website"
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                  <Link
                    to={`/profile/${idea.author.username}`}
                    className="ml-auto text-xs font-bold text-brand-royal hover:text-brand-deep shrink-0"
                  >
                    View Profile &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-typography-slate">Anonymous Creator</p>
            )}
          </div>

          {/* Collaboration Snapshot */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm space-y-4 overflow-hidden min-w-0 max-w-full">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-typography-muted">
              Collaboration Snapshot
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-soft p-3.5 border border-surface-border">
                <span className="text-[11px] font-normal text-typography-muted block">
                  Active Builders
                </span>
                <span className="text-xl font-bold text-typography-navy">
                  {idea.collaborators_count}
                </span>
              </div>
              <div className="rounded-xl bg-surface-soft p-3.5 border border-surface-border">
                <span className="text-[11px] font-normal text-typography-muted block">
                  Community Upvotes
                </span>
                <span className="text-xl font-bold text-brand-royal">
                  {idea.upvotes_count}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-typography-slate leading-relaxed">
              Published on {new Date(idea.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

