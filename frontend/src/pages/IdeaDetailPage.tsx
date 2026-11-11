import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Edit3,
  Calendar,
  ChevronRight,
  Milestone,
  Compass,
  FileText,
  Check,
  Briefcase,
  Clock3,
  Scale,
  X,
  Target,
  Lightbulb,
  Share2,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomSelect } from '@/components/common';
import {
  fetchIdeaBySlug,
  toggleIdeaUpvote,
  fetchUserUpvotedIdeaIds,
  updateIdeaStatus,
  updateIdea,
  fetchIdeaComments,
  createIdeaComment,
  submitCollaborationRequest,
  fetchIdeaRequests,
  updateRequestStatus,
  getOrCreateConversation,
} from '@/services/api';
import type {
  Idea,
  IdeaStatus,
  IdeaComment,
  CollaborationRequest,
  IdeaRoleNeeded,
  CollaborationType,
} from '@/types';

const statusOptions: { label: string; value: IdeaStatus }[] = [
  { label: 'Seeking Collaborators', value: 'seeking_collaborators' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Launched', value: 'launched' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const categoryOptions = [
  'Developer Tools',
  'Fintech',
  'HealthTech',
  'Creator Economy',
  'Climate & Sustainability',
  'Education',
  'AI & Automation',
  'Consumer Social',
];

export const IdeaDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useAuth();

  // Primary Data State
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Application Modal / Composer State
  const [applyingRole, setApplyingRole] = useState<IdeaRoleNeeded | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [pitchMessage, setPitchMessage] = useState('');
  const [commitmentHours, setCommitmentHours] = useState('10-15');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Creator Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCollabType, setEditCollabType] = useState<CollaborationType>('co_founder');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    setEditTitle(data.title);
    setEditSummary(data.summary);
    setEditDescription(data.description);
    setEditCategory(data.category);
    setEditCollabType(data.collaboration_type);

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

  // Ownership & Roles Calculations (declared safely at top level)
  const isCreator = Boolean(profile && idea && profile.id === idea.creator_id);

  const myExistingRequest = useMemo(() => {
    if (!profile || !requests.length) return null;
    return (
      requests.find(
        (r) => r.requester_id === profile.id && r.status !== 'withdrawn'
      ) || null
    );
  }, [profile, requests]);

  const hasAlreadyApplied = Boolean(myExistingRequest);

  // Primary Action Button Label based on collaboration type
  const getPrimaryActionLabel = (type: string) => {
    switch (type) {
      case 'advisor':
        return 'Request to Adopt';
      case 'open_source':
        return 'Join Project';
      case 'co_founder':
      case 'contributor':
      default:
        return 'Request to Collaborate';
    }
  };

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleUpvote = async () => {
    if (!idea) return;
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
    if (!idea) return;
    const { data } = await updateIdeaStatus(idea.id, newStatus);
    if (data) {
      setIdea((prev) => (prev ? { ...prev, status: data.status } : null));
    }
  };

  const openApplicationModal = (role: IdeaRoleNeeded | null = null) => {
    if (!idea) return;
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: `/ideas/${idea.slug}` } });
      return;
    }
    setApplyingRole(role);
    setApplyError(null);
    setPitchMessage('');
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea) return;
    setApplyError(null);

    if (pitchMessage.trim().length < 15) {
      setApplyError(
        'Please introduce yourself and your relevant background (at least 15 characters).'
      );
      return;
    }

    setSubmittingRequest(true);
    const formattedMessage = commitmentHours
      ? `${pitchMessage.trim()}\n\n[Expected Commitment: ${commitmentHours} hrs/week]`
      : pitchMessage.trim();

    const { data, error } = await submitCollaborationRequest({
      idea_id: idea.id,
      role_id: applyingRole?.id,
      message: formattedMessage,
    });
    setSubmittingRequest(false);

    if (error) {
      setApplyError(error.message);
      return;
    }

    if (data) {
      setRequests((prev) => [data, ...prev]);
      setShowApplyModal(false);
      setApplySuccess(
        `Application submitted for ${applyingRole?.role_title || 'General Collaboration'}! The founder has been notified.`
      );
      setPitchMessage('');
      setTimeout(() => setApplySuccess(null), 6000);
    }
  };

  const handleSaveEditIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea) return;
    setIsSavingEdit(true);
    setEditError(null);

    const { data, error } = await updateIdea(idea.id, {
      title: editTitle.trim(),
      summary: editSummary.trim(),
      description: editDescription.trim(),
      category: editCategory,
      collaboration_type: editCollabType,
    });

    setIsSavingEdit(false);

    if (error || !data) {
      setEditError(error?.message || 'Failed to update idea');
      return;
    }

    setIdea((prev) =>
      prev
        ? {
            ...prev,
            title: data.title,
            summary: data.summary,
            description: data.description,
            category: data.category,
            collaboration_type: data.collaboration_type,
            updated_at: data.updated_at,
          }
        : null
    );
    setShowEditModal(false);
  };

  const handleReviewRequest = async (
    requestId: string,
    decision: 'accepted' | 'declined'
  ) => {
    setReviewingRequestId(requestId);
    setReviewError(null);
    try {
      const { data, error } = await updateRequestStatus(requestId, decision);
      if (error) {
        setReviewError(error.message || 'Failed to update collaboration request.');
      } else if (data) {
        await loadIdeaData();
      }
    } finally {
      setReviewingRequestId(null);
    }
  };

  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);

  const handleOpenConversation = async (requestId: string) => {
    setOpeningConversationId(requestId);
    try {
      const { data, error } = await getOrCreateConversation(requestId);
      if (error) {
        alert(error.message || 'Failed to open conversation.');
      } else if (data) {
        navigate(`/messages?id=${data.id}`);
      }
    } finally {
      setOpeningConversationId(null);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea) return;
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

  // 1. Loading State
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-brand-royal animate-spin mb-3" />
        <p className="text-sm font-medium text-typography-slate">
          Loading project workspace...
        </p>
      </div>
    );
  }

  // 2. Not Found State
  if (!idea) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="rounded-3xl border border-surface-border bg-surface-white p-10 shadow-2xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-4">
            <Lightbulb className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-light text-typography-navy tracking-tight">
            Idea Not Found
          </h1>
          <p className="mt-2 text-sm text-typography-slate font-normal leading-relaxed">
            This initiative may have been removed or changed its link.
          </p>
          <Link
            to="/explore"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore Ideas
          </Link>
        </div>
      </div>
    );
  }

  // Format Labels
  const formatCollabLabel = (type: string) => {
    switch (type) {
      case 'co_founder':
        return 'Looking for Co-Founder';
      case 'contributor':
        return 'Seeking Contributors';
      case 'open_source':
        return 'Open Source Build';
      case 'advisor':
        return 'Up for Adoption / Advisory';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case 'seeking_collaborators':
        return 'Seeking Collaborators';
      case 'in_progress':
        return 'In Development';
      case 'launched':
        return 'Active / Launched';
      case 'draft':
        return 'Draft Concept';
      case 'archived':
        return 'Archived';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const openSpotsCount =
    idea.rolesNeeded?.reduce(
      (sum, r) => sum + Math.max(0, r.spots_available - r.spots_filled),
      0
    ) || 0;

  // Roadmap Stages definition
  const roadmapStages = [
    { title: '1. Concept & Ideation', status: 'completed', desc: 'Core vision, problem validation, and initial market thesis documented.' },
    {
      title: '2. Architecture & Team',
      status: idea.status === 'seeking_collaborators' ? 'current' : 'completed',
      desc: 'Assembling lead engineering roles and finalizing tech stack & system design.',
    },
    {
      title: '3. MVP Prototype',
      status: idea.status === 'in_progress' ? 'current' : idea.status === 'launched' ? 'completed' : 'upcoming',
      desc: 'Hands-on sprint to ship core functional flows and alpha test with prospective users.',
    },
    {
      title: '4. Community Beta',
      status: idea.status === 'launched' ? 'completed' : 'upcoming',
      desc: 'Closed feedback loops, telemetry monitoring, and stability hardening.',
    },
    {
      title: '5. Production Scale',
      status: idea.status === 'launched' ? 'current' : 'upcoming',
      desc: 'General availability, continuous deployment pipelines, and user acquisition.',
    },
  ];

  return (
    <div className="min-h-screen bg-surface-soft pb-24">
      {/* 1. Header & Breadcrumb Strip */}
      <div className="border-b border-surface-border bg-surface-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Breadcrumb Navigation: Overview / Explore Ideas / Idea Details */}
            <nav className="flex items-center gap-2 text-xs font-medium text-typography-slate flex-wrap">
              <Link
                to={isAuthenticated ? '/dashboard' : '/'}
                className="hover:text-brand-royal transition-colors"
              >
                Overview
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-typography-muted" />
              <Link
                to="/explore"
                className="hover:text-brand-royal transition-colors"
              >
                Explore Ideas
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-typography-muted" />
              <span className="text-typography-navy font-semibold truncate max-w-[220px] sm:max-w-xs">
                {idea.title}
              </span>
            </nav>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-3.5 py-1.5 text-xs font-medium text-typography-slate hover:bg-surface-light hover:text-brand-royal transition-all shadow-2xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Explore Ideas
              </Link>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-medium text-typography-slate hover:bg-surface-light transition-all shadow-2xs"
                title="Share Idea"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-functional-success" />
                    <span className="text-functional-success font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-typography-muted" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {applySuccess && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center justify-between rounded-2xl border border-functional-success/30 bg-functional-success-light px-5 py-4 text-xs font-semibold text-functional-success shadow-2xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{applySuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setApplySuccess(null)}
              className="text-sm font-bold opacity-80 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* 2. Hero Header Card */}
        <div className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 lg:p-10 shadow-2xs overflow-hidden">
          {/* Badges Bar: Category, Collab Type, Status, Upvote */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-surface-border/70">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category */}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-ice border border-brand-pale px-3 py-1 text-xs font-semibold text-brand-royal">
                <Layers className="h-3.5 w-3.5" />
                {idea.category}
              </span>

              {/* Collaboration Type */}
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-soft px-3 py-1 text-xs font-semibold text-typography-navy">
                <Users className="h-3.5 w-3.5 text-brand-royal" />
                {formatCollabLabel(idea.collaboration_type)}
              </span>

              {/* Status */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-functional-success-light border border-functional-success/30 px-3 py-0.5 text-xs font-semibold text-functional-success">
                <span className="h-1.5 w-1.5 rounded-full bg-functional-success animate-pulse" />
                {formatStatusLabel(idea.status)}
              </span>
            </div>

            {/* Upvote & Like Action Button */}
            <button
              type="button"
              disabled={isUpvoting}
              onClick={handleUpvote}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-2xs ${
                isUpvoted
                  ? 'bg-brand-royal text-white shadow-brand-royal/20'
                  : 'border border-surface-border bg-surface-soft text-typography-navy hover:border-brand-royal hover:text-brand-royal'
              } ${isUpvoting ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={isUpvoted ? 'You have upvoted / liked this initiative' : 'Upvote / Like this initiative'}
              aria-label={`Upvotes and likes: ${idea.upvotes_count ?? 0}`}
            >
              <ThumbsUp className={`h-4 w-4 ${isUpvoted ? 'fill-white' : ''}`} />
              <span>{isUpvoted ? 'Upvoted' : 'Upvote Idea'}</span>
              <span className="rounded-md bg-black/10 px-2 py-0.5 text-[11px] font-bold">
                {idea.upvotes_count ?? 0}
              </span>
            </button>
          </div>

          {/* Idea Title (Outfit Light 300 responsive) */}
          <h1 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-light text-typography-navy leading-tight tracking-tight break-all [word-break:break-all]">
            {idea.title}
          </h1>

          {/* Short description / Problem Statement */}
          <p className="mt-4 text-base sm:text-lg font-normal text-typography-slate leading-relaxed break-all [word-break:break-all]">
            {idea.summary}
          </p>

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-surface-soft border border-surface-border px-3 py-1 text-xs font-medium text-typography-slate break-all"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-w-0 max-w-full">
          {/* ================= MAIN COLUMN (8 cols) ================= */}
          <div className="lg:col-span-8 min-w-0 max-w-full space-y-8">
            {/* 3.1 About this idea */}
            <div className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="pb-4 border-b border-surface-border/70 flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-brand-royal" />
                  About This Idea
                </h2>
                <span className="text-xs text-typography-muted">
                  Comprehensive Concept Brief
                </span>
              </div>

              {/* Full Idea Description */}
              <div className="prose prose-sm max-w-none text-typography-charcoal whitespace-pre-line leading-relaxed text-sm sm:text-base font-normal break-all [word-break:break-all]">
                {idea.description}
              </div>

              {/* Structured Impact Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Problem Being Addressed */}
                <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-typography-navy">
                    <Target className="h-4 w-4 text-functional-error" />
                    Problem Being Addressed
                  </div>
                  <p className="text-xs sm:text-sm text-typography-slate font-normal leading-relaxed break-all [word-break:break-all]">
                    {idea.summary}
                  </p>
                </div>

                {/* Proposed Solution */}
                <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-typography-navy">
                    <Lightbulb className="h-4 w-4 text-brand-royal" />
                    Proposed Solution
                  </div>
                  <p className="text-xs sm:text-sm text-typography-slate font-normal leading-relaxed break-all [word-break:break-all]">
                    An intuitive, dedicated software platform designed to eliminate friction in {idea.category.toLowerCase()} through collaborative execution.
                  </p>
                </div>

                {/* Target Audience */}
                <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-typography-navy">
                    <Users className="h-4 w-4 text-brand-royal" />
                    Target Audience
                  </div>
                  <p className="text-xs sm:text-sm text-typography-slate font-normal leading-relaxed break-all [word-break:break-all]">
                    Early adopters, domain specialists, and end users seeking modern, reliable tooling in {idea.category}.
                  </p>
                </div>

                {/* Expected Impact */}
                <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-typography-navy">
                    <Sparkles className="h-4 w-4 text-functional-success" />
                    Expected Impact
                  </div>
                  <p className="text-xs sm:text-sm text-typography-slate font-normal leading-relaxed break-all [word-break:break-all]">
                    Accelerating time-to-market, reducing development redundancy, and assembling a dedicated engineering foundation.
                  </p>
                </div>
              </div>
            </div>

            {/* 3.2 Required Skills & Open Roles */}
            <div className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-surface-border/70">
                <div>
                  <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2.5">
                    <Briefcase className="h-5 w-5 text-brand-royal" />
                    Required Skills & Open Roles
                  </h2>
                  <p className="text-xs text-typography-slate mt-1 font-normal">
                    Technical and strategic competencies sought by the founder to advance this build.
                  </p>
                </div>

                {!isCreator && !hasAlreadyApplied && (
                  <button
                    type="button"
                    onClick={() => openApplicationModal(null)}
                    className="rounded-xl border border-brand-royal/30 bg-brand-ice px-3.5 py-2 text-xs font-semibold text-brand-royal hover:bg-brand-pale/60 transition-colors"
                  >
                    Pitch Custom Contribution
                  </button>
                )}
              </div>

              {/* Skills Tags Strip */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block mb-2.5">
                  Core Competencies & Stack Tags
                </span>
                <div className="flex flex-wrap gap-2">
                  {idea.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-surface-soft border border-surface-border px-3 py-1.5 text-xs font-medium text-typography-navy uppercase tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                  {idea.rolesNeeded?.map((r) => (
                    <span
                      key={`role-cat-${r.id}`}
                      className="rounded-lg bg-brand-ice border border-brand-pale px-3 py-1.5 text-xs font-semibold text-brand-royal uppercase tracking-wide"
                    >
                      {r.category}
                    </span>
                  ))}
                </div>
              </div>

              {/* Specific Open Roles Needed List */}
              <div className="space-y-4 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block">
                  Open Collaborator Roles ({openSpotsCount} {openSpotsCount === 1 ? 'seat open' : 'seats open'})
                </span>

                {idea.rolesNeeded && idea.rolesNeeded.length > 0 ? (
                  idea.rolesNeeded.map((role) => {
                    const isFull = role.spots_filled >= role.spots_available;
                    const isMyRole = myExistingRequest?.role_id === role.id;

                    return (
                      <div
                        key={role.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-surface-soft p-5 min-w-0 max-w-full overflow-hidden hover:border-brand-royal/30 transition-all"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-base font-medium text-typography-navy break-all [word-break:break-all]">
                              {role.role_title}
                            </h3>
                            <span className="rounded-md bg-brand-ice border border-brand-pale px-2.5 py-0.5 text-[11px] font-semibold text-brand-royal uppercase">
                              {role.category}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                isFull
                                  ? 'text-typography-muted line-through'
                                  : 'text-functional-success'
                              }`}
                            >
                              {role.spots_filled}/{role.spots_available} seats filled
                            </span>
                          </div>
                          {role.description && (
                            <p className="text-xs text-typography-slate font-normal leading-relaxed break-all [word-break:break-all]">
                              {role.description}
                            </p>
                          )}
                        </div>

                        {!isCreator && (
                          <div className="shrink-0 self-start sm:self-auto">
                            {isMyRole ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ice px-4 py-2 text-xs font-semibold text-brand-royal">
                                <Clock className="h-3.5 w-3.5" />
                                Application Pending
                              </span>
                            ) : hasAlreadyApplied ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-light px-4 py-2 text-xs font-medium text-typography-muted">
                                Request Submitted
                              </span>
                            ) : isFull ? (
                              <span className="inline-flex items-center rounded-xl bg-surface-light px-4 py-2 text-xs font-medium text-typography-muted">
                                Role Filled
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openApplicationModal(role)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep transition-all"
                              >
                                Apply for Role
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 text-center">
                    <p className="text-xs text-typography-slate">
                      No specific roles listed yet. Propose how your skillset can accelerate this initiative using the application form!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3.3 Development Roadmap */}
            <div className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="pb-4 border-b border-surface-border/70 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2.5">
                    <Milestone className="h-5 w-5 text-brand-royal" />
                    Development Roadmap & Milestones
                  </h2>
                  <p className="text-xs text-typography-slate mt-1 font-normal">
                    Creator&rsquo;s proposed milestones and current development stage.
                  </p>
                </div>
                <span className="hidden sm:inline-flex rounded-full bg-brand-ice px-3 py-1 text-xs font-semibold text-brand-royal border border-brand-pale capitalize">
                  Current Stage: {formatStatusLabel(idea.status)}
                </span>
              </div>

              {/* Visual Stage Progression */}
              <div className="relative pl-6 sm:pl-8 space-y-6 border-l-2 border-brand-pale">
                {roadmapStages.map((stage) => {
                  const isCompleted = stage.status === 'completed';
                  const isCurrent = stage.status === 'current';

                  return (
                    <div key={stage.title} className="relative">
                      {/* Node Bullet */}
                      <div
                        className={`absolute -left-[31px] sm:-left-[39px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-surface-white shadow-2xs ${
                          isCompleted
                            ? 'border-functional-success text-functional-success'
                            : isCurrent
                              ? 'border-brand-royal bg-brand-ice text-brand-royal ring-4 ring-brand-ice'
                              : 'border-surface-border text-typography-muted'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        ) : isCurrent ? (
                          <span className="h-2 w-2 rounded-full bg-brand-royal" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-typography-muted" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm sm:text-base font-medium ${
                              isCurrent
                                ? 'text-brand-royal font-semibold'
                                : isCompleted
                                  ? 'text-typography-navy'
                                  : 'text-typography-muted'
                            }`}
                          >
                            {stage.title}
                          </h3>
                          {isCurrent && (
                            <span className="rounded-full bg-brand-royal text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-typography-slate leading-relaxed font-normal">
                          {stage.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3.4 Collaboration Expectations & Ownership */}
            <div className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="pb-4 border-b border-surface-border/70">
                <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2.5">
                  <Compass className="h-5 w-5 text-brand-royal" />
                  Collaboration Expectations & Governance
                </h2>
                <p className="text-xs text-typography-slate mt-1 font-normal">
                  Structured terms and working agreements established by the creator.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kind of collaborators needed */}
                <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block">
                    Collaborators Needed
                  </span>
                  <p className="text-xs sm:text-sm text-typography-navy font-medium">
                    {idea.rolesNeeded && idea.rolesNeeded.length > 0
                      ? idea.rolesNeeded.map((r) => r.role_title).join(', ')
                      : 'General Engineering & Design Collaborators'}
                  </p>
                  <p className="text-xs text-typography-slate font-normal">
                    Builders willing to own components from design to code.
                  </p>
                </div>

                {/* Expected responsibilities */}
                <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block">
                    Expected Responsibilities
                  </span>
                  <p className="text-xs sm:text-sm text-typography-navy font-medium">
                    Active Sprint Development & Architecture
                  </p>
                  <p className="text-xs text-typography-slate font-normal">
                    Iterative weekly cadence, async communication, and GitHub pull requests.
                  </p>
                </div>

                {/* Time commitment */}
                <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-brand-royal" />
                    Time Commitment
                  </span>
                  <p className="text-xs sm:text-sm text-typography-navy font-medium">
                    10 &ndash; 15 hours / week (Recommended)
                  </p>
                  <p className="text-xs text-typography-slate font-normal">
                    Flexible remote async participation adjusted to milestones.
                  </p>
                </div>

                {/* Preferred collaboration arrangement */}
                <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block">
                    Collaboration Arrangement
                  </span>
                  <p className="text-xs sm:text-sm text-typography-navy font-medium capitalize">
                    {formatCollabLabel(idea.collaboration_type)}
                  </p>
                  <p className="text-xs text-typography-slate font-normal">
                    Peer build pod with transparent contribution records.
                  </p>
                </div>
              </div>

              {/* Ownership and Transparency Notice (Mandatory IDEORA Trust Policy) */}
              <div className="rounded-2xl border border-brand-pale bg-brand-ice/40 p-6 space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-typography-navy">
                  <Scale className="h-4 w-4 text-brand-royal" />
                  Ownership and Transparency Notice
                </div>
                <div className="space-y-2 text-xs text-typography-slate leading-relaxed font-normal">
                  <p>
                    <strong className="text-typography-navy font-semibold">Stated Ownership Terms:</strong>{' '}
                    <span className="text-typography-slate">Not specified (Default Creator Retention)</span>
                  </p>
                  <p>
                    All original concept rights, architecture drafts, and intellectual property remain with the idea creator. Publishing an initiative on IDEORA does not automatically transfer or license ownership to any party. Any IP sharing, equity allocation, or licensing terms must be formalized via direct written agreements between collaborating builders.
                  </p>
                </div>
              </div>
            </div>

            {/* 3.5 Founder Review Panel (Only visible to the Idea Creator) */}
            {isCreator && (
              <div className="rounded-3xl border border-brand-pale bg-brand-ice/20 p-6 sm:p-8 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-brand-pale">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2">
                      <Shield className="h-5 w-5 text-brand-royal" />
                      Founder Review: Collaboration Applications ({requests.length})
                    </h2>
                    <p className="text-xs text-typography-slate mt-0.5 font-normal">
                      Accepting an applicant marks their role seat filled and adds them to your collaborator count.
                    </p>
                  </div>
                </div>

                {reviewError && (
                  <div className="flex items-center gap-2 rounded-xl bg-functional-error-light border border-functional-error/20 p-3.5 text-xs text-functional-error">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {requests.length === 0 ? (
                  <p className="text-xs text-typography-slate py-4">
                    No applications received for this initiative yet. Share your project link with your network to attract builders!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-surface-border bg-surface-white p-5 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-royal text-white text-xs font-semibold">
                              {req.requester?.full_name?.charAt(0) || 'B'}
                            </div>
                            <div>
                              <Link
                                to={`/profile/${req.requester?.username || ''}`}
                                className="text-sm font-semibold text-typography-navy hover:text-brand-royal"
                              >
                                {req.requester?.full_name || 'Builder'}
                              </Link>
                              <span className="ml-2 rounded-md bg-brand-ice px-2 py-0.5 text-[11px] font-semibold text-brand-royal">
                                {req.role?.role_title || 'General Collaboration'}
                              </span>
                            </div>
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

                        <p className="text-xs text-typography-charcoal leading-relaxed bg-surface-soft p-3.5 rounded-xl border border-surface-border break-all [word-break:break-all]">
                          {req.message}
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          {(req.status === 'pending' || req.status === 'accepted') && (
                            <button
                              type="button"
                              disabled={openingConversationId === req.id}
                              onClick={() => handleOpenConversation(req.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-royal/30 bg-brand-ice px-3.5 py-1.5 text-xs font-semibold text-brand-royal hover:bg-brand-pale/50 transition-colors disabled:opacity-50"
                              title="Direct message this collaborator"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>{openingConversationId === req.id ? 'Opening...' : 'Message'}</span>
                            </button>
                          )}

                          {req.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={reviewingRequestId === req.id}
                                onClick={() => handleReviewRequest(req.id, 'declined')}
                                className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-soft px-3.5 py-1.5 text-xs font-medium text-typography-slate hover:bg-functional-error-light hover:text-functional-error transition-colors disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Decline
                              </button>
                              <button
                                type="button"
                                disabled={reviewingRequestId === req.id}
                                onClick={() => handleReviewRequest(req.id, 'accepted')}
                                className="inline-flex items-center gap-1 rounded-xl bg-functional-success px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity disabled:opacity-50"
                              >
                                {reviewingRequestId === req.id ? (
                                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                {reviewingRequestId === req.id ? 'Accepting...' : 'Accept Collaborator'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3.6 Discussion & Architecture Feedback */}
            <div className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="pb-4 border-b border-surface-border/70">
                <h2 className="text-xl sm:text-2xl font-light text-typography-navy flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-brand-royal" />
                  Discussion & Architecture Feedback ({comments.length})
                </h2>
                <p className="text-xs text-typography-slate mt-0.5 font-normal">
                  Public feedback thread for technical questions and architecture suggestions.
                </p>
              </div>

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-typography-slate py-4 text-center">
                    No comments yet. Propose a technical approach or ask the founder a question!
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-surface-border bg-surface-soft p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <Link
                          to={`/profile/${c.author?.username || ''}`}
                          className="font-semibold text-typography-navy hover:text-brand-royal"
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
                      <p className="text-xs text-typography-charcoal leading-relaxed whitespace-pre-line break-all [word-break:break-all]">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostComment} className="space-y-3 pt-2">
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    isAuthenticated
                      ? 'Ask the founder a technical question or suggest an architecture idea...'
                      : 'Sign in to join the discussion...'
                  }
                  className="w-full rounded-2xl border border-surface-border bg-surface-soft p-3.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={postingComment}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep disabled:opacity-60 transition-all"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {postingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ================= RIGHT SIDEBAR (4 cols) ================= */}
          <div className="lg:col-span-4 min-w-0 max-w-full space-y-6">
            {/* 4.1 Idea Engagement & Primary Action Card */}
            <div className="rounded-3xl border border-surface-border bg-surface-white p-6 shadow-2xs space-y-5">
              <div className="pb-3 border-b border-surface-border/70 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted">
                  Initiative Engagement
                </span>
                <span className="rounded-full bg-functional-success-light px-2.5 py-0.5 text-[11px] font-semibold text-functional-success capitalize">
                  {formatStatusLabel(idea.status)}
                </span>
              </div>

              {/* Snapshot Counts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface-soft p-4 border border-surface-border">
                  <span className="text-[11px] font-normal text-typography-muted block">
                    Active Builders
                  </span>
                  <span className="text-2xl font-light text-typography-navy">
                    {idea.collaborators_count}
                  </span>
                </div>

                <div className="rounded-2xl bg-surface-soft p-4 border border-surface-border">
                  <span className="text-[11px] font-normal text-typography-muted block">
                    Upvotes & Likes
                  </span>
                  <span className="text-2xl font-light text-brand-royal">
                    {idea.upvotes_count ?? 0}
                  </span>
                </div>
              </div>

              {/* Collaboration Model Description */}
              <div className="rounded-2xl border border-surface-border bg-surface-soft p-3.5 text-xs text-typography-slate space-y-1">
                <span className="font-semibold text-typography-navy block">
                  Model: {formatCollabLabel(idea.collaboration_type)}
                </span>
                <p className="font-normal text-[11px] leading-relaxed">
                  {idea.collaboration_type === 'advisor'
                    ? 'The creator is seeking a team to adopt or lead execution under structured guidance.'
                    : idea.collaboration_type === 'open_source'
                      ? 'Public collaborative repo open to community pull requests and contributors.'
                      : 'Peer build pod recruiting dedicated core co-founders with complementary technical skills.'}
                </p>
              </div>

              {/* PRIMARY ACTION BUTTON */}
              <div className="pt-2">
                {isCreator ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal py-3 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep transition-all"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Idea
                    </button>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-typography-slate block">
                        Quick Status Update:
                      </label>
                      <CustomSelect
                        value={idea.status}
                        onChange={(val) => handleStatusChange(val as IdeaStatus)}
                        options={statusOptions}
                        triggerClassName="py-2 px-3 text-xs bg-surface-soft border-surface-border text-typography-navy font-semibold"
                      />
                    </div>
                  </div>
                ) : myExistingRequest ? (
                  myExistingRequest.status === 'accepted' ? (
                    <div className="rounded-2xl border border-functional-success/30 bg-functional-success-light/40 p-4 text-center space-y-2.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-functional-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Accepted Team Member
                      </div>
                      <p className="text-[11px] text-typography-slate leading-relaxed">
                        You are an official collaborator on this project. Coordinate directly with the founder.
                      </p>
                      <button
                        type="button"
                        disabled={openingConversationId === myExistingRequest.id}
                        onClick={() => handleOpenConversation(myExistingRequest.id)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal py-2.5 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep transition-all"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{openingConversationId === myExistingRequest.id ? 'Opening...' : 'Message Idea Creator'}</span>
                      </button>
                    </div>
                  ) : myExistingRequest.status === 'pending' ? (
                    <div className="rounded-2xl border border-brand-pale bg-brand-ice/50 p-4 text-center space-y-2.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-royal">
                        <Clock className="h-4 w-4" />
                        Application Under Review
                      </div>
                      <p className="text-[11px] text-typography-slate leading-relaxed">
                        Your collaboration request is currently under founder review.
                      </p>
                      <button
                        type="button"
                        disabled={openingConversationId === myExistingRequest.id}
                        onClick={() => handleOpenConversation(myExistingRequest.id)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-brand-royal/30 bg-surface-white py-2.5 px-3 text-xs font-semibold text-brand-royal hover:bg-brand-ice/60 transition-all shadow-2xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{openingConversationId === myExistingRequest.id ? 'Opening...' : 'Message Founder'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-functional-error/30 bg-functional-error-light/40 p-4 text-center space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-functional-error">
                        <XCircle className="h-4 w-4" />
                        Application Declined
                      </div>
                      <p className="text-[11px] text-typography-slate leading-relaxed">
                        This collaboration application was declined. You can explore other open initiatives.
                      </p>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => openApplicationModal(null)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal py-3.5 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep transition-all active:scale-[0.99]"
                  >
                    <Briefcase className="h-4 w-4" />
                    {getPrimaryActionLabel(idea.collaboration_type)}
                  </button>
                )}
              </div>
            </div>

            {/* 4.2 Creator Profile Card */}
            <div className="rounded-3xl border border-surface-border bg-surface-white p-6 shadow-2xs space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block">
                Idea Creator
              </span>

              {idea.author ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-royal text-white text-base font-medium shadow-2xs">
                      {idea.author.full_name?.charAt(0).toUpperCase() || 'F'}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/profile/${idea.author.username}`}
                        className="text-base font-medium text-typography-navy hover:text-brand-royal block truncate"
                      >
                        {idea.author.full_name}
                      </Link>
                      <p className="text-xs text-typography-slate truncate font-normal">
                        @{idea.author.username} &bull;{' '}
                        <span className="capitalize font-semibold text-brand-royal">
                          {idea.author.role}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-typography-slate leading-relaxed break-all [word-break:break-all] font-normal">
                    {idea.author.bio ||
                      'This builder hasn\'t added a bio yet. They are actively contributing and developing ideas on IDEORA.'}
                  </p>

                  {/* Skills tags */}
                  {idea.author.skills && idea.author.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {idea.author.skills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded-md bg-surface-soft border border-surface-border px-2 py-0.5 text-[10px] font-semibold text-typography-slate uppercase"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Links & View Profile */}
                  <div className="flex items-center gap-3 border-t border-surface-border/70 pt-3">
                    {idea.author.github_url && (
                      <a
                        href={idea.author.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-typography-slate hover:text-brand-royal transition-colors"
                        title="GitHub Profile"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {idea.author.linkedin_url && (
                      <a
                        href={idea.author.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-typography-slate hover:text-brand-royal transition-colors"
                        title="LinkedIn Profile"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {idea.author.website_url && (
                      <a
                        href={idea.author.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-typography-slate hover:text-brand-royal transition-colors"
                        title="Portfolio Website"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                    <Link
                      to={`/profile/${idea.author.username}`}
                      className="ml-auto text-xs font-semibold text-brand-royal hover:text-brand-deep shrink-0 flex items-center gap-1"
                    >
                      View Profile &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-typography-slate font-normal">
                  Anonymous Builder
                </p>
              )}
            </div>

            {/* 4.3 Additional Information Card */}
            <div className="rounded-3xl border border-surface-border bg-surface-white p-6 shadow-2xs space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block mb-1">
                Additional Information
              </span>

              <div className="space-y-2 text-xs divide-y divide-surface-border/50">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-typography-slate flex items-center gap-1.5 font-normal">
                    <Calendar className="h-3.5 w-3.5 text-typography-muted" />
                    Published Date
                  </span>
                  <span className="text-typography-navy font-medium">
                    {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-typography-slate flex items-center gap-1.5 font-normal">
                    <Clock3 className="h-3.5 w-3.5 text-typography-muted" />
                    Last Updated
                  </span>
                  <span className="text-typography-navy font-medium">
                    {new Date(idea.updated_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-typography-slate font-normal">
                    Development Status
                  </span>
                  <span className="text-typography-navy font-medium capitalize">
                    {formatStatusLabel(idea.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-typography-slate font-normal">
                    Interested Collaborators
                  </span>
                  <span className="text-typography-navy font-medium">
                    {requests.length} applicants
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL 1: COLLABORATION APPLICATION ================= */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border/70">
              <div>
                <h3 className="text-lg font-medium text-typography-navy">
                  {getPrimaryActionLabel(idea.collaboration_type)}
                </h3>
                <p className="text-xs text-typography-slate mt-0.5 font-normal">
                  Applying for:{' '}
                  <span className="font-semibold text-brand-royal">
                    {applyingRole ? applyingRole.role_title : 'General Contribution'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="rounded-lg p-1 text-typography-muted hover:text-typography-navy transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {applyError && (
              <div className="flex items-center gap-2 rounded-xl bg-functional-error-light p-3 text-xs font-semibold text-functional-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-typography-navy mb-1.5">
                  Your Pitch & Relevant Background
                </label>
                <textarea
                  rows={4}
                  required
                  value={pitchMessage}
                  onChange={(e) => setPitchMessage(e.target.value)}
                  placeholder="Share why this idea excites you, your technical or design background, and what components you'd like to build..."
                  className="w-full rounded-2xl border border-surface-border bg-surface-soft p-3.5 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-typography-navy mb-1.5">
                  Estimated Weekly Availability
                </label>
                <select
                  value={commitmentHours}
                  onChange={(e) => setCommitmentHours(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface-soft p-2.5 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                >
                  <option value="5-10">5 &ndash; 10 hours / week</option>
                  <option value="10-15">10 &ndash; 15 hours / week</option>
                  <option value="15-20">15 &ndash; 20 hours / week</option>
                  <option value="20+">20+ hours / week (Full commitment)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-semibold text-typography-slate hover:bg-surface-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep disabled:opacity-60 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CREATOR EDIT IDEA ================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border/70">
              <div>
                <h3 className="text-lg font-medium text-typography-navy">
                  Edit Initiative Details
                </h3>
                <p className="text-xs text-typography-slate mt-0.5 font-normal">
                  Update your public concept brief and collaboration parameters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg p-1 text-typography-muted hover:text-typography-navy transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="flex items-center gap-2 rounded-xl bg-functional-error-light p-3 text-xs font-semibold text-functional-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditIdea} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-typography-navy mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-typography-navy mb-1">
                  Elevator Pitch / Problem Statement
                </label>
                <textarea
                  rows={2}
                  required
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-typography-navy mb-1">
                  Full Description & Project Vision
                </label>
                <textarea
                  rows={5}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    Collaboration Model
                  </label>
                  <select
                    value={editCollabType}
                    onChange={(e) => setEditCollabType(e.target.value as CollaborationType)}
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                  >
                    <option value="co_founder">Looking for Co-Founder</option>
                    <option value="contributor">Seeking Contributors</option>
                    <option value="open_source">Open Source Build</option>
                    <option value="advisor">Up for Adoption / Advisory</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-semibold text-typography-slate hover:bg-surface-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep disabled:opacity-60 transition-all"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
