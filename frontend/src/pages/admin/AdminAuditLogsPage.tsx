import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  ScrollText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchAdminAuditLogs } from '@/services/api/admin';
import { CustomSelect } from '@/components/common';
import type { AdminAuditLog } from '@/types';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 25;

const ACTOR_OPTIONS = [
  { label: 'All Actors', value: 'all' },
  { label: 'Admin Actions', value: 'admin' },
  { label: 'System Actions', value: 'system' },
];

const TARGET_OPTIONS = [
  { label: 'All Targets', value: 'all' },
  { label: 'Profile', value: 'profile' },
  { label: 'Idea', value: 'idea' },
  { label: 'Report', value: 'report' },
  { label: 'Feedback', value: 'feedback' },
  { label: 'Platform Setting', value: 'platform_setting' },
];

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [actorFilter, setActorFilter] = useState<'all' | 'admin' | 'system'>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchAdminAuditLogs({
      actorType: actorFilter,
      targetType: targetFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });

    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load audit logs.');
    } else {
      setLogs(data);
    }
    setLoading(false);
  }, [actorFilter, targetFilter, page]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-typography-navy font-heading tracking-tight">
            Administrative Audit Logs
          </h1>
          <p className="text-xs text-typography-slate mt-0.5">
            Immutable append-only record of administrative and system security actions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-soft transition-colors disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="min-w-[190px]">
          <CustomSelect
            value={actorFilter}
            onChange={(val) => {
              setPage(0);
              setActorFilter(val as 'all' | 'admin' | 'system');
            }}
            options={ACTOR_OPTIONS}
            triggerClassName="bg-surface-soft"
          />
        </div>
        <div className="min-w-[190px]">
          <CustomSelect
            value={targetFilter}
            onChange={(val) => {
              setPage(0);
              setTargetFilter(val);
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
          <span>Loading audit logs...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-white p-12 text-center">
          <p className="text-sm font-semibold text-typography-navy">
            No audit log entries match the selected filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-surface-border bg-surface-white p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-brand-royal" />
                  <span className="text-xs font-bold text-typography-navy">
                    {log.action}
                  </span>
                  <span className="rounded-md bg-surface-soft px-2 py-0.5 text-[10px] font-semibold text-typography-slate border border-surface-border uppercase">
                    {log.target_type}
                  </span>
                  <span className="rounded-md bg-brand-ice px-2 py-0.5 text-[10px] font-semibold text-brand-royal uppercase">
                    {log.actor_type}
                  </span>
                </div>
                <span className="text-[11px] text-typography-muted">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>

              <p className="mt-1.5 text-xs text-typography-slate">
                Actor:{' '}
                <strong className="text-typography-navy">
                  {log.admin?.username
                    ? `@${log.admin.username}`
                    : 'System'}
                </strong>
                {log.target_id && ` • Target ID: ${log.target_id}`}
              </p>

              {log.reason && (
                <p className="mt-1 text-xs text-typography-navy">
                  Reason: {log.reason}
                </p>
              )}

              {(log.previous_values || log.new_values) && (
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {log.previous_values && (
                    <pre className="rounded-xl bg-surface-soft p-2.5 border border-surface-border overflow-x-auto text-typography-slate">
                      Prev: {JSON.stringify(log.previous_values)}
                    </pre>
                  )}
                  {log.new_values && (
                    <pre className="rounded-xl bg-brand-ice/40 p-2.5 border border-brand-royal/20 overflow-x-auto text-typography-navy">
                      New: {JSON.stringify(log.new_values)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}

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
              disabled={logs.length < PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-semibold text-typography-navy disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

