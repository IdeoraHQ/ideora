import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lightbulb,
  Users,
  Calendar,
  Clock,
  Crown,
  ExternalLink,
  ShieldAlert,
  FolderGit2,
  MessageSquare,
  Tag,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchProjectById,
  updateProjectStatus,
  updateProjectDetails,
  getOrCreateConversation,
} from '@/services/api';
import type { Project, ProjectStatus } from '@/types';
import { PROJECT_STATUS_META, PROJECT_STATUS_OPTIONS } from '@/utils/projectStatus';
import { CustomSelect } from '@/components/common';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messagingMemberId, setMessagingMemberId] = useState<string | null>(null);

  // Owner inline edit state for project title/description
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id || !isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchProjectById(id);
    if (fetchError || !data) {
      setProject(null);
      setError(
        fetchError?.message ||
          'Project not found or you do not have permission to access this workspace.'
      );
    } else {
      setProject(data);
      setEditTitle(data.title);
      setEditDescription(data.description);
    }
    setLoading(false);
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      void loadProject();
    }
  }, [authLoading, loadProject]);

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;
    setStatusUpdating(true);
    setActionError(null);

    const { data, error: updateError } = await updateProjectStatus(
      project.id,
      newStatus as ProjectStatus
    );
    if (updateError) {
      setActionError(updateError.message || 'Failed to update project status.');
    } else if (data) {
      setProject(data);
    }
    setStatusUpdating(false);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || editTitle.trim().length < 3) return;

    setSavingDetails(true);
    setActionError(null);

    const { data, error: updateError } = await updateProjectDetails(project.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });

    if (updateError) {
      setActionError(updateError.message || 'Failed to save project details.');
    } else if (data) {
      setProject(data);
      setIsEditing(false);
    }
    setSavingDetails(false);
  };

  const handleOpenConversation = async (requestId: string, memberId: string) => {
    setMessagingMemberId(memberId);
    setActionError(null);
    try {
      const { data, error: convError } = await getOrCreateConversation(requestId);
      if (convError) {
        setActionError(convError.message || 'Unable to open direct message.');
      } else if (data) {
        navigate(`/messages?id=${data.id}`);
      }
    } finally {
      setMessagingMemberId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-36 rounded bg-surface-light" />
        <div className="h-44 rounded-2xl border border-surface-border bg-surface-white" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-64 rounded-2xl border border-surface-border bg-surface-white" />
          <div className="lg:col-span-4 h-64 rounded-2xl border border-surface-border bg-surface-white" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-8 sm:p-10 shadow-sm">
          <FolderGit2 className="mx-auto h-10 w-10 text-brand-royal mb-4" />
          <h1 className="text-xl font-medium text-typography-navy">
            Authentication Required
          </h1>
          <p className="mt-2 text-sm text-typography-slate">
            Please sign in to view this project workspace.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-8 sm:p-10 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-functional-error-light text-functional-error mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-medium text-typography-navy">
            Project Unavailable
          </h1>
          <p className="mt-2 text-sm text-typography-slate leading-relaxed">
            {error || 'This project does not exist or is restricted to authorized collaborators.'}
          </p>
          <Link
            to="/projects"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = project.owner_id === profile.id;
  const statusMeta = PROJECT_STATUS_META[project.status];
  const members = project.members || [];
  const acceptedCollaborators = members.filter((m) => m.member_role !== 'owner');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-typography-slate hover:text-brand-royal transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>

        {project.idea && (
          <Link
            to={`/ideas/${project.idea.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-royal hover:text-brand-deep transition-colors"
          >
            <span>View Original Idea</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {actionError && (
        <div className="rounded-xl border border-functional-error/30 bg-functional-error-light px-4 py-3 text-xs font-semibold text-functional-error">
          {actionError}
        </div>
      )}

      {/* Project Header Card */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                {statusMeta.label}
              </span>

              {project.idea?.category && (
                <span className="rounded-full border border-surface-border bg-surface-soft px-3 py-1 text-xs font-medium text-typography-slate">
                  {project.idea.category}
                </span>
              )}

              <span className="inline-flex items-center gap-1 rounded-full bg-brand-ice px-3 py-1 text-xs font-semibold text-brand-royal">
                {isOwner ? (
                  <>
                    <Crown className="h-3 w-3" />
                    Project Owner
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" />
                    Team Collaborator
                  </>
                )}
              </span>
            </div>

            {isEditing && isOwner ? (
              <form onSubmit={handleSaveDetails} className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-base font-medium text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-typography-navy mb-1">
                    Project Overview
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-sm text-typography-charcoal focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingDetails}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {savingDetails ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditTitle(project.title);
                      setEditDescription(project.description);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-semibold text-typography-slate hover:text-typography-navy transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <h1 className="text-2xl sm:text-3xl font-light text-typography-navy font-heading tracking-tight">
                    {project.title}
                  </h1>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="mt-1 rounded-lg p-1.5 text-typography-muted hover:text-brand-royal hover:bg-surface-soft transition-colors shrink-0"
                      title="Edit project title and overview"
                      aria-label="Edit project title and overview"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-2.5 text-sm sm:text-base text-typography-slate leading-relaxed max-w-3xl">
                  {project.description}
                </p>
              </>
            )}
          </div>

          {/* Owner Status Management */}
          {isOwner && (
            <div className="w-full md:w-48 shrink-0">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-typography-muted mb-1.5">
                Project Status
              </label>
              <CustomSelect
                value={project.status}
                options={PROJECT_STATUS_OPTIONS}
                onChange={handleStatusChange}
                disabled={statusUpdating}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Originating Idea & Team Roster */}
        <div className="lg:col-span-8 space-y-6">
          {/* Accepted Collaborators & Team Roster */}
          <section className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-surface-border">
              <div>
                <h2 className="text-lg font-medium text-typography-navy">
                  Project Team
                </h2>
                <p className="text-xs text-typography-slate mt-0.5">
                  Owner and accepted collaborators with access to this workspace.
                </p>
              </div>
              <span className="rounded-full bg-surface-soft border border-surface-border px-3 py-1 text-xs font-semibold text-typography-navy">
                {members.length} {members.length === 1 ? 'Member' : 'Members'}
              </span>
            </div>

            <div className="mt-4 divide-y divide-surface-border">
              {/* Project Owner Row */}
              {project.owner && (
                <div className="py-3.5 flex items-center justify-between gap-3">
                  <Link
                    to={`/profile/${project.owner.username}`}
                    className="flex items-center gap-3 min-w-0 group"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-ice text-brand-royal text-sm font-bold overflow-hidden">
                      {project.owner.avatar_url ? (
                        <img
                          src={project.owner.avatar_url}
                          alt={project.owner.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        project.owner.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-typography-navy group-hover:text-brand-royal transition-colors truncate">
                          {project.owner.full_name}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-brand-ice px-2 py-0.5 text-[10px] font-semibold text-brand-royal">
                          <Crown className="h-2.5 w-2.5" />
                          Owner
                        </span>
                      </div>
                      <p className="text-xs text-typography-muted truncate">
                        @{project.owner.username}
                      </p>
                    </div>
                  </Link>

                  <Link
                    to={`/profile/${project.owner.username}`}
                    className="text-xs font-semibold text-typography-slate hover:text-brand-royal transition-colors shrink-0"
                  >
                    View Profile
                  </Link>
                </div>
              )}

              {/* Accepted Collaborators */}
              {acceptedCollaborators.length === 0 ? (
                <div className="py-6 text-center text-xs text-typography-muted">
                  No additional collaborators listed yet.
                </div>
              ) : (
                acceptedCollaborators.map((member) => (
                  <div
                    key={member.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <Link
                      to={member.user ? `/profile/${member.user.username}` : '#'}
                      className="flex items-center gap-3 min-w-0 group"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-soft border border-surface-border text-typography-navy text-sm font-bold overflow-hidden">
                        {member.user?.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt={member.user.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          member.user?.full_name?.charAt(0).toUpperCase() || 'C'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-typography-navy group-hover:text-brand-royal transition-colors truncate">
                            {member.user?.full_name || 'Collaborator'}
                          </span>
                          <span className="rounded-md bg-surface-soft border border-surface-border px-2 py-0.5 text-[10px] font-semibold text-typography-slate">
                            {member.role_title}
                          </span>
                        </div>
                        <p className="text-xs text-typography-muted truncate">
                          @{member.user?.username || 'member'} &bull; Joined{' '}
                          {new Date(member.joined_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      {member.collaboration_request_id &&
                        (isOwner || member.user_id === profile.id) && (
                          <button
                            type="button"
                            disabled={messagingMemberId === member.id}
                            onClick={() =>
                              handleOpenConversation(member.collaboration_request_id!, member.id)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-pale bg-brand-ice/70 px-3 py-1.5 text-xs font-semibold text-brand-royal hover:bg-brand-ice transition-colors disabled:opacity-60"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>
                              {messagingMemberId === member.id
                                ? 'Opening...'
                                : isOwner
                                  ? 'Message'
                                  : 'Message Owner'}
                            </span>
                          </button>
                        )}
                      {member.user && (
                        <Link
                          to={`/profile/${member.user.username}`}
                          className="rounded-xl border border-surface-border bg-surface-soft px-3 py-1.5 text-xs font-medium text-typography-slate hover:text-typography-navy transition-colors"
                        >
                          Profile
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Original Idea Reference */}
          {project.idea && (
            <section className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-brand-royal" />
                  <h2 className="text-lg font-medium text-typography-navy">
                    Originating Idea
                  </h2>
                </div>
                <Link
                  to={`/ideas/${project.idea.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-royal hover:text-brand-deep transition-colors"
                >
                  <span>Open Idea Page</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                <h3 className="text-base font-medium text-typography-navy">
                  {project.idea.title}
                </h3>
                <p className="text-sm text-typography-slate leading-relaxed">
                  {project.idea.summary}
                </p>

                {project.idea.tags && project.idea.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Tag className="h-3.5 w-3.5 text-typography-muted" />
                    {project.idea.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-surface-soft border border-surface-border px-2.5 py-0.5 text-xs text-typography-slate"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Project Metadata */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-medium text-typography-navy pb-3 border-b border-surface-border">
              Project Metadata
            </h2>

            <dl className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-typography-muted flex items-center gap-1.5">
                  <FolderGit2 className="h-3.5 w-3.5" />
                  Status
                </dt>
                <dd className="font-semibold text-typography-navy">{statusMeta.label}</dd>
              </div>

              {project.idea?.collaboration_type && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-typography-muted flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Collaboration Model
                  </dt>
                  <dd className="font-semibold text-typography-navy capitalize">
                    {project.idea.collaboration_type.replace('_', ' ')}
                  </dd>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <dt className="text-typography-muted flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Created
                </dt>
                <dd className="font-medium text-typography-navy">
                  {new Date(project.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <dt className="text-typography-muted flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Last Activity
                </dt>
                <dd className="font-medium text-typography-navy">
                  {new Date(project.last_activity_at || project.updated_at).toLocaleDateString(
                    undefined,
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
};

