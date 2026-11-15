import React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  X,
  AlertCircle,
  Compass,
  Users,
  RefreshCw,
} from 'lucide-react';
import type { Conversation, UserProfile } from '@/types';
import { cn } from '@/utils/cn';

export type ConversationFilter = 'all' | 'unread';

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  currentUserId?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectConversation: (conv: Conversation) => void;
  getOtherParticipant: (conv: Conversation) => UserProfile | undefined;
}

function formatRelativeTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  selectedConversationId,
  currentUserId,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  loading,
  error,
  onRetry,
  onSelectConversation,
  getOtherParticipant,
}) => {
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'unread' && (c.unread_count ?? 0) === 0) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const other = getOtherParticipant(c);
    const otherName = other?.full_name?.toLowerCase() || '';
    const otherUsername = other?.username?.toLowerCase() || '';
    const ideaTitle = c.idea?.title?.toLowerCase() || '';
    const purpose = c.collaboration_request?.purpose?.toLowerCase() || '';
    const roleTitle = c.collaboration_request?.role?.role_title?.toLowerCase() || '';
    return (
      otherName.includes(q) ||
      otherUsername.includes(q) ||
      ideaTitle.includes(q) ||
      purpose.includes(q) ||
      roleTitle.includes(q)
    );
  });

  return (
    <aside
      aria-label="Conversations"
      className={cn(
        'w-full md:w-80 lg:w-[340px] flex flex-col border-r border-surface-border bg-surface-white shrink-0 min-h-0',
        selectedConversationId ? 'hidden md:flex' : 'flex'
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-surface-border/70 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-typography-navy font-heading tracking-tight">
            Messages
          </h1>
          <span className="text-[11px] font-medium text-typography-muted tabular-nums">
            {conversations.length} {conversations.length === 1 ? 'thread' : 'threads'}
          </span>
        </div>

        {/* Pill Search Input */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-typography-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full rounded-full border border-surface-border bg-surface-soft py-2 pl-9 pr-8 text-xs text-typography-navy placeholder-typography-muted focus:bg-surface-white focus:outline-none focus:border-brand-royal focus:ring-2 focus:ring-brand-royal/15 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-typography-muted hover:text-typography-navy transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Pill Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter conversations"
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => onFilterChange('all')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
              filter === 'all'
                ? 'bg-brand-royal text-white shadow-xs'
                : 'text-typography-slate hover:bg-surface-soft hover:text-typography-navy'
            )}
          >
            <span>All</span>
            <span
              className={cn(
                'text-[11px] tabular-nums',
                filter === 'all' ? 'text-white/90 font-semibold' : 'text-typography-muted'
              )}
            >
              {conversations.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'unread'}
            onClick={() => onFilterChange('unread')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
              filter === 'unread'
                ? 'bg-brand-royal text-white shadow-xs'
                : 'text-typography-slate hover:bg-surface-soft hover:text-typography-navy'
            )}
          >
            <span>Unread</span>
            {totalUnread > 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  filter === 'unread'
                    ? 'bg-white/20 text-white'
                    : 'bg-brand-ice text-brand-royal'
                )}
              >
                {totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {loading ? (
          <div className="p-3 space-y-2" aria-busy="true" aria-label="Loading conversations">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-start gap-3 rounded-xl p-3">
                <div className="h-10 w-10 rounded-full bg-surface-light shrink-0" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="flex justify-between gap-4">
                    <div className="h-3.5 bg-surface-light rounded w-2/5" />
                    <div className="h-3 bg-surface-light rounded w-10" />
                  </div>
                  <div className="h-2.5 bg-surface-light rounded w-1/3" />
                  <div className="h-3 bg-surface-light rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-functional-error-light text-functional-error">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-typography-navy">
                Could not load conversations
              </p>
              <p className="text-xs text-typography-slate leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-3.5 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
              <MessageSquare className="h-5 w-5" />
            </div>
            {searchQuery.trim() ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-typography-navy">
                    No matching conversations
                  </p>
                  <p className="text-xs text-typography-slate max-w-[230px] leading-relaxed">
                    No threads matched &ldquo;{searchQuery.trim()}&rdquo;. Try another name, role, or idea title.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="rounded-xl border border-surface-border bg-surface-white px-3.5 py-1.5 text-xs font-semibold text-brand-royal hover:bg-surface-light transition-colors"
                >
                  Clear search
                </button>
              </>
            ) : filter === 'unread' ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-typography-navy">All caught up</p>
                  <p className="text-xs text-typography-slate max-w-[230px] leading-relaxed">
                    You have no unread messages right now.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className="rounded-xl border border-surface-border bg-surface-white px-3.5 py-1.5 text-xs font-semibold text-brand-royal hover:bg-surface-light transition-colors"
                >
                  View all conversations
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-typography-navy">
                    No conversations yet
                  </p>
                  <p className="text-xs text-typography-slate max-w-[250px] leading-relaxed">
                    Start collaborating by applying to an idea or reaching out to builders directly.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    Explore Ideas
                  </Link>
                  <Link
                    to="/people"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Find Builders
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const other = getOtherParticipant(conv);
            const isSelected = selectedConversationId === conv.id;
            const unread = conv.unread_count ?? 0;
            const lastMsg = conv.last_message;
            const isLastMsgDeleted = Boolean(lastMsg?.deleted_at);
            const isLastMsgMine = Boolean(lastMsg && currentUserId && lastMsg.sender_id === currentUserId);

            const topicLabel =
              conv.idea?.title ||
              conv.collaboration_request?.role?.role_title ||
              conv.collaboration_request?.purpose ||
              'Direct Collaboration';

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv)}
                aria-current={isSelected ? 'true' : undefined}
                className={cn(
                  'w-full text-left px-3 py-3 rounded-2xl flex items-center gap-3 transition-all relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal/30',
                  isSelected
                    ? 'bg-brand-royal/12 border border-brand-royal/25 shadow-2xs'
                    : 'border border-transparent hover:bg-surface-soft'
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0 mt-0.5">
                  {other?.avatar_url ? (
                    <img
                      src={other.avatar_url}
                      alt={other.full_name || other.username || 'Participant'}
                      className="h-10 w-10 rounded-full object-cover border border-surface-border"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-royal/10 text-brand-royal border border-brand-royal/20 text-xs font-bold uppercase">
                      {other?.full_name?.charAt(0) || other?.username?.charAt(0) || 'B'}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-xs truncate',
                        unread > 0
                          ? 'font-bold text-typography-navy'
                          : 'font-semibold text-typography-navy'
                      )}
                    >
                      {other?.full_name || `@${other?.username || 'user'}`}
                    </span>
                    <span className="text-[11px] text-typography-muted shrink-0 tabular-nums">
                      {formatRelativeTimestamp(conv.last_message_at)}
                    </span>
                  </div>

                  {/* Topic / Role Pill */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-block max-w-full truncate rounded-md bg-surface-soft px-1.5 py-0.5 text-[10px] font-medium text-typography-slate border border-surface-border/70">
                      {topicLabel}
                    </span>
                  </div>

                  {/* Last Message Preview & Unread Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'text-xs truncate leading-snug',
                        isLastMsgDeleted
                          ? 'italic text-typography-muted'
                          : unread > 0
                          ? 'font-medium text-typography-navy'
                          : 'text-typography-slate'
                      )}
                    >
                      {!lastMsg
                        ? 'Conversation started'
                        : isLastMsgDeleted
                        ? 'This message was deleted.'
                        : isLastMsgMine
                        ? `You: ${lastMsg.body}`
                        : lastMsg.body}
                    </p>
                    {unread > 0 && (
                      <span
                        aria-label={`${unread} unread messages`}
                        className="inline-flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-full bg-brand-royal px-1.5 text-[10px] font-bold text-white"
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Community Discovery Card */}
      <div className="hidden md:block p-3 border-t border-surface-border/70 shrink-0">
        <div className="rounded-2xl border border-surface-border bg-surface-soft p-4 text-center space-y-2">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
            <Users className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-typography-navy">Join the community</p>
            <p className="text-[11px] text-typography-slate leading-relaxed">
              Connect with builders, share ideas and find collaborators.
            </p>
          </div>
          <Link
            to="/people"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-surface-border bg-surface-white px-4 py-1.5 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
          >
            Explore People &rarr;
          </Link>
        </div>
      </div>
    </aside>
  );
};

