import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Users,
  Briefcase,
  ArrowUpRight,
  CheckCircle2,
  Send,
  X,
  AlertCircle,
  Compass,
  PlusCircle,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePresence } from '@/context/PresenceContext';
import { SeoHead } from '@/components/seo/SeoHead';
import { CustomSelect } from '@/components/common/CustomSelect';
import {
  fetchPublishedIdeas,
  fetchUserIdeas,
  fetchUserSentRequests,
  searchDiscoverablePeople,
  sendRoleInvitation,
} from '@/services/api';
import {
  assessBuilderProfileCompleteness,
  isRoleOpen,
  rankBuildersForRole,
  rankIdeasForBuilder,
  type MatchTier,
} from '@/utils/matching';
import type {
  CollaborationRequest,
  DiscoverablePerson,
  Idea,
  IdeaRoleNeeded,
} from '@/types';
import { cn } from '@/utils/cn';

function getTierBadgeStyle(tier: MatchTier): string {
  switch (tier) {
    case 'Strong match':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
    case 'Good match':
      return 'bg-brand-ice text-brand-royal border-brand-pale';
    default:
      return 'bg-surface-soft text-typography-slate border-surface-border';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const IdeoraMatchPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useAuth();
  const { isUserOnline } = usePresence();

  const [activeTab, setActiveTab] = useState<'builders' | 'projects'>('builders');
  const [loading, setLoading] = useState(true);

  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [publishedIdeas, setPublishedIdeas] = useState<Idea[]>([]);
  const [discoverableBuilders, setDiscoverableBuilders] = useState<DiscoverablePerson[]>([]);
  const [sentRequests, setSentRequests] = useState<CollaborationRequest[]>([]);

  const [selectedIdeaId, setSelectedIdeaId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Invite modal state
  const [inviteTarget, setInviteTarget] = useState<{
    builder: DiscoverablePerson;
    idea: Idea;
    role: IdeaRoleNeeded;
  } | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const loadMatchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ideasRes, peopleRes] = await Promise.all([
        fetchPublishedIdeas(),
        searchDiscoverablePeople({ limit: 60 }),
      ]);

      setPublishedIdeas(ideasRes.data || []);
      setDiscoverableBuilders(peopleRes.data || []);

      if (profile?.id) {
        const [myIdeasRes, sentRes] = await Promise.all([
          fetchUserIdeas(profile.id),
          fetchUserSentRequests(profile.id),
        ]);
        const owned = (myIdeasRes.data || []).filter(
          (i) => i.status !== 'draft' && i.status !== 'archived'
        );
        setMyIdeas(owned);
        setSentRequests(sentRes.data || []);

        const firstWithOpenRoles = owned.find((i) =>
          (i.rolesNeeded || []).some(isRoleOpen)
        );
        if (firstWithOpenRoles) {
          setSelectedIdeaId((prev) => prev || firstWithOpenRoles.id);
        } else if (owned.length > 0) {
          setSelectedIdeaId((prev) => prev || owned[0].id);
        } else {
          setActiveTab('projects');
        }
      } else {
        setMyIdeas([]);
        setSentRequests([]);
        setActiveTab('projects');
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void loadMatchData();
  }, [loadMatchData]);

  // Ideas owned by user that have at least one open role
  const ownedIdeasWithOpenRoles = useMemo(
    () => myIdeas.filter((i) => (i.rolesNeeded || []).some(isRoleOpen)),
    [myIdeas]
  );

  const selectedIdea = useMemo(
    () =>
      ownedIdeasWithOpenRoles.find((i) => i.id === selectedIdeaId) ||
      ownedIdeasWithOpenRoles[0] ||
      null,
    [ownedIdeasWithOpenRoles, selectedIdeaId]
  );

  const openRolesForSelectedIdea = useMemo(
    () => (selectedIdea?.rolesNeeded || []).filter(isRoleOpen),
    [selectedIdea]
  );

  useEffect(() => {
    if (openRolesForSelectedIdea.length === 0) {
      setSelectedRoleId('');
      return;
    }
    const stillExists = openRolesForSelectedIdea.some(
      (r) => r.id === selectedRoleId
    );
    if (!stillExists) {
      setSelectedRoleId(openRolesForSelectedIdea[0].id);
    }
  }, [openRolesForSelectedIdea, selectedRoleId]);

  const selectedRole = useMemo(
    () =>
      openRolesForSelectedIdea.find((r) => r.id === selectedRoleId) ||
      openRolesForSelectedIdea[0] ||
      null,
    [openRolesForSelectedIdea, selectedRoleId]
  );

  const builderMatches = useMemo(() => {
    if (!selectedIdea || !selectedRole) return [];
    return rankBuildersForRole(selectedIdea, selectedRole, discoverableBuilders);
  }, [selectedIdea, selectedRole, discoverableBuilders]);

  const profileCompleteness = useMemo(
    () => assessBuilderProfileCompleteness(profile),
    [profile]
  );

  const projectMatches = useMemo(() => {
    if (!profile || profileCompleteness.isIncomplete) return [];
    return rankIdeasForBuilder(profile, publishedIdeas);
  }, [profile, profileCompleteness.isIncomplete, publishedIdeas]);

  const getInviteStatusForBuilder = useCallback(
    (builderId: string, ideaId: string, roleId: string) => {
      return sentRequests.find(
        (req) =>
          req.request_type === 'role_invite' &&
          req.recipient_id === builderId &&
          req.idea_id === ideaId &&
          req.role_id === roleId &&
          (req.status === 'pending' || req.status === 'accepted')
      );
    },
    [sentRequests]
  );

  const openInviteModal = (
    builder: DiscoverablePerson,
    idea: Idea,
    role: IdeaRoleNeeded
  ) => {
    setInviteError(null);
    setInviteTarget({ builder, idea, role });
    setInviteMessage(
      `Hi ${builder.full_name || builder.username}, your background aligns well with the ${role.role_title} role we have open on "${idea.title}". Would you like to collaborate with us?`
    );
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTarget || inviteSending) return;
    if (!inviteMessage.trim()) {
      setInviteError('Please include a short note with your invitation.');
      return;
    }

    setInviteSending(true);
    setInviteError(null);

    const { data, error } = await sendRoleInvitation({
      idea_id: inviteTarget.idea.id,
      role_id: inviteTarget.role.id,
      recipient_id: inviteTarget.builder.id,
      message: inviteMessage.trim(),
    });

    setInviteSending(false);

    if (error || !data) {
      setInviteError(error?.message || 'Unable to send role invitation.');
      return;
    }

    setSentRequests((prev) => [data, ...prev]);
    setInviteSuccess(
      `Invitation sent to ${inviteTarget.builder.full_name || inviteTarget.builder.username} for ${inviteTarget.role.role_title}.`
    );
    setInviteTarget(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <SeoHead
        title="Ideora Match — Find Builders & Matching Projects | Ideora"
        description="Match your unfinished idea's open roles with skilled builders, or discover projects actively looking for your exact skills on Ideora Match."
        canonicalPath="/match"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-ice border border-brand-pale px-3 py-1 text-[11px] font-semibold text-brand-royal mb-2.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ideora Match</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-typography-navy font-heading tracking-tight">
            Find the Right Collaborators
          </h1>
          <p className="mt-2 text-sm sm:text-base text-typography-slate leading-relaxed">
            Transparent, skill-based recommendations connecting open project roles with builders ready to ship.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <Link
            to="/ideas/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-deep transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Publish an Idea</span>
          </Link>
        </div>
      </div>

      {inviteSuccess && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{inviteSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setInviteSuccess(null)}
            aria-label="Dismiss message"
            className="p-1 hover:opacity-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="inline-flex w-full sm:w-auto rounded-2xl border border-surface-border bg-surface-white p-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('builders')}
          className={cn(
            'flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all',
            activeTab === 'builders'
              ? 'bg-brand-royal text-white shadow-xs'
              : 'text-typography-slate hover:text-typography-navy'
          )}
        >
          <Users className="h-4 w-4" />
          <span>Find Builders for My Ideas</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={cn(
            'flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all',
            activeTab === 'projects'
              ? 'bg-brand-royal text-white shadow-xs'
              : 'text-typography-slate hover:text-typography-navy'
          )}
        >
          <Briefcase className="h-4 w-4" />
          <span>Projects Looking for My Skills</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-surface-border bg-surface-white p-5 animate-pulse space-y-3"
            >
              <div className="h-5 w-1/2 rounded bg-surface-soft" />
              <div className="h-4 w-3/4 rounded bg-surface-soft" />
              <div className="h-16 w-full rounded bg-surface-soft" />
            </div>
          ))}
        </div>
      ) : activeTab === 'builders' ? (
        /* TAB 1: FIND BUILDERS FOR MY IDEAS */
        !isAuthenticated ? (
          <div className="rounded-2xl border border-surface-border bg-surface-white p-8 text-center space-y-4">
            <Users className="h-9 w-9 text-brand-royal mx-auto" />
            <h2 className="text-lg font-semibold text-typography-navy">
              Sign in to match builders to your ideas
            </h2>
            <p className="text-sm text-typography-slate max-w-md mx-auto">
              Publish an idea with open roles and Ideora Match will recommend builders whose skills and interests fit each role.
            </p>
            <button
              type="button"
              onClick={() => navigate('/auth', { state: { from: '/match' } })}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-brand-deep transition-colors"
            >
              Sign In to Continue
            </button>
          </div>
        ) : ownedIdeasWithOpenRoles.length === 0 ? (
          <div className="rounded-2xl border border-surface-border bg-surface-white p-8 text-center space-y-4">
            <Briefcase className="h-9 w-9 text-brand-royal mx-auto" />
            <h2 className="text-lg font-semibold text-typography-navy">
              No published ideas with open roles yet
            </h2>
            <p className="text-sm text-typography-slate max-w-md mx-auto">
              Add open collaboration roles to a published idea so Ideora Match can recommend suitable builders and let you invite them directly.
            </p>
            <Link
              to="/ideas/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-brand-deep transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Publish an Idea with Open Roles</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Idea & Open Role Selector */}
            <div className="rounded-2xl border border-surface-border bg-surface-white p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-typography-muted">
                    Select Your Project
                  </span>
                  <CustomSelect
                    value={selectedIdea?.id || ''}
                    onChange={(val) => setSelectedIdeaId(val)}
                    options={ownedIdeasWithOpenRoles.map((idea) => ({
                      label: idea.title,
                      value: idea.id,
                    }))}
                    className="w-full sm:w-[320px]"
                  />
                </div>

                {selectedIdea && (
                  <Link
                    to={`/ideas/${selectedIdea.slug}`}
                    className="text-xs font-semibold text-brand-royal hover:underline inline-flex items-center gap-1 self-start sm:self-end"
                  >
                    <span>Open Idea Page</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {openRolesForSelectedIdea.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-typography-muted block">
                    Open Roles ({openRolesForSelectedIdea.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {openRolesForSelectedIdea.map((role) => {
                      const openSpots = Math.max(
                        0,
                        (role.spots_available ?? 1) - (role.spots_filled ?? 0)
                      );
                      const isSelected = role.id === selectedRole?.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRoleId(role.id)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all',
                            isSelected
                              ? 'border-brand-royal bg-brand-ice text-brand-royal'
                              : 'border-surface-border bg-surface-soft text-typography-navy hover:border-brand-pale'
                          )}
                        >
                          <span>{role.role_title}</span>
                          <span className="rounded-md bg-surface-white px-1.5 py-0.5 text-[10px] font-semibold text-typography-slate border border-surface-border">
                            {openSpots} {openSpots === 1 ? 'spot' : 'spots'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Ranked Builder Results */}
            {builderMatches.length === 0 ? (
              <div className="rounded-2xl border border-surface-border bg-surface-white p-8 text-center space-y-3">
                <Compass className="h-8 w-8 text-typography-muted mx-auto" />
                <p className="text-base font-medium text-typography-navy">
                  No direct skill or interest matches found yet for {selectedRole?.role_title}
                </p>
                <p className="text-sm text-typography-slate max-w-md mx-auto">
                  You can still browse all discoverable builders on the People directory or refine your role description and tags.
                </p>
                <Link
                  to="/people"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-semibold text-typography-navy hover:border-brand-pale hover:text-brand-royal transition-colors"
                >
                  Browse People Directory
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {builderMatches.map((match) => {
                  const b = match.builder;
                  const name = b.full_name || b.username || 'Builder';
                  const online = isUserOnline(b.id);
                  const existingInvite =
                    selectedIdea && selectedRole
                      ? getInviteStatusForBuilder(b.id, selectedIdea.id, selectedRole.id)
                      : undefined;

                  return (
                    <article
                      key={b.id}
                      className="rounded-2xl border border-surface-border bg-surface-white p-5 shadow-2xs flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            to={b.username ? `/profile/${b.username}` : '/people'}
                            className="flex items-center gap-3 min-w-0 group"
                          >
                            <div className="relative h-10 w-10 shrink-0">
                              {b.avatar_url ? (
                                <img
                                  src={b.avatar_url}
                                  alt={name}
                                  className="h-10 w-10 rounded-full object-cover border border-surface-border"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-ice text-xs font-semibold text-brand-royal border border-brand-pale">
                                  {getInitials(name)}
                                </div>
                              )}
                              {online && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-typography-navy truncate group-hover:text-brand-royal transition-colors">
                                {name}
                              </h3>
                              <p className="text-xs text-typography-muted truncate">
                                @{b.username} {online ? '• Online now' : ''}
                              </p>
                            </div>
                          </Link>

                          <span
                            className={cn(
                              'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                              getTierBadgeStyle(match.tier)
                            )}
                          >
                            {match.tier}
                          </span>
                        </div>

                        {b.bio && (
                          <p className="text-xs text-typography-slate line-clamp-2 leading-relaxed">
                            {b.bio}
                          </p>
                        )}

                        {/* Explainable Match Reasons */}
                        <div className="rounded-xl border border-surface-border/70 bg-surface-soft/60 p-3 space-y-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-typography-muted block">
                            Why they match
                          </span>
                          <ul className="space-y-1">
                            {match.reasons.map((reason) => (
                              <li
                                key={reason}
                                className="flex items-start gap-1.5 text-xs text-typography-navy"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-brand-royal shrink-0 mt-0.5" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {b.looking_to_contribute && (
                          <p className="text-[11px] text-typography-slate">
                            <strong className="font-medium text-typography-navy">
                              Availability / Focus:
                            </strong>{' '}
                            {b.looking_to_contribute}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-border/70">
                        <Link
                          to={b.username ? `/profile/${b.username}` : '/people'}
                          className="rounded-xl border border-surface-border bg-surface-soft px-3 py-1.5 text-xs font-medium text-typography-navy hover:border-brand-pale hover:text-brand-royal transition-colors"
                        >
                          View Profile
                        </Link>

                        {selectedIdea && selectedRole && (
                          existingInvite ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-soft px-3 py-1.5 text-xs font-semibold text-typography-slate">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span>
                                {existingInvite.status === 'accepted'
                                  ? 'Accepted'
                                  : 'Invited (Pending)'}
                              </span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openInviteModal(b, selectedIdea, selectedRole)
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Invite to Role</span>
                            </button>
                          )
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : (
        /* TAB 2: PROJECTS LOOKING FOR MY SKILLS */
        !isAuthenticated ? (
          <div className="rounded-2xl border border-surface-border bg-surface-white p-8 text-center space-y-4">
            <Briefcase className="h-9 w-9 text-brand-royal mx-auto" />
            <h2 className="text-lg font-semibold text-typography-navy">
              Sign in to see projects matched to your skills
            </h2>
            <p className="text-sm text-typography-slate max-w-md mx-auto">
              Sign in and add your skills and interests so Ideora Match can surface open roles that fit what you build.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/auth', { state: { from: '/match' } })}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-brand-deep transition-colors"
              >
                Sign In
              </button>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-xs sm:text-sm font-medium text-typography-navy hover:border-brand-pale"
              >
                Browse Explore Ideas
              </Link>
            </div>
          </div>
        ) : profileCompleteness.isIncomplete ? (
          <div className="rounded-2xl border border-surface-border bg-surface-white p-8 text-center space-y-4">
            <AlertCircle className="h-9 w-9 text-brand-royal mx-auto" />
            <h2 className="text-lg font-semibold text-typography-navy">
              Complete your profile to unlock personalized project matches
            </h2>
            <p className="text-sm text-typography-slate max-w-lg mx-auto">
              Your profile does not list any skills, interests, or preferred roles yet. Add them in your settings so we can match you accurately instead of showing generic recommendations.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-brand-deep transition-colors"
            >
              Add Skills & Interests in Settings
            </Link>
          </div>
        ) : projectMatches.length === 0 ? (
          <div className="rounded-2xl border border-surface-border bg-surface-white p-8 text-center space-y-3">
            <Compass className="h-8 w-8 text-typography-muted mx-auto" />
            <p className="text-base font-medium text-typography-navy">
              No open roles match your current skills & interests yet
            </p>
            <p className="text-sm text-typography-slate max-w-md mx-auto">
              Browse all published ideas on Explore or update your skills and preferred roles in Settings.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Link
                to="/explore"
                className="rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
              >
                Explore All Ideas
              </Link>
              <Link
                to="/settings"
                className="rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-medium text-typography-navy hover:border-brand-pale"
              >
                Update Profile Skills
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectMatches.map((match) => {
              const { idea, bestRole } = match;
              const openSpots = bestRole
                ? Math.max(0, (bestRole.spots_available ?? 1) - (bestRole.spots_filled ?? 0))
                : 0;

              return (
                <article
                  key={idea.id}
                  className="rounded-2xl border border-surface-border bg-surface-white p-5 shadow-2xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center rounded-lg border border-surface-border bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-typography-navy">
                        {idea.category}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          getTierBadgeStyle(match.tier)
                        )}
                      >
                        {match.tier}
                      </span>
                    </div>

                    <Link
                      to={`/ideas/${idea.slug}`}
                      className="block group"
                    >
                      <h3 className="text-base sm:text-lg font-semibold text-typography-navy group-hover:text-brand-royal transition-colors leading-snug">
                        {idea.title}
                      </h3>
                      <p className="mt-1.5 text-xs sm:text-sm text-typography-slate line-clamp-2">
                        {idea.summary}
                      </p>
                    </Link>

                    {bestRole && (
                      <div className="inline-flex items-center gap-2 rounded-xl border border-brand-pale bg-brand-ice/50 px-3 py-1.5 text-xs text-brand-royal font-medium">
                        <Briefcase className="h-3.5 w-3.5" />
                        <span>Recommended role: {bestRole.role_title}</span>
                        {openSpots > 0 && (
                          <span className="rounded bg-surface-white px-1.5 py-0.5 text-[10px] font-semibold text-typography-navy border border-surface-border">
                            {openSpots} open
                          </span>
                        )}
                      </div>
                    )}

                    <div className="rounded-xl border border-surface-border/70 bg-surface-soft/60 p-3 space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-typography-muted block">
                        Why this fits you
                      </span>
                      <ul className="space-y-1">
                        {match.reasons.map((reason) => (
                          <li
                            key={reason}
                            className="flex items-start gap-1.5 text-xs text-typography-navy"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-brand-royal shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-border/70">
                    <span className="text-xs text-typography-muted">
                      by {idea.author?.full_name || idea.author?.username || 'Founder'}
                    </span>
                    <Link
                      to={`/ideas/${idea.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
                    >
                      <span>View & Apply</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {/* Role Invitation Modal */}
      {inviteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={(e) => void handleSendInvite(e)}
            className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-typography-navy">
                  Invite {inviteTarget.builder.full_name || inviteTarget.builder.username}
                </h3>
                <p className="text-xs text-typography-slate mt-0.5">
                  Role: <strong>{inviteTarget.role.role_title}</strong> on &ldquo;{inviteTarget.idea.title}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteTarget(null)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-typography-muted hover:text-typography-navy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteError && (
              <div className="rounded-xl border border-functional-error/30 bg-functional-error-light px-3 py-2 text-xs text-functional-error">
                {inviteError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-typography-navy block">
                Invitation Message
              </label>
              <textarea
                rows={4}
                required
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setInviteTarget(null)}
                className="rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-medium text-typography-navy hover:bg-surface-light"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteSending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{inviteSending ? 'Sending...' : 'Send Invitation'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

