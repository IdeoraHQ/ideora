import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageSquarePlus,
  Bug,
  Sparkles,
  CheckCircle2,
  Inbox,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileImage,
  Save,
} from 'lucide-react';
import {
  fetchAdminFeedbackSummary,
  fetchAdminFeedbackList,
  adminUpdateFeedback,
  getFeedbackScreenshotSignedUrl,
} from '@/services/api/feedback';
import { CustomSelect } from '@/components/common';
import type {
  AdminFeedbackItem,
  AdminFeedbackSummary,
  FeedbackStatus,
  FeedbackType,
} from '@/types';
import { cn } from '@/utils/cn';

const TYPE_OPTIONS: Array<{ value: FeedbackType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'feature_request', label: 'Feature Requests' },
  { value: 'bug_report', label: 'Bug Reports' },
  { value: 'general_feedback', label: 'General Feedback' },
];

const STATUS_OPTIONS: Array<{ value: FeedbackStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

const STATUS_STYLE: Record<FeedbackStatus, string> = {
  new: 'bg-brand-ice text-brand-royal border-brand-royal/20',
  reviewing: 'bg-amber-50 text-amber-700 border-amber-200',
  planned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-surface-light text-typography-slate border-surface-border',
};

export const AdminFeedbackPage: React.FC = () => {
  const [summary, setSummary] = useState<AdminFeedbackSummary | null>(null);
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state for currently selected item
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('new');
  const [editResponse, setEditResponse] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openingScreenshot, setOpeningScreenshot] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [summaryRes, listRes] = await Promise.all([
      fetchAdminFeedbackSummary(),
      fetchAdminFeedbackList({
        feedbackType: typeFilter,
        status: statusFilter,
        limit: 50,
      }),
    ]);

    if (summaryRes.error) {
      setError(summaryRes.error.message || 'Failed to load feedback summary.');
      setLoading(false);
      return;
    }

    if (listRes.error) {
      setError(listRes.error.message || 'Failed to load feedback submissions.');
      setLoading(false);
      return;
    }

    setSummary(summaryRes.data);
    setItems(listRes.data);
    setSelectedId((prev) => {
      if (prev && listRes.data.some((item) => item.id === prev)) return prev;
      return listRes.data[0]?.id ?? null;
    });
    setLoading(false);
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedItem) return;
    setEditStatus(selectedItem.status);
    setEditResponse(selectedItem.admin_response ?? '');
    setEditInternalNotes(selectedItem.internal_notes ?? '');
    setSaveMessage(null);
    setSaveError(null);
  }, [selectedItem]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || saving) return;

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    const { data, error: updateErr } = await adminUpdateFeedback({
      feedbackId: selectedItem.id,
      status: editStatus,
      adminResponse: editResponse,
      internalNotes: editInternalNotes,
    });

    setSaving(false);

    if (updateErr || !data) {
      setSaveError(updateErr?.message || 'Failed to update feedback.');
      return;
    }

    setSaveMessage('Feedback updated and logged to admin audit trail.');
    await loadData();
  };

  const handleViewScreenshot = async (path: string) => {
    setOpeningScreenshot(true);
    const { url } = await getFeedbackScreenshotSignedUrl(path);
    setOpeningScreenshot(false);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-typography-navy font-heading tracking-tight">
            Feedback Management
          </h1>
          <p className="text-xs text-typography-slate mt-0.5">
            Review feature requests, bug reports, and user suggestions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-soft transition-colors disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: 'Total Submissions',
              value: summary.total_submissions,
              icon: Inbox,
              accent: 'text-brand-royal bg-brand-ice',
            },
            {
              label: 'New Submissions',
              value: summary.new_submissions,
              icon: MessageSquarePlus,
              accent: 'text-amber-700 bg-amber-50',
            },
            {
              label: 'Bug Reports',
              value: summary.bug_reports,
              icon: Bug,
              accent: 'text-rose-700 bg-rose-50',
            },
            {
              label: 'Feature Requests',
              value: summary.feature_requests,
              icon: Sparkles,
              accent: 'text-indigo-700 bg-indigo-50',
            },
            {
              label: 'Completed',
              value: summary.completed_submissions,
              icon: CheckCircle2,
              accent: 'text-emerald-700 bg-emerald-50',
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-typography-slate">
                    {stat.label}
                  </span>
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg',
                      stat.accent
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-typography-navy font-heading">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 min-w-[200px]">
          <label className="text-xs font-semibold text-typography-navy shrink-0">
            Type:
          </label>
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val as FeedbackType | 'all')}
            options={TYPE_OPTIONS}
            triggerClassName="bg-surface-soft"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[200px]">
          <label className="text-xs font-semibold text-typography-navy shrink-0">
            Status:
          </label>
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as FeedbackStatus | 'all')}
            options={STATUS_OPTIONS}
            triggerClassName="bg-surface-soft"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-4 text-xs font-semibold text-functional-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-surface-border bg-surface-white p-12 flex items-center justify-center gap-2 text-sm text-typography-slate">
          <Loader2 className="h-5 w-5 animate-spin text-brand-royal" />
          <span>Loading feedback submissions...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-white p-12 text-center">
          <p className="text-sm font-semibold text-typography-navy">
            No feedback submissions match the selected filters.
          </p>
          <p className="mt-1 text-xs text-typography-slate">
            Try clearing the type or status filter to view all items.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Submission List */}
          <div className="lg:col-span-5 space-y-2.5">
            {items.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'w-full text-left rounded-2xl border p-4 transition-all',
                    active
                      ? 'border-brand-royal bg-brand-ice/40 shadow-sm'
                      : 'border-surface-border bg-surface-white hover:border-brand-light'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-typography-slate capitalize">
                      {item.feedback_type.replace('_', ' ')}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                        STATUS_STYLE[item.status]
                      )}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-typography-navy line-clamp-1">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-typography-slate line-clamp-2">
                    {item.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-typography-muted">
                    <span>@{item.submitter_username}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail & Moderation Panel */}
          {selectedItem && (
            <div className="lg:col-span-7 rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm space-y-5">
              <div className="border-b border-surface-border pb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-surface-soft px-2.5 py-0.5 font-semibold text-typography-navy border border-surface-border capitalize">
                    {selectedItem.feedback_type.replace('_', ' ')}
                  </span>
                  {selectedItem.priority && (
                    <span className="rounded-md bg-surface-soft px-2.5 py-0.5 font-medium text-typography-slate border border-surface-border capitalize">
                      Priority: {selectedItem.priority}
                    </span>
                  )}
                  {selectedItem.category && (
                    <span className="rounded-md bg-surface-soft px-2.5 py-0.5 font-medium text-typography-slate border border-surface-border">
                      {selectedItem.category}
                    </span>
                  )}
                </div>
                <h2 className="mt-2.5 text-lg font-semibold text-typography-navy font-heading">
                  {selectedItem.title}
                </h2>
                <p className="mt-1 text-xs text-typography-muted">
                  Submitted by{' '}
                  <strong className="text-typography-navy">
                    {selectedItem.submitter_full_name}
                  </strong>{' '}
                  (@{selectedItem.submitter_username} &bull;{' '}
                  {selectedItem.submitter_role}) on{' '}
                  {new Date(selectedItem.created_at).toLocaleString()}
                </p>
              </div>

              <div className="space-y-3 text-xs text-typography-slate">
                <div>
                  <h3 className="font-bold text-typography-navy uppercase tracking-wider text-[11px]">
                    Description
                  </h3>
                  <p className="mt-1 whitespace-pre-line leading-relaxed">
                    {selectedItem.description}
                  </p>
                </div>

                {selectedItem.benefit_or_impact && (
                  <div>
                    <h3 className="font-bold text-typography-navy uppercase tracking-wider text-[11px]">
                      Benefit / Impact
                    </h3>
                    <p className="mt-1 whitespace-pre-line leading-relaxed">
                      {selectedItem.benefit_or_impact}
                    </p>
                  </div>
                )}

                {selectedItem.steps_to_reproduce && (
                  <div>
                    <h3 className="font-bold text-typography-navy uppercase tracking-wider text-[11px]">
                      Steps to Reproduce
                    </h3>
                    <p className="mt-1 whitespace-pre-line leading-relaxed">
                      {selectedItem.steps_to_reproduce}
                    </p>
                  </div>
                )}

                {(selectedItem.expected_behavior ||
                  selectedItem.actual_behavior) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedItem.expected_behavior && (
                      <div className="rounded-xl bg-surface-soft p-3 border border-surface-border">
                        <h4 className="font-bold text-typography-navy text-[11px]">
                          Expected
                        </h4>
                        <p className="mt-1 whitespace-pre-line">
                          {selectedItem.expected_behavior}
                        </p>
                      </div>
                    )}
                    {selectedItem.actual_behavior && (
                      <div className="rounded-xl bg-surface-soft p-3 border border-surface-border">
                        <h4 className="font-bold text-typography-navy text-[11px]">
                          Actual
                        </h4>
                        <p className="mt-1 whitespace-pre-line">
                          {selectedItem.actual_behavior}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedItem.page_url && (
                  <p>
                    <strong className="text-typography-navy">Page / Feature:</strong>{' '}
                    {selectedItem.page_url}
                  </p>
                )}

                {selectedItem.screenshot_path && (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        void handleViewScreenshot(selectedItem.screenshot_path!)
                      }
                      disabled={openingScreenshot}
                      className="inline-flex items-center gap-1.5 font-semibold text-brand-royal hover:underline disabled:opacity-60"
                    >
                      <FileImage className="h-3.5 w-3.5" />
                      {openingScreenshot
                        ? 'Generating signed link...'
                        : 'Open attached screenshot (private signed URL)'}
                    </button>
                  </div>
                )}
              </div>

              {/* Admin Update Form */}
              <form
                onSubmit={handleSave}
                className="border-t border-surface-border pt-4 space-y-4"
              >
                <div className="w-full sm:w-64">
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Status
                  </label>
                  <CustomSelect
                    value={editStatus}
                    onChange={(val) => setEditStatus(val as FeedbackStatus)}
                    options={STATUS_OPTIONS.filter((o) => o.value !== 'all')}
                    triggerClassName="bg-surface-soft"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Public Response (Visible to the submitting user)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={3000}
                    value={editResponse}
                    onChange={(e) => setEditResponse(e.target.value)}
                    placeholder="Write a helpful update or response for the user..."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Internal Admin Notes (Private — never shown to users)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={3000}
                    value={editInternalNotes}
                    onChange={(e) => setEditInternalNotes(e.target.value)}
                    placeholder="Internal triage notes..."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>

                {saveError && (
                  <p className="text-xs font-semibold text-functional-error">
                    {saveError}
                  </p>
                )}
                {saveMessage && (
                  <p className="text-xs font-semibold text-emerald-700">
                    {saveMessage}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save Update</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

