import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquareHeart, X, ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  recordFeedbackEngagement,
  respondToFeedbackPrompt,
  submitFeedback,
} from '@/services/api/feedback';
import type { FeedbackPromptState, FeedbackType } from '@/types';

const EXCLUDED_PATH_PREFIXES = [
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/admin',
  '/feedback',
  '/privacy',
  '/terms',
  '/ideas/new',
  '/messages',
];

const SESSION_THRESHOLD = 3;
const ACTIVE_SECONDS_THRESHOLD = 90;
const MEANINGFUL_ACTIONS_THRESHOLD = 1;
const INITIAL_GRACE_MS = 12000;

function isRouteEligible(pathname: string): boolean {
  return !EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isStateEligibleToPrompt(state: FeedbackPromptState | null): boolean {
  if (!state) return false;
  if (state.prompt_status === 'submitted' || state.submitted_at) return false;
  if (state.prompt_status === 'declined') return false;

  if (state.prompt_status === 'deferred') {
    if (!state.deferred_until) return false;
    if (new Date(state.deferred_until).getTime() > Date.now()) {
      return false;
    }
  }

  const meetsSessions = state.session_count >= SESSION_THRESHOLD;
  const meetsEngagement =
    state.active_seconds >= ACTIVE_SECONDS_THRESHOLD &&
    state.meaningful_actions_count >= MEANINGFUL_ACTIONS_THRESHOLD;

  return meetsSessions || meetsEngagement;
}

export const ContextualFeedbackPrompt: React.FC = () => {
  const { isAuthenticated, profile, loading } = useAuth();
  const location = useLocation();

  const [promptState, setPromptState] = useState<FeedbackPromptState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general_feedback');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const sessionRecordedForUserRef = useRef<string | null>(null);
  const lastIdeaSlugRecordedRef = useRef<string | null>(null);
  const dismissedInMemoryRef = useRef(false);
  const graceElapsedRef = useRef(false);

  // Evaluate whether to open the dialog without interrupting active workflows
  const evaluatePrompt = useCallback(
    (latestState: FeedbackPromptState | null) => {
      if (!latestState) return;
      setPromptState(latestState);

      if (
        dismissedInMemoryRef.current ||
        !graceElapsedRef.current ||
        !isRouteEligible(location.pathname)
      ) {
        return;
      }

      if (isStateEligibleToPrompt(latestState)) {
        setIsOpen(true);
      }
    },
    [location.pathname]
  );

  // Reset per-user refs on sign-out / account switch
  useEffect(() => {
    if (!isAuthenticated || !profile?.id) {
      sessionRecordedForUserRef.current = null;
      lastIdeaSlugRecordedRef.current = null;
      dismissedInMemoryRef.current = false;
      graceElapsedRef.current = false;
      setPromptState(null);
      setIsOpen(false);
      return;
    }

    const graceTimer = window.setTimeout(() => {
      graceElapsedRef.current = true;
      setPromptState((current) => {
        if (
          current &&
          !dismissedInMemoryRef.current &&
          isRouteEligible(location.pathname) &&
          isStateEligibleToPrompt(current)
        ) {
          setIsOpen(true);
        }
        return current;
      });
    }, INITIAL_GRACE_MS);

    return () => window.clearTimeout(graceTimer);
  }, [isAuthenticated, profile?.id, location.pathname]);

  // Record session_start once per authenticated user session
  useEffect(() => {
    if (loading || !isAuthenticated || !profile?.id) return;
    if (sessionRecordedForUserRef.current === profile.id) return;

    sessionRecordedForUserRef.current = profile.id;
    void recordFeedbackEngagement('session_start').then((state) => {
      if (state) evaluatePrompt(state);
    });
  }, [loading, isAuthenticated, profile?.id, evaluatePrompt]);

  // Record active browsing heartbeat every 30s while visible
  useEffect(() => {
    if (loading || !isAuthenticated || !profile?.id) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void recordFeedbackEngagement('heartbeat', 30).then((state) => {
        if (state) evaluatePrompt(state);
      });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loading, isAuthenticated, profile?.id, evaluatePrompt]);

  // Record viewing an idea detail page as a meaningful exploration action
  useEffect(() => {
    if (loading || !isAuthenticated || !profile?.id) return;
    if (
      location.pathname.startsWith('/ideas/') &&
      location.pathname !== '/ideas/new' &&
      lastIdeaSlugRecordedRef.current !== location.pathname
    ) {
      lastIdeaSlugRecordedRef.current = location.pathname;
      void recordFeedbackEngagement('meaningful_action', 0, 'view_idea').then(
        (state) => {
          if (state) evaluatePrompt(state);
        }
      );
    }
  }, [loading, isAuthenticated, profile?.id, location.pathname, evaluatePrompt]);

  // Close if user navigates onto an excluded route
  useEffect(() => {
    if (!isRouteEligible(location.pathname) && isOpen) {
      setIsOpen(false);
    }
  }, [location.pathname, isOpen]);

  const handleAction = async (
    decision: 'opened_feedback' | 'defer' | 'decline'
  ) => {
    if (submittingDecision) return;

    if (decision === 'opened_feedback') {
      setShowComposer(true);
      setSubmitError(null);
      void respondToFeedbackPrompt('opened_feedback').then((updated) => {
        if (updated) setPromptState(updated);
      });
      return;
    }

    setSubmittingDecision(true);
    dismissedInMemoryRef.current = true;
    setIsOpen(false);
    setShowComposer(false);

    const updated = await respondToFeedbackPrompt(decision);
    if (updated) {
      setPromptState(updated);
    }
    setSubmittingDecision(false);
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanDesc = feedbackDescription.trim();
    const cleanTitle =
      feedbackTitle.trim() ||
      (cleanDesc.length > 60 ? `${cleanDesc.slice(0, 57)}...` : cleanDesc);

    if (cleanTitle.length < 3 || cleanDesc.length < 5) {
      setSubmitError('Please share at least a few words of feedback.');
      return;
    }

    setSubmittingFeedback(true);
    const { error } = await submitFeedback({
      feedback_type: feedbackType,
      title: cleanTitle,
      description: cleanDesc,
      page_url: location.pathname,
    });
    setSubmittingFeedback(false);

    if (error) {
      setSubmitError(error.message || 'Unable to submit feedback right now.');
      return;
    }

    dismissedInMemoryRef.current = true;
    setSubmittedSuccess(true);
    setFeedbackTitle('');
    setFeedbackDescription('');
    setTimeout(() => {
      setIsOpen(false);
      setShowComposer(false);
      setSubmittedSuccess(false);
    }, 1800);
  };

  if (!isOpen || !isAuthenticated || !promptState) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-typography-navy/35 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-prompt-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-ice text-brand-royal shrink-0">
            {submittedSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-functional-success" />
            ) : (
              <MessageSquareHeart className="h-5 w-5" />
            )}
          </div>
          <button
            type="button"
            onClick={() => handleAction('defer')}
            disabled={submittingDecision || submittingFeedback}
            className="rounded-lg p-1.5 text-typography-muted hover:bg-surface-soft hover:text-typography-navy transition-colors"
            aria-label="Dismiss feedback prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="mt-4 space-y-2">
            <h2
              id="feedback-prompt-title"
              className="text-lg font-semibold text-typography-navy font-heading"
            >
              Thank you for your feedback!
            </h2>
            <p className="text-sm text-typography-slate leading-relaxed">
              We&rsquo;ve received your note and you can continue right where you left off.
            </p>
          </div>
        ) : showComposer ? (
          <form onSubmit={handleInlineSubmit} className="mt-4 space-y-3.5">
            <div>
              <h2
                id="feedback-prompt-title"
                className="text-lg font-semibold text-typography-navy font-heading"
              >
                Share Quick Feedback
              </h2>
              <p className="mt-1 text-xs text-typography-slate">
                Submit directly here without leaving this page.
              </p>
            </div>

            {submitError && (
              <div className="rounded-xl border border-functional-error/30 bg-functional-error-light/50 px-3 py-2 text-xs font-medium text-functional-error">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { value: 'general_feedback', label: 'General' },
                  { value: 'feature_request', label: 'Feature' },
                  { value: 'bug_report', label: 'Bug' },
                ] as { value: FeedbackType; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFeedbackType(opt.value)}
                  className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors ${
                    feedbackType === opt.value
                      ? 'border-brand-royal bg-brand-ice text-brand-royal'
                      : 'border-surface-border bg-surface-soft text-typography-slate hover:text-typography-navy'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={feedbackTitle}
              onChange={(e) => setFeedbackTitle(e.target.value)}
              placeholder="Short summary (optional)"
              maxLength={120}
              className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-xs text-typography-navy placeholder:text-typography-muted focus:border-brand-royal focus:bg-surface-white focus:outline-none"
            />

            <textarea
              rows={4}
              value={feedbackDescription}
              onChange={(e) => setFeedbackDescription(e.target.value)}
              placeholder="Tell us what's working well or what we should improve..."
              className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2.5 text-xs text-typography-navy placeholder:text-typography-muted focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              required
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <Link
                to="/feedback"
                onClick={() => {
                  dismissedInMemoryRef.current = true;
                  setIsOpen(false);
                }}
                className="text-[11px] font-medium text-brand-royal hover:underline"
              >
                Open Feedback Center
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAction('defer')}
                  disabled={submittingFeedback}
                  className="rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep transition-colors disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submittingFeedback ? 'Sending...' : 'Submit'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <h2
              id="feedback-prompt-title"
              className="mt-4 text-lg font-semibold text-typography-navy font-heading"
            >
              How&rsquo;s your experience with Ideora?
            </h2>
            <p className="mt-2 text-sm text-typography-slate leading-relaxed">
              We&rsquo;re building Ideora to help unfinished ideas find the right
              people. You&rsquo;ve had some time to explore the platform, and
              we&rsquo;d love to hear what you think. Your feedback helps us make
              Ideora better.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleAction('opened_feedback')}
                disabled={submittingDecision}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep transition-colors disabled:opacity-60"
              >
                <span>Share Feedback</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAction('defer')}
                disabled={submittingDecision}
                className="inline-flex items-center justify-center rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors disabled:opacity-60"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={() => handleAction('decline')}
                disabled={submittingDecision}
                className="inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-xs font-medium text-typography-muted hover:text-typography-navy transition-colors disabled:opacity-60"
              >
                Not Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

