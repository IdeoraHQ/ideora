import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  fetchAdminIdeas,
  fetchIdeaModerationHistory,
  adminModerateIdea,
  type AdminIdeaItem,
} from '@/services/api/admin';
import { CustomSelect } from '@/components/common';
import type { IdeaModerationHistoryItem, IdeaModerationStatus } from '@/types';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 20;

const MOD_STATUS_OPTIONS = [
  { label: 'All Moderation States', value: 'all' },
  { label: 'Approved', value: 'approved' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Removed', value: 'removed' },
];

const MOD_BADGE: Record<IdeaModerationStatus, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  removed: 'bg-slate-200 text-slate-700 border-slate-300',
};

export const AdminIdeasPage: React.FC = () => {
  const [ideas, setIdeas] = useState<AdminIdeaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<IdeaModerationHistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [modFilter, setModFilter] = useState<IdeaModerationStatus | 'all'>('all');
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newModStatus, setNewModStatus] = useState<IdeaModerationStatus>('approved');
  const [modReason, setModReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchAdminIdeas({
      search,
      moderationStatus: modFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });

    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load ideas.');
      setLoading(false);
      return;
    }

    setIdeas(data);
    setSelectedId((prev) => {
      if (prev && data.some((i) => i.id === prev)) return prev;
      return data[0]?.id ?? null;
    });
    setLoading(false);
  }, [search, modFilter, page]);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  const selectedIdea = ideas.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedIdea) {
      setHistory([]);
      return;
    }
    setNewModStatus(selectedIdea.moderation_status);
    setModReason(selectedIdea.moderation_reason ?? '');
    setConfirmOpen(false);
    setActionMsg(null);
    setActionErr(null);

    void fetchIdeaModerationHistory(selectedIdea.id).then(({ data }) => {
      setHistory(data);
    });
  }, [selectedIdea]);

  const handleModerate = async () => {
    if (!selectedIdea || saving) return;
    setSaving(true);
    setActionErr(null);
    setActionMsg(null);

    const { error: err } = await adminModerateIdea({
      ideaId: selectedIdea.id,
      moderationStatus: newModStatus,
      reason: modReason,
    });

    setSaving(false);
    setConfirmOpen(false);
    if (err) {
      setActionErr(err.message || 'Failed to moderate idea.');
      return;
    }

    setActionMsg(`Idea moderation status updated to "${newModStatus}".`);
    await loadIdeas();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-typography-navy font-heading tracking-tight">
            Idea Moderation
          </h1>
          <p className="text-xs text-typography-slate mt-0.5">
            Review submitted ideas, inspect moderation history, and approve, reject, or remove content.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadIdeas()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-soft transition-colors disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            placeholder="Search ideas by title or summary..."
            className="w-full rounded-xl border border-surface-border bg-surface-soft py-2 pl-9 pr-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
          />
        </div>
        <CustomSelect
          value={modFilter}
          onChange={(val) => {
            setPage(0);
            setModFilter(val as IdeaModerationStatus | 'all');
          }}
          options={MOD_STATUS_OPTIONS}
          triggerClassName="bg-surface-soft"
        />
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
          <span>Loading ideas...</span>
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-white p-12 text-center">
          <p className="text-sm font-semibold text-typography-navy">
            No ideas match the selected filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Ideas List */}
          <div className="lg:col-span-5 space-y-2.5">
            {ideas.map((idea) => {
              const active = idea.id === selectedId;
              return (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() => setSelectedId(idea.id)}
                  className={cn(
                    'w-full text-left rounded-2xl border p-4 transition-all',
                    active
                      ? 'border-brand-royal bg-brand-ice/40 shadow-sm'
                      : 'border-surface-border bg-surface-white hover:border-brand-light'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-typography-muted">
                      {idea.category} &bull; {idea.status.replace('_', ' ')}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                        MOD_BADGE[idea.moderation_status]
                      )}
                    >
                      {idea.moderation_status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-typography-navy line-clamp-1">
                    {idea.title}
                  </p>
                  <p className="mt-1 text-xs text-typography-slate line-clamp-2">
                    {idea.summary}
                  </p>
                  <p className="mt-2 text-[11px] text-typography-muted">
                    by @{idea.creator?.username ?? 'unknown'} &bull;{' '}
                    {new Date(idea.created_at).toLocaleDateString()}
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
                disabled={ideas.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-semibold text-typography-navy disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Idea Detail & Moderation */}
          {selectedIdea && (
            <div className="lg:col-span-7 rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm space-y-5">
              <div className="border-b border-surface-border pb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-typography-navy font-heading">
                    {selectedIdea.title}
                  </h2>
                  <p className="text-xs text-typography-muted mt-0.5">
                    Creator: @{selectedIdea.creator?.username ?? 'unknown'} &bull;{' '}
                    {selectedIdea.upvotes_count} upvotes &bull;{' '}
                    {selectedIdea.collaborators_count} collaborators
                  </p>
                </div>
                <Link
                  to={`/ideas/${selectedIdea.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-semibold text-brand-royal hover:bg-brand-ice/50 shrink-0"
                >
                  <span>View</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-2 text-xs text-typography-slate">
                <p className="font-semibold text-typography-navy">Summary</p>
                <p className="leading-relaxed">{selectedIdea.summary}</p>
                <p className="font-semibold text-typography-navy pt-2">
                  Full Description
                </p>
                <p className="whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto rounded-xl bg-surface-soft p-3 border border-surface-border">
                  {selectedIdea.description}
                </p>
              </div>

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
                <h3 className="text-xs font-bold text-typography-navy uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-royal" />
                  Moderation Action
                </h3>
                <div className="max-w-xs">
                  <CustomSelect
                    value={newModStatus}
                    onChange={(val) =>
                      setNewModStatus(val as IdeaModerationStatus)
                    }
                    options={MOD_STATUS_OPTIONS.filter((o) => o.value !== 'all')}
                    triggerClassName="bg-surface-soft"
                  />
                </div>
                <textarea
                  rows={2}
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  placeholder="Moderation reason (recorded in moderation history & audit log)..."
                  className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-white focus:outline-none"
                />
                {confirmOpen ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleModerate}
                      disabled={saving}
                      className="rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                    >
                      {saving
                        ? 'Saving...'
                        : `Confirm Decision: ${newModStatus.replace('_', ' ')}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(false)}
                      className="rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-typography-slate"
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
                    Apply Moderation Decision
                  </button>
                )}
              </div>

              {history.length > 0 && (
                <div className="border-t border-surface-border pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-typography-navy uppercase tracking-wider">
                    Moderation History
                  </h4>
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-xl bg-surface-soft p-3 text-[11px] text-typography-slate border border-surface-border"
                      >
                        <p className="font-semibold text-typography-navy">
                          {h.previous_status} &rarr; {h.new_status} by @
                          {h.admin?.username ?? 'admin'}
                        </p>
                        {h.reason && <p className="mt-0.5">{h.reason}</p>}
                        <p className="mt-0.5 text-typography-muted">
                          {new Date(h.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

