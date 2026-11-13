import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquareHeart, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  recordFeedbackEngagement,
  respondToFeedbackPrompt,
} from '@/services/api/feedback';
import type { FeedbackPromptState } from '@/types';

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
  const navigate = useNavigate();

  const [promptState, setPromptState] = useState<FeedbackPromptState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

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
    setSubmittingDecision(true);
    dismissedInMemoryRef.current = true;
    setIsOpen(false);

    const updated = await respondToFeedbackPrompt(decision);
    if (updated) {
      setPromptState(updated);
    }
    setSubmittingDecision(false);

    if (decision === 'opened_feedback') {
      navigate('/feedback');
    }
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
            <MessageSquareHeart className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={() => handleAction('defer')}
            disabled={submittingDecision}
            className="rounded-lg p-1.5 text-typography-muted hover:bg-surface-soft hover:text-typography-navy transition-colors"
            aria-label="Dismiss feedback prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

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
      </div>
    </div>
  );
};

