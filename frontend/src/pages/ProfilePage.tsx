import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Github,
  Linkedin,
  Globe,
  Edit3,
  Save,
  X,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Share2,
  Users,
  Sparkles,
  Check,
  ExternalLink,
  UserPlus,
  MessageSquare,
  Compass,
  Briefcase,
  Target,
  Clock,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SeoHead } from '@/components/seo/SeoHead';
import {
  fetchProfile,
  updateCurrentProfile,
  fetchUserIdeas,
  toggleIdeaUpvote,
  fetchUserUpvotedIdeaIds,
  fetchGeneralRequestBetween,
} from '@/services/api';
import { IdeaCard } from '@/components/ideas/IdeaCard';
import { CustomSelect } from '@/components/common';
import { DirectCollaborateModal } from '@/components/collaborations/DirectCollaborateModal';
import type { UserProfile, Idea, UserRole, SkillCategory, CollaborationRequest } from '@/types';

const skillOptions: { label: string; value: SkillCategory }[] = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Fullstack', value: 'fullstack' },
  { label: 'UI/UX Design', value: 'design' },
  { label: 'Product', value: 'product' },
  { label: 'AI / ML', value: 'ai' },
  { label: 'Marketing / Growth', value: 'marketing' },
];

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { profile: currentUser, loading: authLoading, refreshProfile } = useAuth();

  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
  const [userIdeas, setUserIdeas] = useState<Idea[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState<UserRole>('collaborator');
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState('');
  const [lookingToContribute, setLookingToContribute] = useState('');
  const [collaborationGoals, setCollaborationGoals] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingGeneralReq, setExistingGeneralReq] = useState<CollaborationRequest | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);

  const loadData = useCallback(async () => {
    const cleanUsername =
      username && username !== 'undefined' && username !== 'null'
        ? username
        : undefined;

    if (!cleanUsername && authLoading) {
      return;
    }

    const targetIdentifier = cleanUsername || currentUser?.username || currentUser?.id;
    if (!targetIdentifier) {
      setViewedProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: fetchedProf } = await fetchProfile(targetIdentifier);
    const isSelfFallback =
      currentUser &&
      (!cleanUsername ||
        cleanUsername === currentUser.username ||
        cleanUsername === currentUser.id);
    const prof = fetchedProf || (isSelfFallback ? currentUser : null);

    if (!prof) {
      if (authLoading) {
        return;
      }
      setViewedProfile(null);
      setLoading(false);
      return;
    }

    setViewedProfile(prof);
    setFullName(prof.full_name);
    setBio(prof.bio || '');
    setRole(prof.role);
    setSkills(prof.skills || []);
    setInterests(prof.interests || []);
    setPreferredRoles(prof.preferred_roles || []);
    setLookingToContribute(prof.looking_to_contribute || '');
    setCollaborationGoals(prof.collaboration_goals || '');
    setGithubUrl(prof.github_url || '');
    setLinkedinUrl(prof.linkedin_url || '');
    setWebsiteUrl(prof.website_url || '');

    const [ideasRes, upvoted, generalReqRes] = await Promise.all([
      fetchUserIdeas(prof.id),
      fetchUserUpvotedIdeaIds(),
      currentUser && currentUser.id !== prof.id
        ? fetchGeneralRequestBetween(prof.id)
        : Promise.resolve({ data: null, error: null }),
    ]);
    setExistingGeneralReq(generalReqRes?.data ?? null);

    if (ideasRes.data) {
      const visible =
        currentUser?.id === prof.id
          ? ideasRes.data
          : ideasRes.data.filter((i) => i.status !== 'draft');
      setUserIdeas(visible);
    }
    setUpvotedIds(upvoted);
    setLoading(false);
  }, [username, authLoading, currentUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const isOwnProfile = Boolean(
    currentUser && viewedProfile && currentUser.id === viewedProfile.id
  );

  const handleCopyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleSkill = (val: string) => {
    setSkills((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveMessage(null);
    setSaving(true);

    const { data, error } = await updateCurrentProfile({
      full_name: fullName.trim(),
      bio: bio.trim() || null,
      role,
      skills,
      interests,
      preferred_roles: preferredRoles,
      looking_to_contribute: lookingToContribute.trim() || null,
      collaboration_goals: collaborationGoals.trim() || null,
      github_url: githubUrl.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
    });

    setSaving(false);

    if (error || !data) {
      setSaveError(error?.message || 'Failed to update profile');
      return;
    }

    setViewedProfile(data);
    await refreshProfile();
    setIsEditing(false);
    setSaveMessage('Profile successfully updated!');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  const handleToggleUpvote = async (ideaId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (upvotingIds.has(ideaId)) return;

    setUpvotingIds((prev) => new Set(prev).add(ideaId));
    try {
      const { upvoted, upvotesCount, error } = await toggleIdeaUpvote(ideaId);
      if (!error) {
        setUpvotedIds((prev) =>
          upvoted ? [...prev, ideaId] : prev.filter((id) => id !== ideaId)
        );
        setUserIdeas((prev) =>
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

  // Metrics calculations
  const totalUpvotes = userIdeas.reduce((sum, idea) => sum + (idea.upvotes_count || 0), 0);
  const totalOpenRoles = userIdeas.reduce(
    (sum, idea) =>
      sum +
      (idea.rolesNeeded?.reduce(
        (sub, r) => sub + Math.max(0, r.spots_available - r.spots_filled),
        0
      ) || 0),
    0
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-brand-royal animate-spin mb-3" />
        <p className="text-sm font-medium text-typography-slate">Loading builder profile...</p>
      </div>
    );
  }

  if (!viewedProfile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <SeoHead
          title="Builder Profile Not Found | Ideora"
          description="The requested builder profile could not be found on Ideora."
          noindex
        />
        <div className="rounded-3xl border border-surface-border bg-surface-white p-10 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-4">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-light text-typography-navy tracking-tight">
            Builder Profile Not Found
          </h1>
          <p className="mt-2 text-sm text-typography-slate font-normal leading-relaxed">
            The profile you are looking for does not exist or may have changed their username.
          </p>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-soft pb-24">
      <SeoHead
        title={`${viewedProfile.full_name || viewedProfile.username} (@${viewedProfile.username}) | Ideora`}
        description={
          viewedProfile.bio ||
          `View ${viewedProfile.full_name || viewedProfile.username}'s published ideas and collaboration profile on Ideora.`
        }
        canonicalPath={`/profile/${viewedProfile.username}`}
        noindex={!username}
        ogType="profile"
      />
      {/* 1. Clean Navigation Bar (No overlapping background) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-surface-white border border-surface-border px-3.5 py-2 text-xs font-medium text-typography-navy shadow-2xs hover:bg-surface-light transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <button
          type="button"
          onClick={handleCopyProfileLink}
          className="inline-flex items-center gap-1.5 rounded-xl bg-surface-white border border-surface-border px-3.5 py-2 text-xs font-medium text-typography-navy shadow-2xs hover:bg-surface-light transition-all"
          title="Copy profile link"
        >
          {copiedLink ? (
            <>
              <Check className="h-3.5 w-3.5 text-functional-success" />
              <span className="text-functional-success font-semibold">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-typography-muted" />
              <span>Share Profile</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Success Notification */}
        {saveMessage && (
          <div className="flex items-center justify-between rounded-2xl border border-functional-success/30 bg-functional-success-light px-5 py-3.5 text-xs font-semibold text-functional-success shadow-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {saveMessage}
            </span>
            <button type="button" onClick={() => setSaveMessage(null)} className="text-sm font-bold">
              &times;
            </button>
          </div>
        )}

        {/* 2. Main Identity Card with Integrated Cover Banner */}
        <div className="rounded-3xl border border-surface-border bg-surface-white shadow-sm overflow-hidden relative">
          {/* Cover Banner strictly contained inside the card without dividing border line */}
          <div className="h-32 sm:h-40 w-full bg-gradient-to-r from-brand-ice/80 via-brand-pale/40 to-brand-ice/90" />

          {/* Profile Identity Body */}
          <div className="p-6 sm:p-8 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-surface-border -mt-14 sm:-mt-16">
              <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                {/* Avatar with White Ring - Elevated with z-20 and zero clipping or border cuts */}
                <div className="relative z-20 shrink-0">
                  {viewedProfile.avatar_url ? (
                    <img
                      src={viewedProfile.avatar_url}
                      alt={viewedProfile.full_name}
                      className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover ring-4 ring-surface-white shadow-xl bg-surface-white block"
                    />
                  ) : (
                    <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-brand-royal text-white text-4xl font-light ring-4 ring-surface-white shadow-xl shadow-brand-royal/20 flex items-center justify-center">
                      {viewedProfile.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Identity & Status */}
                <div className="space-y-1 pt-3 sm:pt-0 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-typography-navy tracking-tight break-all [word-break:break-all]">
                      {viewedProfile.full_name}
                    </h1>

                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-ice border border-brand-pale px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-royal capitalize">
                      <Sparkles className="h-3 w-3" />
                      {viewedProfile.role}
                    </span>
                  </div>

                  <p className="text-sm text-typography-slate font-medium break-all">
                    @{viewedProfile.username}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-royal/30 bg-brand-ice px-4 py-2.5 text-xs font-semibold text-brand-royal hover:bg-brand-pale/60 active:scale-98 transition-all shrink-0 self-start sm:self-end"
                >
                  {isEditing ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      Cancel Editing
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Profile
                    </>
                  )}
                </button>
              ) : existingGeneralReq?.status === 'accepted' ? (
                <Link
                  to="/messages"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-royal-hover transition-all shrink-0 self-start sm:self-end shadow-xs"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Open Messages
                </Link>
              ) : existingGeneralReq?.status === 'pending' ? (
                <span className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-xs font-semibold text-typography-slate shrink-0 self-start sm:self-end">
                  <Clock className="h-3.5 w-3.5 text-brand-royal" />
                  Collaboration Request Pending
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      navigate('/login');
                      return;
                    }
                    setShowCollabModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-royal-hover active:scale-98 transition-all shrink-0 self-start sm:self-end shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Request Collaboration
                </button>
              )}
            </div>

          {/* 3. Bio & Social Presence */}
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted">
                  About the Builder
                </span>
                <p className="mt-1.5 text-sm sm:text-base text-typography-charcoal font-normal leading-relaxed break-all [word-break:break-all]">
                  {viewedProfile.bio ||
                    'This builder hasn\'t added a bio yet. They are actively contributing and developing ideas on IDEORA.'}
                </p>
              </div>

              {/* Skills Pill Cloud */}
              {viewedProfile.skills && viewedProfile.skills.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block mb-2">
                    Core Competencies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewedProfile.skills.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-lg bg-surface-soft border border-surface-border px-3 py-1 text-xs font-medium text-typography-navy uppercase tracking-wide"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Collaboration Profile Details */}
              {(viewedProfile.looking_to_contribute ||
                viewedProfile.collaboration_goals ||
                (viewedProfile.preferred_roles && viewedProfile.preferred_roles.length > 0) ||
                (viewedProfile.interests && viewedProfile.interests.length > 0)) && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {viewedProfile.looking_to_contribute && (
                    <div className="rounded-2xl border border-surface-border bg-surface-soft/70 p-4 space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-typography-muted">
                        <Briefcase className="h-3.5 w-3.5 text-brand-royal" />
                        Looking to Contribute
                      </span>
                      <p className="text-xs sm:text-sm text-typography-navy leading-relaxed">
                        {viewedProfile.looking_to_contribute}
                      </p>
                    </div>
                  )}

                  {viewedProfile.collaboration_goals && (
                    <div className="rounded-2xl border border-surface-border bg-surface-soft/70 p-4 space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-typography-muted">
                        <Target className="h-3.5 w-3.5 text-brand-royal" />
                        Collaboration Goals
                      </span>
                      <p className="text-xs sm:text-sm text-typography-navy leading-relaxed">
                        {viewedProfile.collaboration_goals}
                      </p>
                    </div>
                  )}

                  {viewedProfile.preferred_roles && viewedProfile.preferred_roles.length > 0 && (
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-typography-muted mb-2">
                        <Users className="h-3.5 w-3.5 text-brand-royal" />
                        Preferred Collaboration Roles
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {viewedProfile.preferred_roles.map((r) => (
                          <span
                            key={r}
                            className="rounded-lg bg-brand-ice px-2.5 py-1 text-xs font-medium text-brand-royal"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewedProfile.interests && viewedProfile.interests.length > 0 && (
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-typography-muted mb-2">
                        <Compass className="h-3.5 w-3.5 text-brand-royal" />
                        Areas of Interest
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {viewedProfile.interests.map((interest) => (
                          <span
                            key={interest}
                            className="rounded-lg border border-surface-border bg-surface-soft px-2.5 py-1 text-xs font-medium text-typography-navy"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Social & Contact Card */}
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-3 lg:border-l lg:border-surface-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-typography-muted block">
                Verified Links
              </span>

              <div className="space-y-2">
                {viewedProfile.github_url ? (
                  <a
                    href={viewedProfile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-surface-white border border-surface-border px-3 py-2 text-xs font-medium text-typography-navy hover:text-brand-royal hover:border-brand-pale transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-typography-slate group-hover:text-brand-royal" />
                      GitHub Profile
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-typography-muted group-hover:text-brand-royal" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-typography-muted px-1 py-1">
                    <Github className="h-4 w-4" />
                    <span>No GitHub connected</span>
                  </div>
                )}

                {viewedProfile.linkedin_url && (
                  <a
                    href={viewedProfile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-surface-white border border-surface-border px-3 py-2 text-xs font-medium text-typography-navy hover:text-brand-royal hover:border-brand-pale transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-[#0077b5]" />
                      LinkedIn Profile
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-typography-muted group-hover:text-brand-royal" />
                  </a>
                )}

                {viewedProfile.website_url && (
                  <a
                    href={viewedProfile.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-surface-white border border-surface-border px-3 py-2 text-xs font-medium text-typography-navy hover:text-brand-royal hover:border-brand-pale transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-brand-royal" />
                      Personal Portfolio
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-typography-muted group-hover:text-brand-royal" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 4. Builder Impact Metrics */}
          <div className="mt-8 pt-6 border-t border-surface-border grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-4 text-center">
              <span className="block text-2xl font-bold text-typography-navy">
                {userIdeas.length}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-typography-slate">
                Initiatives Published
              </span>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-soft p-4 text-center">
              <span className="block text-2xl font-bold text-brand-royal">
                {totalUpvotes ?? 0}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-typography-slate">
                Community Upvotes & Likes
              </span>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-soft p-4 text-center">
              <span className="block text-2xl font-bold text-typography-navy">
                {totalOpenRoles}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-typography-slate">
                Open Roles Offered
              </span>
            </div>
          </div>

          {/* 5. Inline Profile Editor (Rendered when edit mode active) */}
          {isOwnProfile && isEditing && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-8 border-t border-surface-border pt-6 space-y-5 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-typography-navy">
                  Edit Builder Information
                </h3>
                <span className="text-xs text-typography-muted">
                  Update your public presence on IDEORA
                </span>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-3.5 text-xs font-semibold text-functional-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1.5">
                    Primary Archetype *
                  </label>
                  <CustomSelect
                    value={role}
                    onChange={(val) => setRole(val as UserRole)}
                    options={[
                      { label: 'Founder / Visionary', value: 'founder' },
                      { label: 'Technical Collaborator', value: 'collaborator' },
                    ]}
                    triggerClassName="py-2.5 px-3.5 bg-surface-soft text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-typography-navy mb-1.5">
                  Builder Bio & Vision
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share your engineering background, what drives your product building, and what kinds of projects you want to collaborate on..."
                  className="w-full rounded-xl border border-surface-border bg-surface-soft p-3.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none leading-relaxed"
                />
              </div>

              {/* Skills multi-select */}
              <div>
                <label className="block text-xs font-semibold text-typography-navy mb-1.5">
                  Select Competencies
                </label>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((sk) => {
                    const active = skills.includes(sk.value);
                    return (
                      <button
                        type="button"
                        key={sk.value}
                        onClick={() => toggleSkill(sk.value)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                          active
                            ? 'bg-brand-royal text-white shadow-2xs'
                            : 'bg-surface-soft border border-surface-border text-typography-slate hover:border-brand-pale'
                        }`}
                      >
                        {sk.label} {active && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collaboration Preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    What are you looking to contribute?
                  </label>
                  <textarea
                    rows={2}
                    value={lookingToContribute}
                    onChange={(e) => setLookingToContribute(e.target.value)}
                    placeholder="e.g., Full-stack TypeScript & React architecture, UI polish, and rapid MVP prototyping."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    Who or what do you want to collaborate on?
                  </label>
                  <textarea
                    rows={2}
                    value={collaborationGoals}
                    onChange={(e) => setCollaborationGoals(e.target.value)}
                    placeholder="e.g., Looking to team up with product designers or founders building AI developer tools."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    Preferred Collaboration Roles
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = roleInput.trim();
                          if (val && !preferredRoles.includes(val)) {
                            setPreferredRoles((prev) => [...prev, val]);
                          }
                          setRoleInput('');
                        }
                      }}
                      placeholder="e.g., Frontend Developer, Co-Founder"
                      className="flex-1 rounded-xl border border-surface-border bg-surface-soft px-3 py-1.5 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = roleInput.trim();
                        if (val && !preferredRoles.includes(val)) {
                          setPreferredRoles((prev) => [...prev, val]);
                        }
                        setRoleInput('');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-soft px-2.5 py-1.5 text-xs font-semibold text-typography-navy hover:bg-surface-border/40"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  {preferredRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {preferredRoles.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-ice px-2.5 py-1 text-xs font-medium text-brand-royal"
                        >
                          {r}
                          <button
                            type="button"
                            onClick={() => setPreferredRoles((prev) => prev.filter((x) => x !== r))}
                            aria-label={`Remove ${r}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    Areas of Interest
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={interestInput}
                      onChange={(e) => setInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = interestInput.trim();
                          if (val && !interests.includes(val)) {
                            setInterests((prev) => [...prev, val]);
                          }
                          setInterestInput('');
                        }
                      }}
                      placeholder="e.g., AI, FinTech, Climate Tech"
                      className="flex-1 rounded-xl border border-surface-border bg-surface-soft px-3 py-1.5 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = interestInput.trim();
                        if (val && !interests.includes(val)) {
                          setInterests((prev) => [...prev, val]);
                        }
                        setInterestInput('');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-soft px-2.5 py-1.5 text-xs font-semibold text-typography-navy hover:bg-surface-border/40"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {interests.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-soft px-2.5 py-1 text-xs font-medium text-typography-navy"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setInterests((prev) => prev.filter((x) => x !== item))}
                            aria-label={`Remove ${item}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    Portfolio / Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-semibold text-typography-slate hover:bg-surface-light"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
          </div>
        </div>

        {/* 6. Published Initiatives by this Builder */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border/70">
            <h2 className="text-2xl sm:text-3xl font-light text-typography-navy flex items-center gap-2.5">
              <Lightbulb className="h-6 w-6 text-brand-royal" />
              Published Initiatives ({userIdeas.length})
            </h2>

            {isOwnProfile && (
              <Link
                to="/ideas/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-all shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Publish Initiative
              </Link>
            )}
          </div>

          {userIdeas.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface-white p-12 text-center shadow-2xs">
              <Users className="mx-auto h-10 w-10 text-brand-royal opacity-80 mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-typography-navy">
                {isOwnProfile
                  ? 'No Published Initiatives Yet — Still Open to Collaborate'
                  : `Available to Collaborate`}
              </h3>
              <p className="mt-1 text-xs text-typography-slate max-w-md mx-auto leading-relaxed">
                {isOwnProfile
                  ? 'You do not need a published idea to connect with builders. Complete your skills and interests above, or publish an initiative whenever you are ready.'
                  : `${viewedProfile.full_name} hasn't published an initiative yet, but you can still send a direct collaboration request to explore ideas or build together.`}
              </p>

              {isOwnProfile ? (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/people"
                    className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-xs font-semibold text-typography-navy hover:bg-surface-border/40 transition-all"
                  >
                    <Users className="h-3.5 w-3.5 text-brand-royal" />
                    Browse Builders
                  </Link>
                  <Link
                    to="/ideas/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-all"
                  >
                    Publish an Initiative
                  </Link>
                </div>
              ) : (
                !existingGeneralReq && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        navigate('/login');
                        return;
                      }
                      setShowCollabModal(true);
                    }}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-all"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Send Collaboration Request
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  isUpvoted={upvotedIds.includes(idea.id)}
                  onToggleUpvote={handleToggleUpvote}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DirectCollaborateModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        recipient={
          viewedProfile
            ? {
                id: viewedProfile.id,
                full_name: viewedProfile.full_name,
                username: viewedProfile.username,
                avatar_url: viewedProfile.avatar_url,
                skills: viewedProfile.skills,
                preferred_roles: viewedProfile.preferred_roles,
              }
            : null
        }
        onSuccess={() => {
          void loadData();
        }}
      />
    </div>
  );
};
