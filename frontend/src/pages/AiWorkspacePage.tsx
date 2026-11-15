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

  const historySidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-surface-border space-y-3">
        <button
          type="button"
          onClick={handleNewConversation}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Conversation</span>
        </button>

        {usage && (
          <div className="rounded-xl border border-surface-border bg-surface-soft p-3 space-y-1.5">
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

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {loadingList ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-surface-soft animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-typography-muted space-y-1.5">
            <MessageSquare className="mx-auto h-6 w-6 opacity-50" />
            <p>No conversations with ORA yet.</p>
          </div>
        ) : (
          conversations.map((conv) => {
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
                  'group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs cursor-pointer transition-colors',
                  active
                    ? 'bg-brand-ice text-brand-royal font-semibold'
                    : 'text-typography-navy hover:bg-surface-soft'
                )}
              >
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  type="button"
                  onClick={(e) => void handleDeleteConversation(conv.id, e)}
                  aria-label="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-md p-1 text-typography-muted hover:text-functional-error transition-all"
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
    <div className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] flex -mx-4 -mt-6 -mb-28 sm:-mx-6 md:-mb-8 lg:-mx-8 overflow-hidden bg-surface-white">
      {/* Desktop History Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-surface-border bg-surface-white shrink-0">
        {historySidebarContent}
      </aside>

      {/* Mobile History Drawer */}
      {mobileHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/40 md:hidden"
          onClick={() => setMobileHistoryOpen(false)}
        >
          <aside
            className="w-72 max-w-[85vw] bg-surface-white h-full shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-typography-slate">
                History
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

      {/* Main AI Workspace */}
      <section className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface-soft">
        {/* Agent Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-surface-white border-b border-surface-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileHistoryOpen(true)}
              aria-label="Open conversation history"
              className="md:hidden rounded-xl border border-surface-border bg-surface-soft p-2 text-typography-navy"
            >
              <History className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-royal shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-typography-navy font-heading truncate">
                Ask ORA
              </h1>
              <p className="text-[11px] text-typography-slate truncate">
                Your intelligent companion inside Ideora.
              </p>
            </div>
          </div>

          {/* Optional Idea Context Selector */}
          {myIdeas.length > 0 && (
            <div className="flex items-center gap-2 max-w-full">
              <Lightbulb className="h-3.5 w-3.5 text-brand-royal shrink-0" />
              <CustomSelect
                value={selectedIdeaId}
                onChange={setSelectedIdeaId}
                disabled={Boolean(activeConversation)}
                placeholder="No idea attached"
                className="w-[200px] sm:w-[240px]"
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
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 space-y-4">
          {loadingThread ? (
            <div className="flex h-full items-center justify-center text-xs text-typography-muted gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-brand-royal" />
              <span>Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-2xl py-8 text-center space-y-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
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
                    className="rounded-2xl border border-surface-border bg-surface-white p-3.5 text-xs text-typography-navy hover:border-brand-royal hover:bg-brand-ice/30 transition-all leading-relaxed"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
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
                        'max-w-[92%] sm:max-w-[82%] rounded-2xl px-4 py-3',
                        isUser
                          ? 'bg-brand-royal text-white rounded-br-sm text-xs sm:text-sm'
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
                  </div>
                );
              })}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-typography-slate">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-royal" />
                  <span>ORA is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="px-4 py-3 sm:px-8 sm:py-4 bg-surface-white border-t border-surface-border shrink-0">
          <div className="mx-auto max-w-3xl space-y-2">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light px-3 py-2 text-xs text-functional-error"
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
              className="flex items-end gap-2 rounded-2xl border border-surface-border bg-surface-soft px-3.5 py-2 focus-within:border-brand-royal focus-within:bg-surface-white transition-all"
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
                rows={2}
                maxLength={4000}
                placeholder="Ask ORA about your idea, collaborators, or where to go in Ideora..."
                className="flex-1 bg-transparent text-sm text-typography-navy placeholder-typography-muted resize-none focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                aria-label="Send prompt"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-royal text-white hover:bg-brand-deep disabled:opacity-40 transition-colors shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

