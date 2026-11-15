import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  BarChart3,
  Users,
  Lightbulb,
  GitPullRequest,
} from 'lucide-react';
import {
  fetchAiConversations,
  fetchAiConversationDetail,
  deleteAiConversation,
  sendAiChatMessage,
  fetchAdminAiAnalyticsSnapshot,
  type AiConversation,
  type AiMessage,
  type AdminAiAnalyticsSnapshot,
} from '@/services/api';
import { AiMessageContent } from '@/components/ai/AiMessageContent';
import { cn } from '@/utils/cn';

const ADMIN_QUICK_PROMPTS = [
  "Why aren't users publishing ideas based on our current database figures?",
  'Give me a platform activation & collaboration conversion summary.',
  'What 3 product actions should we prioritize this week given these numbers?',
];

export const AdminAiConsolePage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<AdminAiAnalyticsSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConsole = useCallback(async () => {
    setLoadingSnapshot(true);
    setSnapshotError(null);
    const [snapRes, convRes] = await Promise.all([
      fetchAdminAiAnalyticsSnapshot(),
      fetchAiConversations('internal'),
    ]);
    setLoadingSnapshot(false);
    if (snapRes.error) {
      setSnapshotError(snapRes.error.message);
    } else {
      setSnapshot(snapRes.data);
    }
    if (convRes.data) {
      setConversations(convRes.data);
    }
  }, []);

  useEffect(() => {
    void loadConsole();
  }, [loadConsole]);

  const handleSelectConversation = async (conv: AiConversation) => {
    setChatError(null);
    setActiveConversation(conv);
    const res = await fetchAiConversationDetail('internal', conv.id);
    if (res.error) {
      setChatError(res.error.message);
      return;
    }
    setMessages(res.messages);
    requestAnimationFrame(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    );
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await deleteAiConversation('internal', id);
    if (error) {
      setChatError(error.message);
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
      setMessages([]);
    }
  };

  const handleSend = async (promptOverride?: string) => {
    const text = (promptOverride ?? inputText).trim();
    if (!text || sending) return;

    setSending(true);
    setChatError(null);

    const res = await sendAiChatMessage({
      scope: 'internal',
      agentId: 'analytics',
      message: text,
      conversationId: activeConversation?.id ?? null,
    });

    setSending(false);

    if (res.error || !res.data) {
      setChatError(res.error?.message || 'Analytics Agent request failed.');
      return;
    }

    if (!promptOverride) setInputText('');

    const { conversation, userMessage, assistantMessage } = res.data;
    setActiveConversation(conversation);
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setConversations((prev) => [
      conversation,
      ...prev.filter((c) => c.id !== conversation.id),
    ]);
    requestAnimationFrame(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-typography-navy font-heading">
            Operations AI Console
          </h2>
          <p className="text-xs text-typography-slate">
            Admin-only Analytics Agent backed by live PostgreSQL queries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadConsole()}
          disabled={loadingSnapshot}
          className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-3.5 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loadingSnapshot && 'animate-spin')} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Verified Database Metrics (Strictly separated from AI text) */}
      <section aria-label="Verified database metrics" className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-typography-muted">
          <BarChart3 className="h-3.5 w-3.5 text-brand-royal" />
          <span>Observed Database Metrics</span>
        </div>

        {snapshotError ? (
          <div className="rounded-2xl border border-functional-error/30 bg-functional-error-light p-4 text-xs text-functional-error">
            {snapshotError}
          </div>
        ) : loadingSnapshot || !snapshot ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-white border border-surface-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-surface-border bg-surface-white p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-typography-slate">
                <span>Users & Activation</span>
                <Users className="h-4 w-4 text-brand-royal" />
              </div>
              <p className="text-2xl font-semibold text-typography-navy tabular-nums">
                {snapshot.users.total}
              </p>
              <p className="text-[11px] text-typography-muted">
                {snapshot.users.users_without_any_idea} without any idea · {snapshot.users.new_last_7_days} new (7d)
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-white p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-typography-slate">
                <span>Published Ideas</span>
                <Lightbulb className="h-4 w-4 text-brand-royal" />
              </div>
              <p className="text-2xl font-semibold text-typography-navy tabular-nums">
                {snapshot.ideas.published}
              </p>
              <p className="text-[11px] text-typography-muted">
                {snapshot.ideas.drafts} drafts · {snapshot.ideas.ideas_with_zero_applications} with 0 requests
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-white p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-typography-slate">
                <span>Collaboration Requests</span>
                <GitPullRequest className="h-4 w-4 text-brand-royal" />
              </div>
              <p className="text-2xl font-semibold text-typography-navy tabular-nums">
                {snapshot.collaborations.total_requests}
              </p>
              <p className="text-[11px] text-typography-muted">
                {snapshot.collaborations.accepted} accepted · {snapshot.collaborations.pending} pending
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-white p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-typography-slate">
                <span>Engagement</span>
                <BarChart3 className="h-4 w-4 text-brand-royal" />
              </div>
              <p className="text-2xl font-semibold text-typography-navy tabular-nums">
                {snapshot.engagement.total_messages}
              </p>
              <p className="text-[11px] text-typography-muted">
                messages · {snapshot.engagement.total_upvotes} upvotes · {snapshot.engagement.open_feedback_items} open feedback
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Analytics Agent Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[480px]">
        {/* Internal Conversation History */}
        <aside className="rounded-2xl border border-surface-border bg-surface-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-surface-border">
            <button
              type="button"
              onClick={() => {
                setActiveConversation(null);
                setMessages([]);
                setChatError(null);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-royal px-3 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Analysis</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[380px]">
            {conversations.length === 0 ? (
              <p className="p-4 text-center text-xs text-typography-muted">
                No internal analyses yet.
              </p>
            ) : (
              conversations.map((conv) => (
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
                    'group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition-colors',
                    activeConversation?.id === conv.id
                      ? 'bg-brand-ice text-brand-royal font-semibold'
                      : 'text-typography-navy hover:bg-surface-soft'
                  )}
                >
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    type="button"
                    onClick={(e) => void handleDeleteConversation(conv.id, e)}
                    aria-label="Delete analysis"
                    className="opacity-0 group-hover:opacity-100 rounded p-1 text-typography-muted hover:text-functional-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Agent Chat & Recommendations */}
        <div className="lg:col-span-3 rounded-2xl border border-surface-border bg-surface-white flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-surface-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-typography-navy">
                Analytics Agent (Admin Only)
              </p>
              <p className="text-[11px] text-typography-muted">
                Interprets live database figures — never invents metrics
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-soft/50 min-h-[300px] max-h-[460px]">
            {messages.length === 0 ? (
              <div className="py-6 space-y-4">
                <p className="text-xs text-typography-slate text-center">
                  Ask the Analytics Agent to analyze bottlenecks or select a prompt below:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ADMIN_QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void handleSend(q)}
                      disabled={sending}
                      className="rounded-xl border border-surface-border bg-surface-white p-3 text-left text-xs text-typography-navy hover:border-brand-royal transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[90%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-brand-royal text-white text-xs sm:text-sm'
                        : 'bg-surface-white border border-surface-border shadow-2xs'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <AiMessageContent content={msg.content} />
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-typography-slate">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-royal" />
                <span>Querying verified metrics & generating analysis...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-surface-border bg-surface-white space-y-2">
            {chatError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light px-3 py-2 text-xs text-functional-error"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{chatError}</span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="flex items-end gap-2 rounded-xl border border-surface-border bg-surface-soft px-3 py-2 focus-within:border-brand-royal"
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
                placeholder="Ask the Analytics Agent about activation, ideas, or collaborations..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-typography-navy placeholder-typography-muted resize-none focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                aria-label="Run analytics query"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-royal text-white hover:bg-brand-deep disabled:opacity-40 shrink-0"
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
      </div>
    </div>
  );
};

