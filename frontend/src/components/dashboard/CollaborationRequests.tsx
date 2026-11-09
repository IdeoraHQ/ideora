import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';
import type { CollaborationRequest } from '@/types';

interface CollaborationRequestsProps {
  requests: CollaborationRequest[];
  loading?: boolean;
  onAccept?: (id: string) => Promise<void>;
  onDecline?: (id: string) => Promise<void>;
}

export const CollaborationRequests: React.FC<CollaborationRequestsProps> = ({
  requests,
  loading,
  onAccept,
  onDecline,
}) => {
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-surface-border/70 pb-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-typography-navy font-heading flex items-center gap-2">
            <Inbox className="h-5 w-5 text-brand-royal" />
            <span>Pending Requests</span>
          </h2>
          <p className="text-xs font-normal text-typography-slate mt-0.5">
            Builders requesting to join your team
          </p>
        </div>

        <Link
          to="/dashboard?tab=incoming"
          className="text-xs font-semibold text-brand-royal hover:text-brand-deep flex items-center gap-1 transition-colors"
        >
          <span>All ({requests.length})</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-typography-muted">
          Loading incoming requests...
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-6 text-center bg-surface-soft/60">
          <Inbox className="mx-auto h-7 w-7 text-typography-muted mb-2 opacity-60" />
          <h3 className="text-sm font-medium text-typography-navy">
            No pending requests
          </h3>
          <p className="text-[11px] text-typography-slate mt-0.5">
            When candidates apply to your roles, review them right here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.slice(0, 3).map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-surface-border/80 bg-surface-soft p-3.5 space-y-2.5 transition-all hover:border-brand-pale"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to={`/profile/${req.requester?.username || ''}`}
                    className="text-xs font-medium text-typography-navy hover:text-brand-royal truncate block"
                  >
                    {req.requester?.full_name || 'Builder'}
                  </Link>
                  <p className="text-[11px] text-typography-slate truncate">
                    Role:{' '}
                    <span className="font-medium text-brand-royal">
                      {req.role?.role_title || 'Collaborator'}
                    </span>
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-functional-warning-light px-2 py-0.5 text-[10px] font-semibold text-functional-warning">
                  Pending
                </span>
              </div>

              <p className="text-xs font-normal text-typography-charcoal line-clamp-2 leading-relaxed bg-surface-white p-2.5 rounded-lg border border-surface-border/60">
                {req.message}
              </p>

              {(onAccept || onDecline) && (
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  {onDecline && (
                    <button
                      type="button"
                      onClick={() => onDecline(req.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-white px-2.5 py-1 text-[11px] font-medium text-typography-slate hover:bg-functional-error-light hover:text-functional-error transition-colors"
                    >
                      <XCircle className="h-3 w-3" />
                      Decline
                    </button>
                  )}
                  {onAccept && (
                    <button
                      type="button"
                      onClick={() => onAccept(req.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-functional-success px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Accept
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

