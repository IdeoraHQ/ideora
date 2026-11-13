import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Bug,
  MessageSquarePlus,
  Send,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Clock,
  ShieldCheck,
  Loader2,
  FileImage,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomSelect } from '@/components/common';
import {
  submitFeedback,
  fetchMyFeedback,
  getFeedbackScreenshotSignedUrl,
} from '@/services/api/feedback';
import type {
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType,
  UserFeedbackItem,
} from '@/types';
import { cn } from '@/utils/cn';

const FEEDBACK_TYPES: Array<{
  value: FeedbackType;
  label: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    value: 'feature_request',
    label: 'Feature Request',
    subtitle: 'Propose a new capability or workflow improvement',
    icon: Sparkles,
  },
  {
    value: 'bug_report',
    label: 'Bug Report',
    subtitle: 'Report a technical issue, crash, or unexpected behavior',
    icon: Bug,
  },
  {
    value: 'general_feedback',
    label: 'General Feedback',
    subtitle: 'Share thoughts, UX suggestions, or impressions',
    icon: MessageSquarePlus,
  },
];

const STATUS_BADGE_MAP: Record<
  FeedbackStatus,
  { label: string; className: string }
> = {
  new: {
    label: 'New',
    className: 'bg-brand-ice text-brand-royal border-brand-royal/20',
  },
  reviewing: {
    label: 'Reviewing',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  planned: {
    label: 'Planned',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  declined: {
    label: 'Declined',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  feature_request: 'Feature Request',
  bug_report: 'Bug Report',
  general_feedback: 'General Feedback',
};

const GENERAL_CATEGORIES = [
  'UX & Navigation',
  'Idea Discovery',
  'Collaboration & Projects',
  'Messaging & Notifications',
  'Performance',
  'Other',
];

export const FeedbackPage: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

  const [feedbackType, setFeedbackType] =
    useState<FeedbackType>('feature_request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [benefitOrImpact, setBenefitOrImpact] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority | ''>('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<UserFeedbackItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [openingScreenshotId, setOpeningScreenshotId] = useState<string | null>(
    null
  );

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);
    const { data, error } = await fetchMyFeedback();
    if (error) {
      setHistoryError(error.message || 'Could not load your feedback history.');
    } else {
      setHistory(data);
    }
    setHistoryLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setBenefitOrImpact('');
    setPriority('');
    setStepsToReproduce('');
    setExpectedBehavior('');
    setActualBehavior('');
    setPageUrl('');
    setCategory('');
    setScreenshotFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setScreenshotFile(null);
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setSubmitError('Screenshot must be a PNG, JPEG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Screenshot file size must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    setSubmitError(null);
    setScreenshotFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || submitting) return;

    setSubmitError(null);
    setSubmitSuccess(null);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 180) {
      setSubmitError('Please enter a title between 3 and 180 characters.');
      return;
    }
    if (cleanDescription.length < 10 || cleanDescription.length > 4000) {
      setSubmitError(
        'Please enter a description or message between 10 and 4000 characters.'
      );
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);

    try {
      const { data, error } = await submitFeedback({
        feedback_type: feedbackType,
        title: cleanTitle,
        description: cleanDescription,
        benefit_or_impact:
          feedbackType === 'feature_request' ? benefitOrImpact : undefined,
        priority: feedbackType === 'feature_request' ? priority : undefined,
        steps_to_reproduce:
          feedbackType === 'bug_report' ? stepsToReproduce : undefined,
        expected_behavior:
          feedbackType === 'bug_report' ? expectedBehavior : undefined,
        actual_behavior:
          feedbackType === 'bug_report' ? actualBehavior : undefined,
        page_url: feedbackType === 'bug_report' ? pageUrl : undefined,
        category: feedbackType === 'general_feedback' ? category : undefined,
        screenshotFile:
          feedbackType === 'bug_report' ? screenshotFile : undefined,
      });

      if (error || !data) {
        throw error || new Error('Failed to submit feedback.');
      }

      setHistory((prev) => [data, ...prev]);
      resetForm();
      setSubmitSuccess(
        'Thank you! Your feedback has been recorded and added to your history below.'
      );
    } catch (err) {
      setSubmitError(
        (err as Error).message || 'Could not submit your feedback. Please try again.'
      );
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleViewScreenshot = async (item: UserFeedbackItem) => {
    if (!item.screenshot_path) return;
    setOpeningScreenshotId(item.id);
    const { url } = await getFeedbackScreenshotSignedUrl(item.screenshot_path);
    setOpeningScreenshotId(null);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl py-16 flex flex-col items-center justify-center text-typography-slate">
        <Loader2 className="h-7 w-7 animate-spin text-brand-royal mb-3" />
        <p className="text-sm font-medium">Loading Feedback Center...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-light text-typography-navy font-heading">
            Sign in to share feedback
          </h1>
          <p className="mt-2 text-sm text-typography-slate">
            Your feedback is linked to your IDEORA account so you can track its
            status and read responses from our team.
          </p>
          <Link
            to="/auth"
            state={{ from: location.pathname }}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-royal px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep transition-colors"
          >
            Sign In / Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header Banner */}
      <section className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal">
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Feedback Center
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-light tracking-tight text-typography-navy font-heading">
          Help shape the future of IDEORA
        </h1>
        <p className="mt-1.5 text-sm text-typography-slate max-w-2xl leading-relaxed">
          Request new features, report bugs, or share suggestions. Every submission
          is reviewed by the IDEORA team and tracked in your personal feedback
          history below.
        </p>
      </section>

      {/* Submission Form */}
      <section className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-base font-semibold text-typography-navy font-heading">
          1. Choose Feedback Type
        </h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FEEDBACK_TYPES.map((typeOption) => {
            const Icon = typeOption.icon;
            const active = feedbackType === typeOption.value;
            return (
              <button
                key={typeOption.value}
                type="button"
                onClick={() => {
                  setFeedbackType(typeOption.value);
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  active
                    ? 'border-brand-royal bg-brand-ice/60 shadow-sm'
                    : 'border-surface-border bg-surface-soft hover:border-brand-light'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      active ? 'text-brand-royal' : 'text-typography-slate'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      active ? 'text-brand-royal' : 'text-typography-navy'
                    )}
                  >
                    {typeOption.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-typography-slate leading-relaxed">
                  {typeOption.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {submitError && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-functional-error/30 bg-functional-error-light p-3.5 text-xs font-semibold text-functional-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{submitSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-typography-navy mb-1.5">
              {feedbackType === 'feature_request'
                ? 'Feature Title *'
                : feedbackType === 'bug_report'
                  ? 'Short Bug Summary *'
                  : 'Feedback Title *'}
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={180}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                feedbackType === 'feature_request'
                  ? 'e.g., Filter ideas by equity / co-founder availability'
                  : feedbackType === 'bug_report'
                    ? 'e.g., Collaboration request modal does not close on submit'
                    : 'e.g., Thoughts on the onboarding experience'
              }
              className="w-full rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
            />
          </div>

          {/* Description / Message */}
          <div>
            <label className="block text-xs font-bold text-typography-navy mb-1.5">
              {feedbackType === 'feature_request'
                ? 'Problem or Need Description *'
                : feedbackType === 'bug_report'
                  ? 'Detailed Description *'
                  : 'Your Message *'}
            </label>
            <textarea
              required
              minLength={10}
              maxLength={4000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                feedbackType === 'feature_request'
                  ? 'Describe the challenge or workflow gap you ran into...'
                  : feedbackType === 'bug_report'
                    ? 'Describe what went wrong and any error message you saw...'
                    : 'Share what is working well or what we can improve...'
              }
              className="w-full rounded-xl border border-surface-border bg-surface-soft p-3.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
            />
          </div>

          {/* Feature Request specific fields */}
          {feedbackType === 'feature_request' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-typography-navy mb-1.5">
                  How would this feature help? (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={benefitOrImpact}
                  onChange={(e) => setBenefitOrImpact(e.target.value)}
                  placeholder="How would this improve your workflow on IDEORA?"
                  className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-typography-navy mb-1.5">
                  Priority (Optional)
                </label>
                <CustomSelect
                  value={priority}
                  onChange={(val) => setPriority(val as FeedbackPriority | '')}
                  placeholder="Select priority"
                  triggerClassName="bg-surface-soft px-3.5 py-2.5 text-sm"
                  options={[
                    { label: 'No priority selected', value: '' },
                    { label: 'Low — Nice to have', value: 'low' },
                    { label: 'Medium — Helpful', value: 'medium' },
                    { label: 'High — Important', value: 'high' },
                    { label: 'Critical — Blocking', value: 'critical' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Bug Report specific fields */}
          {feedbackType === 'bug_report' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-typography-navy mb-1.5">
                  Steps to Reproduce
                </label>
                <textarea
                  rows={3}
                  maxLength={3000}
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  placeholder={'1. Go to...\n2. Click on...\n3. Observe error...'}
                  className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Expected Behaviour
                  </label>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    placeholder="What should have happened?"
                    className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Actual Behaviour
                  </label>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={actualBehavior}
                    onChange={(e) => setActualBehavior(e.target.value)}
                    placeholder="What actually happened?"
                    className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Page or Feature Where It Occurred
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    value={pageUrl}
                    onChange={(e) => setPageUrl(e.target.value)}
                    placeholder="e.g., /explore or Project Workspace"
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Screenshot Attachment (Optional, private, max 5 MB)
                  </label>
                  {screenshotFile ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-royal/30 bg-brand-ice/50 px-3.5 py-2 text-xs text-typography-navy">
                      <span className="inline-flex items-center gap-2 truncate font-medium">
                        <FileImage className="h-4 w-4 text-brand-royal shrink-0" />
                        <span className="truncate">{screenshotFile.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setScreenshotFile(null)}
                        className="rounded-lg p-1 text-typography-slate hover:bg-white hover:text-functional-error"
                        aria-label="Remove screenshot"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border bg-surface-soft px-4 py-2.5 text-xs font-semibold text-typography-slate hover:border-brand-royal hover:text-brand-royal transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Upload PNG, JPG, or WebP</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* General Feedback specific field */}
          {feedbackType === 'general_feedback' && (
            <div className="max-w-sm">
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                Category (Optional)
              </label>
              <CustomSelect
                value={category}
                onChange={setCategory}
                placeholder="Select a category"
                triggerClassName="bg-surface-soft px-3.5 py-2.5 text-sm"
                options={[
                  { label: 'No category selected', value: '' },
                  ...GENERAL_CATEGORIES.map((cat) => ({
                    label: cat,
                    value: cat,
                  })),
                ]}
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep transition-colors disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* User Feedback History */}
      <section className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-typography-navy font-heading">
              Your Feedback History
            </h2>
            <p className="text-xs text-typography-slate mt-0.5">
              Track the status of your submissions and view official responses.
            </p>
          </div>
          <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-typography-slate border border-surface-border">
            {history.length} {history.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {historyLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-typography-slate">
            <Loader2 className="h-4 w-4 animate-spin text-brand-royal" />
            <span>Loading your submissions...</span>
          </div>
        ) : historyError ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-3.5 text-xs font-semibold text-functional-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{historyError}</span>
          </div>
        ) : history.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-surface-border bg-surface-soft p-8 text-center">
            <p className="text-sm font-medium text-typography-navy">
              You haven&rsquo;t submitted any feedback yet.
            </p>
            <p className="mt-1 text-xs text-typography-slate">
              Use the form above to share a feature request, bug report, or
              suggestion.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {history.map((item) => {
              const statusMeta = STATUS_BADGE_MAP[item.status];
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-surface-border bg-surface-soft/70 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-typography-navy border border-surface-border">
                          {TYPE_LABELS[item.feedback_type]}
                        </span>
                        {item.priority && (
                          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-typography-slate border border-surface-border capitalize">
                            Priority: {item.priority}
                          </span>
                        )}
                        {item.category && (
                          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-typography-slate border border-surface-border">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-typography-navy">
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          statusMeta.className
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-typography-slate leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>

                  {item.screenshot_path && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleViewScreenshot(item)}
                        disabled={openingScreenshotId === item.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-royal hover:underline disabled:opacity-60"
                      >
                        <FileImage className="h-3.5 w-3.5" />
                        {openingScreenshotId === item.id
                          ? 'Opening attachment...'
                          : 'View attached screenshot'}
                      </button>
                    </div>
                  )}

                  {item.admin_response && (
                    <div className="mt-3 rounded-xl border border-brand-royal/20 bg-brand-ice/50 p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-royal">
                        IDEORA Team Response
                      </p>
                      <p className="mt-1 text-xs text-typography-navy leading-relaxed whitespace-pre-line">
                        {item.admin_response}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-typography-muted">
                    <Clock className="h-3 w-3" />
                    <span>
                      Submitted {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

