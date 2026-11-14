import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Send,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserConversations,
  fetchConversationMessages,
  sendMessage,
  markConversationAsRead,
  subscribeToConversationMessages,
} from '@/services/api';
import type { Conversation, Message } from '@/types';
import { cn } from '@/utils/cn';

export const MessagesPage: React.FC = () => {
  const { isAuthenticated, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeIdFromUrl = searchParams.get('id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll messages container to latest message
  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // 1. Load all conversations on mount
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingConversations(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await fetchUserConversations();
      if (fetchErr) throw fetchErr;
      const list = data || [];
      setConversations(list);

      // If URL specifies an ID, find and select it
      if (activeIdFromUrl) {
        const found = list.find((c) => c.id === activeIdFromUrl);
        if (found) {
          setSelectedConversation(found);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Unable to load conversations. Please check your network and try again.');
    } finally {
      setLoadingConversations(false);
    }
  }, [isAuthenticated, activeIdFromUrl]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // 2. Load message history when selected conversation changes
  const selectedConvId = selectedConversation?.id;
  const selectedConvUnread = selectedConversation?.unread_count;

  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data, error: msgErr } = await fetchConversationMessages(selectedConvId);
        if (msgErr) throw msgErr;
        if (isMounted) {
          setMessages(data || []);
          setTimeout(() => scrollToBottom(false), 50);

          // Mark conversation as read in database
          if ((selectedConvUnread ?? 0) > 0) {
            void markConversationAsRead(selectedConvId);
            setConversations((prev) =>
              prev.map((c) => (c.id === selectedConvId ? { ...c, unread_count: 0 } : c))
            );
          }
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    void loadMessages();

    // 3. Realtime subscription for incoming messages
    const unsubscribe = subscribeToConversationMessages(selectedConvId, (newMsg) => {
      if (!isMounted) return;
      setMessages((prev) => {
        // Avoid duplicate insertion
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Mark as read immediately if current user is the recipient
      if (newMsg.sender_id !== profile?.id) {
        void markConversationAsRead(selectedConvId);
      }

      setTimeout(() => scrollToBottom(true), 50);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedConvId, selectedConvUnread, profile?.id, scrollToBottom]);

  // Handle selecting a conversation
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setSearchParams({ id: conv.id });
  };

  // Handle message submission
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConversation || !profile) return;

    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    // Verify conversation is active
    const reqStatus = selectedConversation.collaboration_request?.status;
    if (reqStatus === 'declined' || reqStatus === 'withdrawn') {
      alert(`Cannot send messages because this collaboration request is ${reqStatus}.`);
      return;
    }

    setSending(true);
    try {
      const { data: newMsg, error: sendErr } = await sendMessage(
        selectedConversation.id,
        trimmed
      );

      if (sendErr) {
        alert(sendErr.message || 'Failed to deliver message.');
      } else if (newMsg) {
        setInputText('');
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, sender: profile }];
        });
        // Update last message in sidebar preview
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  last_message: newMsg,
                  last_message_at: newMsg.created_at,
                }
              : c
          )
        );
        setTimeout(() => scrollToBottom(true), 50);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Helper to determine the "other" participant in the conversation
  const getOtherParticipant = (conv: Conversation) => {
    if (profile?.id === conv.creator_id) {
      return conv.requester;
    }
    return conv.creator;
  };

  // Filter conversations by search term
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const other = getOtherParticipant(c);
    const otherName = other?.full_name?.toLowerCase() || '';
    const otherUser = other?.username?.toLowerCase() || '';
    const ideaTitle = c.idea?.title?.toLowerCase() || '';
    return otherName.includes(q) || otherUser.includes(q) || ideaTitle.includes(q);
  });

  // If not authenticated, show sign-in prompt
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
            Direct messages are private communications between idea founders and applicants.
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
  const isRequestClosed =
    selectedConversation?.collaboration_request?.status === 'declined' ||
    selectedConversation?.collaboration_request?.status === 'withdrawn';

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col -mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* Messages Workspace Container */}
      <div className="flex-1 flex overflow-hidden bg-surface-white border-y border-surface-border">
        {/* ========================================================================= */}
        {/* PANEL 1: CONVERSATIONS SIDEBAR */}
        {/* ========================================================================= */}
        <div
          className={cn(
            'w-full md:w-80 lg:w-96 flex flex-col border-r border-surface-border bg-surface-soft shrink-0 transition-all',
            selectedConversation ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* Sidebar Header & Search */}
          <div className="p-4 border-b border-surface-border bg-surface-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-brand-royal" />
                <h1 className="text-base font-semibold text-typography-navy font-heading">
                  Direct Messages
                </h1>
              </div>
              <span className="rounded-full bg-brand-ice px-2.5 py-0.5 text-[11px] font-bold text-brand-royal">
                {conversations.length}
              </span>
            </div>

            {/* Conversation Search Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-typography-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by participant or idea..."
                className="w-full rounded-xl border border-surface-border bg-surface-soft py-1.5 pl-9 pr-3 text-xs text-typography-navy placeholder-typography-muted focus:bg-surface-white focus:outline-none focus:border-brand-royal transition-all"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-border/60">
            {loadingConversations ? (
              <div className="p-6 text-center text-xs text-typography-muted space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-2">
                    <div className="h-10 w-10 rounded-full bg-surface-border/60 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-surface-border/60 rounded w-1/2" />
                      <div className="h-2.5 bg-surface-border/40 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <AlertCircle className="mx-auto h-6 w-6 text-functional-error mb-2" />
                <p className="text-xs text-functional-error">{error}</p>
                <button
                  type="button"
                  onClick={loadConversations}
                  className="mt-3 text-xs font-semibold text-brand-royal hover:underline"
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-typography-muted space-y-2">
                <Sparkles className="mx-auto h-7 w-7 text-typography-muted opacity-50" />
                <p className="font-medium text-typography-slate">
                  {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                </p>
                <p className="text-[11px] text-typography-muted leading-relaxed max-w-xs mx-auto">
                  Direct conversations are automatically initiated when a collaboration request is submitted or reviewed.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isSelected = selectedConversation?.id === conv.id;
                const unread = conv.unread_count ?? 0;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      'w-full text-left p-3.5 flex items-start gap-3 transition-colors relative',
                      isSelected
                        ? 'bg-brand-ice/70 border-l-4 border-l-brand-royal'
                        : 'bg-surface-white hover:bg-surface-light'
                    )}
                  >
                    {/* Participant Avatar */}
                    <div className="relative shrink-0">
                      {other?.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt={other.full_name || 'Participant'}
                          className="h-10 w-10 rounded-full object-cover border border-surface-border"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-royal text-white text-xs font-bold uppercase">
                          {other?.full_name?.charAt(0) || other?.username?.charAt(0) || 'B'}
                        </div>
                      )}
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-royal px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            'text-xs font-semibold truncate',
                            unread > 0 ? 'text-typography-navy font-bold' : 'text-typography-navy'
                          )}
                        >
                          {other?.full_name || `@${other?.username || 'user'}`}
                        </span>
                        <span className="text-[10px] text-typography-muted shrink-0">
                          {new Date(conv.last_message_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Associated Idea or Purpose Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block truncate rounded bg-surface-soft px-1.5 py-0.5 text-[10px] font-medium text-typography-slate border border-surface-border/50">
                          {conv.idea?.title || conv.collaboration_request?.purpose || 'Direct Collaboration'}
                        </span>
                      </div>

                      {/* Last Message Preview */}
                      <p
                        className={cn(
                          'text-xs truncate leading-normal',
                          unread > 0
                            ? 'font-medium text-typography-navy'
                            : 'font-normal text-typography-slate'
                        )}
                      >
                        {conv.last_message ? conv.last_message.body : 'Conversation started'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL 2: ACTIVE CONVERSATION PANE */}
        {/* ========================================================================= */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-surface-soft overflow-hidden',
            !selectedConversation ? 'hidden md:flex' : 'flex'
          )}
        >
          {selectedConversation && activeOther ? (
            <>
              {/* Active Conversation Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-surface-white border-b border-surface-border shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConversation(null);
                      setSearchParams({});
                    }}
                    className="md:hidden rounded-lg p-1 text-typography-slate hover:bg-surface-light hover:text-typography-navy transition-colors shrink-0"
                    title="Back to conversation list"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  {/* Other Participant Avatar */}
                  <div className="shrink-0">
                    {activeOther.avatar_url ? (
                      <img
                        src={activeOther.avatar_url}
                        alt={activeOther.full_name || 'Participant'}
                        className="h-10 w-10 rounded-full object-cover border border-surface-border"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-royal text-white text-xs font-bold uppercase">
                        {activeOther.full_name?.charAt(0) || activeOther.username?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>

                  {/* Header Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/profile/${activeOther.username}`}
                        className="text-sm font-semibold text-typography-navy hover:text-brand-royal transition-colors truncate"
                      >
                        {activeOther.full_name || `@${activeOther.username}`}
                      </Link>
                      <span className="text-[11px] text-typography-muted truncate">
                        (@{activeOther.username})
                      </span>
                      {selectedConversation.collaboration_request?.status && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.2 text-[10px] font-semibold capitalize',
                            selectedConversation.collaboration_request.status === 'accepted'
                              ? 'bg-functional-success-light text-functional-success'
                              : selectedConversation.collaboration_request.status === 'pending'
                              ? 'bg-functional-warning-light text-functional-warning'
                              : 'bg-functional-error-light text-functional-error'
                          )}
                        >
                          Request: {selectedConversation.collaboration_request.status}
                        </span>
                      )}
                    </div>

                    {/* Associated Idea or General Purpose Pill */}
                    {selectedConversation.idea ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-typography-muted">Topic:</span>
                        <Link
                          to={`/ideas/${selectedConversation.idea.slug}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-royal hover:underline truncate"
                        >
                          {selectedConversation.idea.title}
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-typography-muted">Purpose:</span>
                        <span className="text-[11px] font-medium text-typography-navy truncate">
                          {selectedConversation.collaboration_request?.purpose || 'Direct Collaboration'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Security & Context Indicator */}
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-typography-muted bg-surface-soft px-2.5 py-1 rounded-lg border border-surface-border/60 shrink-0">
                  <Shield className="h-3 w-3 text-brand-royal" />
                  <span>End-to-End Authorized</span>
                </div>
              </div>

              {/* Closed Request Warning Banner */}
              {isRequestClosed && (
                <div className="flex items-center gap-2 bg-functional-warning-light border-b border-functional-warning/20 px-4 py-2 text-xs text-functional-warning shrink-0">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    This collaboration request was {selectedConversation.collaboration_request?.status}. Messaging is disabled.
                  </span>
                </div>
              )}

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-xs text-typography-muted">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-typography-navy font-heading">
                      Direct Collaboration Workspace
                    </h3>
                    <p className="text-xs text-typography-slate max-w-sm leading-relaxed">
                      {selectedConversation.idea ? (
                        <>
                          This conversation is linked to the collaboration application for{' '}
                          <strong>{selectedConversation.idea.title}</strong>. Send a message to coordinate scope and expectations.
                        </>
                      ) : (
                        <>
                          This conversation is linked to your direct collaboration request
                          {selectedConversation.collaboration_request?.purpose
                            ? ` (${selectedConversation.collaboration_request.purpose})`
                            : ''}
                          . Send a message to start collaborating.
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === profile?.id;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col max-w-[85%] sm:max-w-[70%]',
                          isMine ? 'ml-auto items-end' : 'mr-auto items-start'
                        )}
                      >
                        {/* Bubble */}
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-2xs',
                            isMine
                              ? 'bg-brand-royal text-white rounded-br-xs'
                              : 'bg-surface-white text-typography-navy border border-surface-border rounded-bl-xs'
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.body}</p>
                        </div>

                        {/* Timestamp & Read Indicator */}
                        <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-typography-muted">
                          <Clock className="h-2.5 w-2.5" />
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMine && (
                            <span
                              title={msg.read_at ? 'Read by recipient' : 'Sent'}
                              className="ml-0.5"
                            >
                              {msg.read_at ? (
                                <CheckCheck className="h-3 w-3 text-brand-royal inline" />
                              ) : (
                                <Check className="h-3 w-3 text-typography-muted inline" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Footer */}
              <div className="p-3 sm:p-4 bg-surface-white border-t border-surface-border shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="relative flex items-end gap-2 rounded-2xl border border-surface-border bg-surface-soft p-1.5 focus-within:border-brand-royal focus-within:ring-2 focus-within:ring-brand-pale/50 transition-all">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isRequestClosed || sending}
                      placeholder={
                        isRequestClosed
                          ? 'Messaging is closed for this request.'
                          : 'Write your message... (Enter to send, Shift+Enter for newline)'
                      }
                      rows={2}
                      maxLength={5000}
                      className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-typography-navy placeholder-typography-muted resize-none focus:outline-none disabled:opacity-50"
                    />

                    <button
                      type="submit"
                      disabled={!inputText.trim() || isRequestClosed || sending}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-royal text-white shadow-sm hover:bg-brand-deep transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-1 text-[10px] text-typography-muted">
                    <span>Press Enter to send</span>
                    <span>{inputText.length} / 5000</span>
                  </div>
                </form>
              </div>
            </>
          ) : (
            /* Empty State: No conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-ice text-brand-royal shadow-sm">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h2 className="text-xl font-light text-typography-navy font-heading">
                  Select a Conversation
                </h2>
                <p className="text-xs sm:text-sm text-typography-slate leading-relaxed">
                  Choose a conversation from the sidebar or click <strong>Message</strong> on any collaboration request in your dashboard to start coordinating with builders.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3 text-xs">
                <Link
                  to="/dashboard?tab=incoming"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-4 py-2 font-semibold text-typography-navy hover:bg-surface-light transition-all shadow-2xs"
                >
                  <Layers className="h-3.5 w-3.5 text-brand-royal" />
                  View Collaboration Requests
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
