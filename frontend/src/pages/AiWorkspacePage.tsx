import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Send,
  Loader2,
  AlertCircle,
  Trash2,
  Lightbulb,
  MessageSquare,
  History,
  X,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchAiConversations,
  fetchAiConversationDetail,
  deleteAiConversation,
  fetchAiUsage,
  sendAiChatMessage,
  fetchUserIdeas,
  type AiConversation,
  type AiMessage,
  type AiUsageAllowance,
} from '@/services/api';
import { AiMessageContent } from '@/components/ai/AiMessageContent';
import { CustomSelect } from '@/components/common/CustomSelect';
import type { Idea } from '@/types';
import { cn } from '@/utils/cn';

const STARTER_PROMPTS = [
  'Help me turn my unfinished idea into a focused MVP scope.',
  'How do I publish an idea and find collaborators on Ideora?',
  'What risky assumptions should I validate before writing code?',
];

export const AiWorkspacePage: React.FC = () => {
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [usage, setUsage] = useState<AiUsageAllowance | null>(null);
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>('');

  const [inputText, setInputText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [mobileIdeaPickerOpen, setMobileIdeaPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const loadWorkspaceData = useCallback(async () => {
    if (!isAuthenticated || !profile?.id) return;
    setLoadingList(true);
    try {
      const [convRes, usageRes, ideasRes] = await Promise.all([
        fetchAiConversations('public'),
        fetchAiUsage('public'),
        fetchUserIdeas(profile.id),
      ]);
      if (convRes.data) setConversations(convRes.data);
      if (usageRes.data) setUsage(usageRes.data);
      if (ideasRes.data) setMyIdeas(ideasRes.data);
    } finally {
      setLoadingList(false);
    }
  }, [isAuthenticated, profile?.id]);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleSelectConversation = async (conv: AiConversation) => {
    setMobileHistoryOpen(false);
    setError(null);
    setLoadingThread(true);
    setActiveConversation(conv);
    setSelectedIdeaId(conv.idea_id || '');
    const res = await fetchAiConversationDetail('public', conv.id);
    setLoadingThread(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setMessages(res.messages);
    scrollToBottom();
  };

  const handleNewConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    setError(null);
    setMobileHistoryOpen(false);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error: delErr } = await deleteAiConversation('public', convId);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversation?.id === convId) {
      handleNewConversation();
    }
  };

  const handleSend = async (promptOverride?: string) => {
    const text = (promptOverride ?? inputText).trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    const res = await sendAiChatMessage({
      scope: 'public',
      agentId: 'idea_development',
      message: text,
      conversationId: activeConversation?.id ?? null,
      ideaId: selectedIdeaId || null,
    });

    setSending(false);

    if (res.error || !res.data) {
      setError(res.error?.message || 'Unable to get AI response.');
      return;
    }

    if (!promptOverride) {
      setInputText('');
    }

    const { conversation, userMessage, assistantMessage, usage: updatedUsage } = res.data;
    setActiveConversation(conversation);
    setUsage(updatedUsage);
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conversation.id);
      if (exists) {
        return [
          conversation,
          ...prev.filter((c) => c.id !== conversation.id),
        ];
      }
      return [conversation, ...prev];
    });
    scrollToBottom();
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-10 shadow-sm space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-light text-typography-navy font-heading">
            Sign In or Sign Up to Ask ORA
          </h1>
          <p className="text-xs sm:text-sm text-typography-slate">
            Your intelligent companion inside Ideora. Sign in or create an account to develop ideas, discover collaborators, and navigate the platform.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth', { state: { from: '/ai' } })}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
          >
            Sign In or Sign Up
          </button>
        </div>
      </div>
    );
  }

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : conversations;

  const formatShortTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const historySidebarContent = (
    <div className="flex flex-col h-full bg-surface-white">
      <div className="px-4 py-3.5 border-b border-surface-border space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-typography-navy font-heading">
              Conversations
            </h2>
            {conversations.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-brand-royal/15 px-2 py-0.5 text-[11px] font-semibold text-brand-royal tabular-nums">
                {conversations.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleNewConversation}
            title="New conversation"
            aria-label="New conversation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-royal text-white shadow-xs hover:bg-brand-deep transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search conversations */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-typography-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-surface-border bg-surface-soft pl-8 pr-3 py-2 text-xs text-typography-navy placeholder-typography-muted focus:border-brand-royal focus:bg-surface-white focus:outline-none transition-colors"
          />
        </div>

        {usage && (
          <div className="rounded-xl border border-surface-border bg-surface-soft px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-typography-slate">Daily Allowance</span>
              <span className="font-semibold text-typography-navy tabular-nums">
                {usage.dailyRequestsUsed} / {usage.dailyRequestLimit}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-border overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-royal transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((usage.dailyRequestsUsed / Math.max(1, usage.dailyRequestLimit)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1">
        {loadingList ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-surface-soft animate-pulse" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-typography-muted space-y-1.5">
            <MessageSquare className="mx-auto h-6 w-6 opacity-50" />
            <p>
              {searchQuery.trim()
                ? 'No matching conversations.'
                : 'No conversations with ORA yet.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const active = activeConversation?.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => void handleSelectConversation(conv)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleSelectConversation(conv);
                  }
                }}
                className={cn(
                  'group flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left cursor-pointer border transition-all',
                  active
                    ? 'bg-brand-royal/10 border-brand-royal/30 shadow-2xs'
                    : 'border-transparent hover:bg-surface-soft'
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-royal/10 text-brand-royal border border-brand-royal/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-xs font-semibold',
                        active ? 'text-brand-royal' : 'text-typography-navy'
                      )}
                    >
                      {conv.title}
                    </span>
                    <span className="text-[10px] text-typography-muted shrink-0 tabular-nums">
                      {formatShortTime(conv.last_message_at || conv.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-typography-slate truncate mt-0.5">
                    ORA Conversation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => void handleDeleteConversation(conv.id, e)}
                  aria-label="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg p-1.5 text-typography-muted hover:text-functional-error hover:bg-surface-white transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-4.25rem)] md:h-[calc(100dvh-4rem)] flex -mx-4 -mt-6 -mb-28 sm:-mx-6 md:-mb-8 lg:-mx-8 overflow-hidden bg-surface-white">
      {/* Desktop Conversations Sidebar (Messages-style) */}
      <aside className="hidden md:flex w-[320px] lg:w-[340px] flex-col border-r border-surface-border bg-surface-white shrink-0">
        {historySidebarContent}
      </aside>

      {/* Mobile Conversations Drawer */}
      {mobileHistoryOpen && (
        <div
          className="fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileHistoryOpen(false)}
        >
          <aside
            className="w-80 max-w-[85vw] bg-surface-white h-full shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-typography-slate">
                ORA Conversations
              </span>
              <button
                type="button"
                onClick={() => setMobileHistoryOpen(false)}
                aria-label="Close history"
                className="rounded-lg p-1 text-typography-muted hover:text-typography-navy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{historySidebarContent}</div>
          </aside>
        </div>
      )}

      {/* Main Active Conversation Pane (Messages-style, fixed full-viewport on mobile) */}
      <section className="fixed inset-x-0 top-0 h-[100dvh] z-50 md:static md:inset-auto md:h-auto md:z-auto flex-1 flex flex-col min-w-0 min-h-0 bg-surface-soft overflow-hidden">
        {/* Sticky Conversation Header (Single clean row on mobile & desktop) */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-surface-white border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="md:hidden rounded-xl p-1.5 text-typography-slate hover:bg-surface-soft hover:text-typography-navy transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-brand-royal/10 text-brand-royal border border-brand-royal/20 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-typography-navy font-heading truncate leading-tight">
                Ask ORA
              </h1>
              <p className="text-[11px] text-typography-slate truncate">
                Your intelligent companion inside Ideora.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Desktop/Tablet Idea Context Selector */}
            {myIdeas.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-brand-royal shrink-0" />
                <CustomSelect
                  value={selectedIdeaId}
                  onChange={setSelectedIdeaId}
                  disabled={Boolean(activeConversation)}
                  placeholder="No idea attached"
                  className="w-[210px]"
                  triggerClassName="rounded-xl bg-surface-soft px-3 py-1.5 text-xs text-typography-navy"
                  menuClassName="right-0 left-auto min-w-[240px]"
                  options={[
                    { label: 'No idea attached', value: '' },
                    ...myIdeas.map((idea) => ({
                      label: idea.title,
                      value: idea.id,
                      badge: idea.status.replace(/_/g, ' '),
                    })),
                  ]}
                />
              </div>
            )}

            {/* Mobile Idea Context Toggle */}
            {myIdeas.length > 0 && (
              <button
                type="button"
                onClick={() => setMobileIdeaPickerOpen((prev) => !prev)}
                aria-label="Attach an idea"
                title="Attach an idea"
                className={cn(
                  'sm:hidden flex h-9 w-9 items-center justify-center rounded-full border transition-colors shrink-0',
                  selectedIdeaId || mobileIdeaPickerOpen
                    ? 'border-brand-royal/40 bg-brand-royal/10 text-brand-royal'
                    : 'border-surface-border bg-surface-soft text-typography-slate hover:text-typography-navy'
                )}
              >
                <Lightbulb className="h-4 w-4" />
              </button>
            )}

            {/* Mobile History Button */}
            <button
              type="button"
              onClick={() => setMobileHistoryOpen(true)}
              aria-label="Open conversation history"
              title="Conversations"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface-soft text-typography-slate hover:text-typography-navy transition-colors shrink-0"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Expandable Idea Context Strip */}
        {myIdeas.length > 0 && (mobileIdeaPickerOpen || selectedIdeaId) && (
          <div className="sm:hidden flex items-center gap-2 px-3 py-2 bg-surface-white/95 border-b border-surface-border shrink-0">
            <Lightbulb className="h-3.5 w-3.5 text-brand-royal shrink-0" />
            <CustomSelect
              value={selectedIdeaId}
              onChange={(val) => {
                setSelectedIdeaId(val);
                if (!val) setMobileIdeaPickerOpen(false);
              }}
              disabled={Boolean(activeConversation)}
              placeholder="No idea attached"
              className="flex-1 min-w-0"
              triggerClassName="rounded-xl bg-surface-soft px-3 py-1.5 text-xs text-typography-navy"
              options={[
                { label: 'No idea attached', value: '' },
                ...myIdeas.map((idea) => ({
                  label: idea.title,
                  value: idea.id,
                  badge: idea.status.replace(/_/g, ' '),
                })),
              ]}
            />
          </div>
        )}

        {/* Scrollable Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 sm:px-6 sm:py-5 space-y-4">
          {loadingThread ? (
            <div className="flex h-full items-center justify-center text-xs text-typography-muted gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-brand-royal" />
              <span>Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-2xl py-8 text-center space-y-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-royal/10 text-brand-royal border border-brand-royal/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-light text-typography-navy font-heading">
                  Ask ORA
                </h2>
                <p className="text-xs sm:text-sm text-typography-slate max-w-lg mx-auto leading-relaxed">
                  Your intelligent companion inside Ideora. Develop raw ideas, plan your MVP, discover collaborators, or ask ORA to take you anywhere on the platform.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleSend(prompt)}
                    disabled={sending}
                    className="rounded-2xl border border-surface-border bg-surface-white p-3.5 text-xs text-typography-navy hover:border-brand-royal hover:bg-brand-ice/30 transition-all leading-relaxed shadow-2xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-3.5">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col',
                      isUser ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[90%] sm:max-w-[78%] rounded-2xl px-4 py-2.5',
                        isUser
                          ? 'bg-brand-royal text-white rounded-br-sm text-xs sm:text-sm shadow-xs'
                          : 'bg-surface-white border border-surface-border rounded-bl-sm shadow-2xs'
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                      ) : (
                        <AiMessageContent
                          content={msg.content}
                          navigationActions={msg.metadata?.navigationActions}
                        />
                      )}
                    </div>
                    <span className="mt-1 px-1 text-[10px] text-typography-muted tabular-nums">
                      {formatShortTime(msg.created_at)}
                    </span>
                  </div>
                );
              })}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-typography-slate px-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-royal" />
                  <span>ORA is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky Messages-style Pill Composer */}
        <div className="sticky bottom-0 z-20 px-3 py-2.5 sm:px-5 sm:py-3.5 bg-surface-white border-t border-surface-border shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl space-y-1.5">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light/70 px-3 py-2 text-xs text-functional-error"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="flex items-end gap-2 rounded-[26px] border border-surface-border bg-surface-soft pl-4 pr-2 py-1.5 focus-within:border-brand-royal focus-within:bg-surface-white transition-all"
            >
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={sending}
                rows={1}
                maxLength={4000}
                placeholder="Ask ORA anything..."
                className="flex-1 max-h-36 py-2 bg-transparent text-sm text-typography-navy placeholder-typography-muted resize-none focus:outline-none leading-relaxed"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                aria-label="Send prompt"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-royal text-white hover:bg-brand-deep disabled:opacity-40 transition-colors shrink-0 mb-0.5"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>

            <div className="flex items-center justify-between px-2 text-[10px] text-typography-muted">
              <span className="hidden sm:inline">
                Enter to send · Shift + Enter for new line
              </span>
              <span className="sm:hidden">Tap send to ask ORA</span>
              {activeConversation && (
                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="font-semibold text-brand-royal hover:underline"
                >
                  + New chat
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

