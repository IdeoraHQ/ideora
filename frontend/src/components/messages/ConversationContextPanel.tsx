import React from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Lightbulb,
  Users,
  Briefcase,
  X,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import type { Conversation, UserProfile } from '@/types';
import { cn } from '@/utils/cn';

interface ConversationContextPanelProps {
  conversation: Conversation;
  currentUserId?: string;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

const REQUEST_STATUS_STYLES: Record<string, string> = {
  accepted: 'bg-functional-success-light text-functional-success border-functional-success/20',
  pending: 'bg-functional-warning-light text-functional-warning border-functional-warning/20',
  declined: 'bg-functional-error-light text-functional-error border-functional-error/20',
  withdrawn: 'bg-surface-light text-typography-slate border-surface-border',
};

export const ConversationContextPanel: React.FC<ConversationContextPanelProps> = ({
  conversation,
  currentUserId,
  onClose,
  isMobileDrawer = false,
}) => {
  const idea = conversation.idea;
  const req = conversation.collaboration_request;
  const role = req?.role;

  const participants: Array<{
    profile?: UserProfile;
    roleLabel: string;
    isCurrentUser: boolean;
  }> = [
    {
      profile: conversation.creator,
      roleLabel: idea ? 'Idea Owner' : 'Recipient',
      isCurrentUser: conversation.creator_id === currentUserId,
    },
    {
      profile: conversation.requester,
      roleLabel: role?.role_title ? `Applicant · ${role.role_title}` : 'Collaborator',
      isCurrentUser: conversation.requester_id === currentUserId,
    },
  ];

  const statusClass =
    (req?.status && REQUEST_STATUS_STYLES[req.status]) ||
    'bg-surface-light text-typography-slate border-surface-border';

  return (
    <aside
      aria-label="Conversation details"
      className={cn(
        'flex flex-col bg-surface-white overflow-y-auto',
        isMobileDrawer
          ? 'h-full w-full'
          : 'w-72 xl:w-80 border-l border-surface-border shrink-0 h-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-surface-border shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-typography-slate">
          Collaboration Context
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close context panel"
            className="rounded-lg p-1 text-typography-muted hover:bg-surface-soft hover:text-typography-navy transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-5 text-xs">
        {/* Collaboration Status & Role */}
        {req && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-typography-muted">
                Request Status
              </span>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                  statusClass
                )}
              >
                {req.status}
              </span>
            </div>

            {role && (
              <div className="rounded-xl border border-surface-border bg-surface-soft p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-typography-slate">
                  <Briefcase className="h-3.5 w-3.5 text-brand-royal shrink-0" />
                  <span>Applied Role</span>
                </div>
                <p className="font-semibold text-typography-navy text-xs">{role.role_title}</p>
                <p className="text-[11px] text-typography-muted capitalize">
                  {role.category} · {role.spots_available}{' '}
                  {role.spots_available === 1 ? 'spot' : 'spots'} configured
                </p>
              </div>
            )}

            {!idea && req.purpose && (
              <div className="rounded-xl border border-surface-border bg-surface-soft p-3 space-y-1">
                <span className="text-[11px] font-semibold text-typography-slate">Purpose</span>
                <p className="text-xs font-medium text-typography-navy">{req.purpose}</p>
              </div>
            )}

            {req.message && (
              <div className="rounded-xl border border-surface-border bg-surface-soft p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-typography-slate">
                  <FileText className="h-3.5 w-3.5 text-typography-muted shrink-0" />
                  <span>Initial Pitch</span>
                </div>
                <p className="text-xs text-typography-slate leading-relaxed whitespace-pre-wrap break-words">
                  {req.message}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Related Idea */}
        {idea && (
          <section className="space-y-2.5 pt-2 border-t border-surface-border/70">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-typography-muted">
              <Lightbulb className="h-3.5 w-3.5 text-brand-royal" />
              <span>Related Idea</span>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface-soft p-3.5 space-y-2.5">
              <div className="space-y-1">
                <Link
                  to={`/ideas/${idea.slug}`}
                  className="group inline-flex items-start gap-1 text-sm font-semibold text-typography-navy hover:text-brand-royal transition-colors leading-snug"
                >
                  <span>{idea.title}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-typography-muted group-hover:text-brand-royal" />
                </Link>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="rounded-md bg-surface-white border border-surface-border px-1.5 py-0.5 text-[10px] font-medium text-typography-slate">
                    {idea.category}
                  </span>
                  <span className="rounded-md bg-brand-ice px-1.5 py-0.5 text-[10px] font-semibold text-brand-royal capitalize">
                    {idea.status}
                  </span>
                </div>
              </div>

              {idea.summary && (
                <p className="text-xs text-typography-slate leading-relaxed line-clamp-4">
                  {idea.summary}
                </p>
              )}

              <Link
                to={`/ideas/${idea.slug}`}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
              >
                <span>Open Idea Page</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </section>
        )}

        {/* Participants */}
        <section className="space-y-2.5 pt-2 border-t border-surface-border/70">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-typography-muted">
            <Users className="h-3.5 w-3.5 text-brand-royal" />
            <span>Participants ({participants.length})</span>
          </div>

          <div className="space-y-2">
            {participants.map((item, idx) => {
              const p = item.profile;
              const profileLink = p?.username ? `/profile/${p.username}` : undefined;

              return (
                <div
                  key={p?.id || idx}
                  className="flex items-center gap-2.5 rounded-xl border border-surface-border/70 bg-surface-soft/70 p-2.5"
                >
                  {p?.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.full_name || p.username || 'Participant'}
                      className="h-8 w-8 rounded-full object-cover border border-surface-border shrink-0"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-royal/10 text-brand-royal text-xs font-bold uppercase shrink-0">
                      {p?.full_name?.charAt(0) || p?.username?.charAt(0) || 'U'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {profileLink ? (
                        <Link
                          to={profileLink}
                          className="text-xs font-semibold text-typography-navy hover:text-brand-royal truncate transition-colors"
                        >
                          {p?.full_name || `@${p?.username}`}
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-typography-navy truncate">
                          {p?.full_name || 'Ideora User'}
                        </span>
                      )}
                      {item.isCurrentUser && (
                        <span className="rounded bg-surface-white border border-surface-border px-1 py-0.2 text-[9px] font-semibold text-typography-muted shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-typography-slate truncate">{item.roleLabel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
};

