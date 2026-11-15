import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Layers,
  PanelRightOpen,
  PanelRightClose,
  Info,
  RefreshCw,
  ChevronUp,
  Loader2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserConversations,
  fetchConversationById,
  fetchConversationMessages,
  sendMessage,
  editMessage,
  softDeleteMessage,
  markConversationAsRead,
  subscribeToConversationMessages,
  subscribeToUserConversationUpdates,
} from '@/services/api';
import {
  ConversationSidebar,
  type ConversationFilter,
} from '@/components/messages/ConversationSidebar';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { ConversationContextPanel } from '@/components/messages/ConversationContextPanel';
import type { Conversation, Message, UserProfile } from '@/types';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 50;

function formatDateSeparator(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function isSameCalendarDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const MessagesPage: React.FC = () => {
  const { isAuthenticated, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeIdFromUrl = searchParams.get('id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [unavailableConversationId, setUnavailableConversationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [isContextOpen, setIsContextOpen] = useState(true);
  const [isMobileContextOpen, setIsMobileContextOpen] = useState(false);

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isNearBottom = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom < 140;
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    });
  }, []);

  const getOtherParticipant = useCallback(
    (conv: Conversation): UserProfile | undefined => {
      if (profile?.id === conv.creator_id) {
        return conv.requester;
      }
      return conv.creator;
    },
    [profile?.id]
  );

  // 1. Load conversations list
  const loadConversations = useCallback(
    async (silent = false) => {
      if (!isAuthenticated) return;
      if (!silent) {
        setLoadingConversations(true);
        setConversationsError(null);
      }
      try {
        const { data, error: fetchErr } = await fetchUserConversations();
        if (fetchErr) throw fetchErr;
        const list = data || [];
        setConversations(list);

        if (activeIdFromUrl) {
          const found = list.find((c) => c.id === activeIdFromUrl);
          if (found) {
            setSelectedConversation(found);
            setUnavailableConversationId(null);
          } else {
            // Double-check directly in case it wasn't in initial batch or unauthorized
            const { data: singleConv } = await fetchConversationById(activeIdFromUrl);
            if (singleConv) {
              setSelectedConversation(singleConv);
              setUnavailableConversationId(null);
            } else {
              setSelectedConversation(null);
              setUnavailableConversationId(activeIdFromUrl);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
        if (!silent) {
          setConversationsError(
            'Unable to load conversations. Please check your connection and try again.'
          );
        }
      } finally {
        if (!silent) setLoadingConversations(false);
      }
    },
    [isAuthenticated, activeIdFromUrl]
  );

  useEffect(() => {
    void loadConversations(false);
  }, [loadConversations]);

  // Background realtime listener for conversation list updates
  useEffect(() => {
    if (!isAuthenticated || !profile?.id) return;
    return subscribeToUserConversationUpdates(profile.id, () => {
      void loadConversations(true);
    });
  }, [isAuthenticated, profile?.id, loadConversations]);

  // 2. Load messages for selected conversation + subscribe to INSERT & UPDATE
  const selectedConvId = selectedConversation?.id;

  const loadInitialMessages = useCallback(
    async (convId: string) => {
      setLoadingMessages(true);
      setMessagesError(null);
      setHasMoreMessages(false);
      try {
        const { data, hasMore, error: msgErr } = await fetchConversationMessages(convId, {
          limit: PAGE_SIZE,
        });
        if (msgErr) throw msgErr;
        setMessages(data || []);
        setHasMoreMessages(hasMore);
        scrollToBottom(false);

        // Mark unread messages as read
        void markConversationAsRead(convId).then(({ count }) => {
          if (count > 0) {
            setConversations((prev) =>
              prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
            );
          }
        });
      } catch (err) {
        console.error('Failed to load messages:', err);
        setMessagesError('Unable to load message history. Check your connection and try again.');
      } finally {
        setLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      setMessagesError(null);
      setHasMoreMessages(false);
      return;
    }

    let isMounted = true;
    void loadInitialMessages(selectedConvId);

    const unsubscribe = subscribeToConversationMessages(selectedConvId, {
      onNewMessage: (newMsg) => {
        if (!isMounted) return;
        const shouldAutoScroll =
          newMsg.sender_id === profile?.id || isNearBottom();

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvId
              ? {
                  ...c,
                  last_message: newMsg,
                  last_message_at: newMsg.created_at,
                  unread_count: 0,
                }
              : c
          )
        );

        if (newMsg.sender_id !== profile?.id) {
          void markConversationAsRead(selectedConvId);
        }

        if (shouldAutoScroll) {
          scrollToBottom(true);
        }
      },
      onMessageUpdated: (updatedMsg) => {
        if (!isMounted) return;
        setMessages((prev) =>
          prev.map((existing) => {
            if (existing.id !== updatedMsg.id) return existing;
            // Prevent deleted messages from ever being restored by stale events
            const staysDeleted = Boolean(existing.deleted_at || updatedMsg.deleted_at);
            return {
              ...existing,
              ...updatedMsg,
              deleted_at: existing.deleted_at ?? updatedMsg.deleted_at,
              body: staysDeleted ? '' : updatedMsg.body,
              sender: existing.sender,
            };
          })
        );

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== selectedConvId || c.last_message?.id !== updatedMsg.id) {
              return c;
            }
            const staysDeleted = Boolean(c.last_message.deleted_at || updatedMsg.deleted_at);
            return {
              ...c,
              last_message: {
                ...c.last_message,
                ...updatedMsg,
                deleted_at: c.last_message.deleted_at ?? updatedMsg.deleted_at,
                body: staysDeleted ? '' : updatedMsg.body,
              },
            };
          })
        );
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedConvId, profile?.id, loadInitialMessages, isNearBottom, scrollToBottom]);

  // Load older paginated messages without losing scroll position
  const handleLoadOlderMessages = async () => {
    if (!selectedConvId || loadingOlder || !hasMoreMessages || messages.length === 0) {
      return;
    }
    const oldest = messages[0];
    const scrollEl = messagesScrollRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0;

    setLoadingOlder(true);
    try {
      const { data, hasMore, error: fetchErr } = await fetchConversationMessages(selectedConvId, {
        limit: PAGE_SIZE,
        before: oldest.created_at,
      });
      if (fetchErr) throw fetchErr;
      if (data && data.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueOlder = data.filter((m) => !existingIds.has(m.id));
          return [...uniqueOlder, ...prev];
        });
        requestAnimationFrame(() => {
          if (scrollEl) {
            const newScrollHeight = scrollEl.scrollHeight;
            scrollEl.scrollTop += newScrollHeight - prevScrollHeight;
          }
        });
      }
      setHasMoreMessages(hasMore);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setUnavailableConversationId(null);
    setSendError(null);
    setIsMobileContextOpen(false);
    setSearchParams({ id: conv.id });
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setUnavailableConversationId(null);
    setIsMobileContextOpen(false);
    setSearchParams({});
  };

  // Send message — preserves inputText if sending fails
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConversation || !profile) return;

    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    const reqStatus = selectedConversation.collaboration_request?.status;
    if (reqStatus === 'declined' || reqStatus === 'withdrawn') {
      setSendError(`Cannot send messages because this collaboration request is ${reqStatus}.`);
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      const { data: newMsg, error: sendErr } = await sendMessage(
        selectedConversation.id,
        trimmed
      );

      if (sendErr) {
        setSendError(sendErr.message || 'Failed to deliver message. Your text was preserved.');
        return;
      }

      if (newMsg) {
        setInputText('');
        const hydrated: Message = { ...newMsg, sender: profile };
        setMessages((prev) => {
          if (prev.some((m) => m.id === hydrated.id)) return prev;
          return [...prev, hydrated];
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  last_message: hydrated,
                  last_message_at: hydrated.created_at,
                }
              : c
          )
        );
        scrollToBottom(true);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleEditMessage = async (
    messageId: string,
    newBody: string
  ): Promise<string | null> => {
    const { data: updated, error: editErr } = await editMessage(messageId, newBody);
    if (editErr || !updated) {
      return editErr?.message || 'Failed to update message. Please try again.';
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...updated, sender: m.sender } : m))
    );
    setConversations((prev) =>
      prev.map((c) =>
        c.last_message?.id === messageId
          ? { ...c, last_message: { ...c.last_message, ...updated } }
          : c
      )
    );
    return null;
  };

  const handleDeleteMessage = async (messageId: string): Promise<string | null> => {
    const { data: deleted, error: delErr } = await softDeleteMessage(messageId);
    if (delErr || !deleted) {
      return delErr?.message || 'Failed to delete message. Please try again.';
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, ...deleted, body: '', sender: m.sender }
          : m
      )
    );
    setConversations((prev) =>
      prev.map((c) =>
        c.last_message?.id === messageId
          ? {
              ...c,
              last_message: { ...c.last_message, ...deleted, body: '' },
            }
          : c
      )
    );
    return null;
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-10 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-4">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-light text-typography-navy font-heading">
            Sign In to Access Messages
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-typography-slate leading-relaxed">
            Direct messages are private workspaces between idea owners and collaborators.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth', { state: { from: '/messages' } })}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep transition-all"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  const activeOther = selectedConversation ? getOtherParticipant(selectedConversation) : null;
  const reqStatus = selectedConversation?.collaboration_request?.status;
  const isRequestClosed = reqStatus === 'declined' || reqStatus === 'withdrawn';

  return (
    <div className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] flex flex-col -mx-4 -mt-6 -mb-28 sm:-mx-6 md:-mb-8 lg:-mx-8 overflow-hidden">
      <div className="flex-1 flex min-h-0 overflow-hidden bg-surface-white">
        {/* LEFT PANEL: Conversations Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          selectedConversationId={selectedConversation?.id ?? null}
          currentUserId={profile?.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          loading={loadingConversations}
          error={conversationsError}
          onRetry={() => void loadConversations(false)}
          onSelectConversation={handleSelectConversation}
          getOtherParticipant={getOtherParticipant}
        />

        {/* CENTER PANEL: Active Conversation (Full-screen on mobile when selected) */}
        <section
          aria-label="Active conversation"
          className={cn(
            'flex-1 flex flex-col min-w-0 min-h-0 bg-surface-soft overflow-hidden',
            selectedConversation
              ? 'fixed inset-x-0 top-0 h-[100dvh] z-50 md:static md:inset-auto md:h-auto md:z-auto flex'
              : 'hidden md:flex'
          )}
        >
          {selectedConversation && activeOther ? (
            <>
              {/* Conversation Header */}
              <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5 py-3 bg-surface-white border-b border-surface-border shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    aria-label="Back to conversations"
                    className="md:hidden rounded-xl p-1.5 text-typography-slate hover:bg-surface-soft hover:text-typography-navy transition-colors shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <Link
                    to={activeOther.username ? `/profile/${activeOther.username}` : '#'}
                    className="shrink-0"
                    aria-label={`View ${activeOther.full_name || activeOther.username}'s profile`}
                  >
                    {activeOther.avatar_url ? (
                      <img
                        src={activeOther.avatar_url}
                        alt={activeOther.full_name || 'Participant'}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover border border-surface-border"
                      />
                    ) : (
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-brand-royal/10 text-brand-royal border border-brand-royal/20 text-xs font-bold uppercase">
                        {activeOther.full_name?.charAt(0) || activeOther.username?.charAt(0) || 'U'}
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link
                        to={activeOther.username ? `/profile/${activeOther.username}` : '#'}
                        className="text-sm font-semibold text-typography-navy hover:text-brand-royal transition-colors truncate"
                      >
                        {activeOther.full_name || `@${activeOther.username}`}
                      </Link>
                      {activeOther.username && (
                        <span className="hidden sm:inline text-xs text-typography-muted truncate">
                          @{activeOther.username}
                        </span>
                      )}
                    </div>

                    {selectedConversation.idea ? (
                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <Link
                          to={`/ideas/${selectedConversation.idea.slug}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-royal hover:underline truncate"
                        >
                          <span className="truncate">{selectedConversation.idea.title}</span>
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </Link>
                        {selectedConversation.collaboration_request?.role?.role_title && (
                          <span className="hidden sm:inline text-[11px] text-typography-muted truncate">
                            · {selectedConversation.collaboration_request.role.role_title}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-typography-slate truncate mt-0.5">
                        {selectedConversation.collaboration_request?.purpose || 'Direct Collaboration'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Header Actions: Toggle Context Panel */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMobileContextOpen(true)}
                    aria-label="Open conversation details"
                    className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface-soft text-typography-navy hover:bg-surface-light transition-colors"
                  >
                    <Info className="h-4 w-4 text-brand-royal" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsContextOpen((prev) => !prev)}
                    aria-label={isContextOpen ? 'Hide context panel' : 'Show context panel'}
                    aria-pressed={isContextOpen}
                    title={isContextOpen ? 'Hide details' : 'Show details'}
                    className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface-soft text-typography-slate hover:bg-surface-light hover:text-typography-navy transition-colors"
                  >
                    {isContextOpen ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </header>

              {/* Closed Request Banner */}
              {isRequestClosed && (
                <div className="flex items-center gap-2 bg-functional-warning-light/80 border-b border-functional-warning/20 px-4 py-2 text-xs text-functional-warning shrink-0">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    This collaboration request was {reqStatus}. New messages and edits are disabled.
                  </span>
                </div>
              )}

              {/* Messages Scroll Container */}
              <div
                ref={messagesScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 sm:px-6 sm:py-5"
              >
                {loadingMessages ? (
                  <div className="space-y-4 py-4" aria-busy="true" aria-label="Loading messages">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'animate-pulse flex flex-col gap-1.5 max-w-[65%]',
                          i % 2 === 0 ? 'ml-auto items-end' : 'mr-auto items-start'
                        )}
                      >
                        <div className="h-10 w-48 sm:w-64 rounded-2xl bg-surface-border/60" />
                        <div className="h-2.5 w-12 rounded bg-surface-border/40" />
                      </div>
                    ))}
                  </div>
                ) : messagesError ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-functional-error-light text-functional-error">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <p className="text-sm font-semibold text-typography-navy">
                        Failed to load messages
                      </p>
                      <p className="text-xs text-typography-slate">{messagesError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadInitialMessages(selectedConversation.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <h2 className="text-sm font-semibold text-typography-navy font-heading">
                        Start the conversation
                      </h2>
                      <p className="text-xs text-typography-slate leading-relaxed">
                        {selectedConversation.idea ? (
                          <>
                            Align on scope, timeline, and next steps for{' '}
                            <strong className="text-typography-navy">
                              {selectedConversation.idea.title}
                            </strong>
                            .
                          </>
                        ) : (
                          'Introduce yourself and share what you would like to build together.'
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {hasMoreMessages && (
                      <div className="flex justify-center pb-4">
                        <button
                          type="button"
                          onClick={() => void handleLoadOlderMessages()}
                          disabled={loadingOlder}
                          className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-white px-3.5 py-1.5 text-xs font-medium text-typography-slate hover:bg-surface-light hover:text-typography-navy disabled:opacity-50 transition-colors shadow-2xs"
                        >
                          {loadingOlder ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ChevronUp className="h-3.5 w-3.5" />
                          )}
                          {loadingOlder ? 'Loading older messages...' : 'Load older messages'}
                        </button>
                      </div>
                    )}

                    {messages.map((msg, index) => {
                      const prev = index > 0 ? messages[index - 1] : null;
                      const showDateSeparator =
                        !prev || !isSameCalendarDay(prev.created_at, msg.created_at);

                      const isGroupedWithPrevious =
                        !showDateSeparator &&
                        prev !== null &&
                        prev.sender_id === msg.sender_id &&
                        new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() <
                          5 * 60 * 1000;

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div
                              role="separator"
                              className="my-4 flex items-center justify-center select-none"
                            >
                              <span className="rounded-full bg-surface-white border border-surface-border/80 px-3.5 py-1 text-[11px] font-medium text-typography-slate shadow-2xs">
                                {formatDateSeparator(msg.created_at)}
                              </span>
                            </div>
                          )}

                          <MessageBubble
                            message={msg}
                            isMine={msg.sender_id === profile?.id}
                            isGroupedWithPrevious={isGroupedWithPrevious}
                            isRequestClosed={isRequestClosed}
                            onEditMessage={handleEditMessage}
                            onDeleteMessage={handleDeleteMessage}
                          />
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Anchored Message Composer */}
              <MessageComposer
                value={inputText}
                onChange={setInputText}
                onSubmit={handleSendMessage}
                sending={sending}
                disabled={isRequestClosed}
                disabledReason={
                  isRequestClosed
                    ? `Messaging is closed because this request was ${reqStatus}.`
                    : undefined
                }
                sendError={sendError}
                onDismissError={() => setSendError(null)}
                textareaRef={textareaRef}
              />
            </>
          ) : unavailableConversationId ? (
            /* Empty State: Unavailable / Unauthorized Conversation */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-functional-warning-light text-functional-warning">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h2 className="text-lg font-semibold text-typography-navy font-heading">
                  Conversation Unavailable
                </h2>
                <p className="text-xs sm:text-sm text-typography-slate leading-relaxed">
                  This conversation could not be found, or you do not have permission to view it.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
              >
                Return to Messages
              </button>
            </div>
          ) : (
            /* Empty State: No Conversation Selected on Desktop */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
                <MessageSquare className="h-7 w-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h2 className="text-lg font-semibold text-typography-navy font-heading">
                  Select a Conversation
                </h2>
                <p className="text-xs sm:text-sm text-typography-slate leading-relaxed">
                  Choose a thread from the left to coordinate with founders and builders, or review pending requests in your workspace.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <Link
                  to="/dashboard?tab=incoming"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors shadow-2xs"
                >
                  <Layers className="h-3.5 w-3.5 text-brand-royal" />
                  Collaboration Requests
                </Link>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
                >
                  Discover Ideas
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Collapsible Desktop Context Panel */}
        {selectedConversation && isContextOpen && (
          <div className="hidden lg:flex h-full">
            <ConversationContextPanel
              conversation={selectedConversation}
              currentUserId={profile?.id}
              onClose={() => setIsContextOpen(false)}
            />
          </div>
        )}

        {/* MOBILE/TABLET CONTEXT DRAWER */}
        {selectedConversation && isMobileContextOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Conversation details"
            className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setIsMobileContextOpen(false)}
          >
            <div
              className="h-full w-full max-w-xs bg-surface-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <ConversationContextPanel
                conversation={selectedConversation}
                currentUserId={profile?.id}
                onClose={() => setIsMobileContextOpen(false)}
                isMobileDrawer
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
