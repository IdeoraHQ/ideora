import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Flag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  fetchAdminReports,
  adminResolveReport,
} from '@/services/api/admin';
import { CustomSelect } from '@/components/common';
import type { Report, ReportStatus, ReportTargetType } from '@/types';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Investigating', value: 'investigating' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' },
];

const TARGET_OPTIONS = [
  { label: 'All Target Types', value: 'all' },
  { label: 'Idea', value: 'idea' },
  { label: 'Comment', value: 'comment' },
  { label: 'Profile', value: 'profile' },
  { label: 'Project', value: 'project' },
];

const STATUS_BADGE: Record<ReportStatus, string> = {
  open: 'bg-rose-50 text-rose-700 border-rose-200',
  investigating: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dismissed: 'bg-surface-light text-typography-slate border-surface-border',
};

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [targetFilter, setTargetFilter] = useState<ReportTargetType | 'all'>('all');
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState<ReportStatus>('investigating');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchAdminReports({
      status: statusFilter,
      targetType: targetFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });

    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load reports.');
      setLoading(false);
      return;
    }

    setReports(data);
    setSelectedId((prev) => {
      if (prev && data.some((r) => r.id === prev)) return prev;
      return data[0]?.id ?? null;
    });
    setLoading(false);
  }, [statusFilter, targetFilter, page]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedReport) return;
    setNewStatus(
      selectedReport.status === 'open' ? 'investigating' : selectedReport.status
    );
    setResolutionNotes(selectedReport.resolution_notes ?? '');
    setConfirmOpen(false);
    setActionMsg(null);
    setActionErr(null);
  }, [selectedReport]);

  const handleResolve = async () => {
    if (!selectedReport || saving) return;
    setSaving(true);
    setActionErr(null);
    setActionMsg(null);

    const { error: err } = await adminResolveReport({
      reportId: selectedReport.id,
      newStatus,
      resolutionNotes,
    });

    setSaving(false);
    setConfirmOpen(false);
    if (err) {
      setActionErr(err.message || 'Failed to update report.');
      return;
    }

    setActionMsg(`Report marked as "${newStatus}".`);
    await loadReports();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-typography-navy font-heading tracking-tight">
            Reports Management
          </h1>
          <p className="text-xs text-typography-slate mt-0.5">
            Investigate user-submitted complaints and record moderation resolutions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReports()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-soft transition-colors disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="min-w-[200px]">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => {
              setPage(0);
              setStatusFilter(val as ReportStatus | 'all');
            }}
            options={STATUS_OPTIONS}
            triggerClassName="bg-surface-soft"
          />
        </div>
        <div className="min-w-[200px]">
          <CustomSelect
            value={targetFilter}
            onChange={(val) => {
              setPage(0);
              setTargetFilter(val as ReportTargetType | 'all');
            }}
            options={TARGET_OPTIONS}
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
          <span>Loading reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-white p-12 text-center">
          <p className="text-sm font-semibold text-typography-navy">
            No reports match the selected filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-2.5">
            {reports.map((rep) => {
              const active = rep.id === selectedId;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedId(rep.id)}
                  className={cn(
                    'w-full text-left rounded-2xl border p-4 transition-all',
                    active
                      ? 'border-brand-royal bg-brand-ice/40 shadow-sm'
                      : 'border-surface-border bg-surface-white hover:border-brand-light'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-typography-slate uppercase">
                      {rep.target_type}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                        STATUS_BADGE[rep.status]
                      )}
                    >
                      {rep.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-typography-navy line-clamp-1">
                    {rep.reason}
                  </p>
                  <p className="mt-1 text-[11px] text-typography-muted">
                    Reported by @{rep.reporter?.username ?? 'unknown'} &bull;{' '}
                    {new Date(rep.created_at).toLocaleDateString()}
                  </p>
                </button>
              );
            })}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-semibold text-typography-navy disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="text-xs text-typography-muted">
                Page {page + 1}
              </span>
              <button
                type="button"
                disabled={reports.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-semibold text-typography-navy disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {selectedReport && (
            <div className="lg:col-span-7 rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm space-y-5">
              <div className="border-b border-surface-border pb-4">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-soft px-2.5 py-0.5 text-[11px] font-semibold text-typography-navy border border-surface-border uppercase">
                  <Flag className="h-3 w-3 text-rose-600" />
                  {selectedReport.target_type}
                </span>
                <h2 className="mt-2 text-lg font-semibold text-typography-navy font-heading">
                  {selectedReport.reason}
                </h2>
                <p className="mt-1 text-xs text-typography-muted">
                  Target ID: {selectedReport.target_id} &bull; Reporter: @
                  {selectedReport.reporter?.username ?? 'unknown'}
                </p>
              </div>

              {selectedReport.details && (
                <div className="text-xs text-typography-slate">
                  <p className="font-semibold text-typography-navy mb-1">
                    Reporter Details
                  </p>
                  <p className="rounded-xl bg-surface-soft p-3 border border-surface-border whitespace-pre-line">
                    {selectedReport.details}
                  </p>
                </div>
              )}

              {actionErr && (
                <div className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-3 text-xs font-semibold text-functional-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionErr}</span>
                </div>
              )}
              {actionMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{actionMsg}</span>
                </div>
              )}

              <div className="border-t border-surface-border pt-4 space-y-3">
                <div className="max-w-xs">
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Update Report Status
                  </label>
                  <CustomSelect
                    value={newStatus}
                    onChange={(val) => setNewStatus(val as ReportStatus)}
                    options={STATUS_OPTIONS.filter(
                      (o) => o.value !== 'all' && o.value !== 'open'
                    )}
                    triggerClassName="bg-surface-soft"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Resolution Notes
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Document investigation findings and action taken..."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                  />
                </div>

                {confirmOpen ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={saving}
                      className="rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                    >
                      {saving
                        ? 'Saving...'
                        : `Confirm Status: ${newStatus}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(false)}
                      className="rounded-xl border border-surface-border bg-surface-white px-3 py-2 text-xs font-semibold text-typography-slate"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep"
                  >
                    Update Report
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

