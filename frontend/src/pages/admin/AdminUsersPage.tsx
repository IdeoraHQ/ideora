import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  fetchAdminUsers,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  type AdminUserItem,
} from '@/services/api/admin';
import { CustomSelect } from '@/components/common';
import type { AccountStatus, UserRole } from '@/types';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { label: 'All Roles', value: 'all' },
  { label: 'Founder', value: 'founder' },
  { label: 'Collaborator', value: 'collaborator' },
  { label: 'Admin', value: 'admin' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Banned', value: 'banned' },
];

const STATUS_BADGE: Record<AccountStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-50 text-amber-700 border-amber-200',
  banned: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [targetRole, setTargetRole] = useState<UserRole>('collaborator');
  const [roleReason, setRoleReason] = useState('');
  const [confirmRoleOpen, setConfirmRoleOpen] = useState(false);

  const [targetStatus, setTargetStatus] = useState<AccountStatus>('active');
  const [statusReason, setStatusReason] = useState('');
  const [suspendedUntil, setSuspendedUntil] = useState('');
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchAdminUsers({
      search,
      role: roleFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });

    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load users.');
      setLoading(false);
      return;
    }

    const filtered =
      statusFilter === 'all'
        ? data
        : data.filter(
            (u) => (u.security_status?.account_status ?? 'active') === statusFilter
          );

    setUsers(filtered);
    setSelectedId((prev) => {
      if (prev && filtered.some((u) => u.id === prev)) return prev;
      return filtered[0]?.id ?? null;
    });
    setLoading(false);
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedUser) return;
    setTargetRole(selectedUser.role);
    setTargetStatus(selectedUser.security_status?.account_status ?? 'active');
    setRoleReason('');
    setStatusReason('');
    setSuspendedUntil('');
    setConfirmRoleOpen(false);
    setConfirmStatusOpen(false);
    setActionMsg(null);
    setActionErr(null);
  }, [selectedUser]);

  const handleRoleUpdate = async () => {
    if (!selectedUser || saving) return;
    setSaving(true);
    setActionErr(null);
    setActionMsg(null);

    const { error: err } = await adminUpdateUserRole({
      targetUserId: selectedUser.id,
      newRole: targetRole,
      reason: roleReason,
    });

    setSaving(false);
    setConfirmRoleOpen(false);
    if (err) {
      setActionErr(err.message || 'Failed to update user role.');
      return;
    }
    setActionMsg(`Role updated to ${targetRole} for @${selectedUser.username}.`);
    await loadUsers();
  };

  const handleStatusUpdate = async () => {
    if (!selectedUser || saving) return;
    setSaving(true);
    setActionErr(null);
    setActionMsg(null);

    const { error: err } = await adminUpdateUserStatus({
      targetUserId: selectedUser.id,
      newStatus: targetStatus,
      reason: statusReason,
      suspendedUntil:
        targetStatus === 'suspended' && suspendedUntil
          ? new Date(suspendedUntil).toISOString()
          : null,
    });

    setSaving(false);
    setConfirmStatusOpen(false);
    if (err) {
      setActionErr(err.message || 'Failed to update account status.');
      return;
    }
    setActionMsg(
      `Account status updated to ${targetStatus} for @${selectedUser.username}.`
    );
    await loadUsers();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-typography-navy font-heading tracking-tight">
            User Management
          </h1>
          <p className="text-xs text-typography-slate mt-0.5">
            Inspect accounts, manage platform roles, and enforce suspensions or bans.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-soft transition-colors disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl border border-surface-border bg-surface-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            placeholder="Search by username or full name..."
            className="w-full rounded-xl border border-surface-border bg-surface-soft py-2 pl-9 pr-3 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
          />
        </div>
        <CustomSelect
          value={roleFilter}
          onChange={(val) => {
            setPage(0);
            setRoleFilter(val as UserRole | 'all');
          }}
          options={ROLE_OPTIONS}
          triggerClassName="bg-surface-soft"
        />
        <CustomSelect
          value={statusFilter}
          onChange={(val) => {
            setPage(0);
            setStatusFilter(val as AccountStatus | 'all');
          }}
          options={STATUS_OPTIONS}
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
          <span>Loading users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-white p-12 text-center">
          <p className="text-sm font-semibold text-typography-navy">
            No users match your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Users List */}
          <div className="lg:col-span-6 space-y-2.5">
            {users.map((u) => {
              const status = u.security_status?.account_status ?? 'active';
              const active = u.id === selectedId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedId(u.id)}
                  className={cn(
                    'w-full text-left rounded-2xl border p-4 transition-all flex items-center justify-between gap-3',
                    active
                      ? 'border-brand-royal bg-brand-ice/40 shadow-sm'
                      : 'border-surface-border bg-surface-white hover:border-brand-light'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-typography-navy truncate">
                      {u.full_name}
                    </p>
                    <p className="text-xs text-typography-muted truncate">
                      @{u.username} &bull; Joined{' '}
                      {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-md bg-surface-soft px-2 py-0.5 text-[11px] font-semibold text-brand-royal border border-surface-border capitalize">
                      {u.role}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                        STATUS_BADGE[status]
                      )}
                    >
                      {status}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Pagination */}
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
                disabled={users.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-semibold text-typography-navy disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Detail & Actions Panel */}
          {selectedUser && (
            <div className="lg:col-span-6 rounded-2xl border border-surface-border bg-surface-white p-6 shadow-sm space-y-5">
              <div className="border-b border-surface-border pb-4">
                <h2 className="text-lg font-semibold text-typography-navy font-heading">
                  {selectedUser.full_name}
                </h2>
                <p className="text-xs text-typography-muted">
                  @{selectedUser.username} &bull; ID: {selectedUser.id}
                </p>
                {selectedUser.bio && (
                  <p className="mt-2 text-xs text-typography-slate leading-relaxed">
                    {selectedUser.bio}
                  </p>
                )}
                {selectedUser.skills?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedUser.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-typography-navy border border-surface-border"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
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

              {/* Role Management */}
              <div className="rounded-xl border border-surface-border bg-surface-soft/60 p-4 space-y-3">
                <h3 className="text-xs font-bold text-typography-navy uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-brand-royal" />
                  Role Management
                </h3>
                <CustomSelect
                  value={targetRole}
                  onChange={(val) => setTargetRole(val as UserRole)}
                  options={ROLE_OPTIONS.filter((o) => o.value !== 'all')}
                />
                <input
                  type="text"
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="Reason for role change (logged to audit trail)..."
                  className="w-full rounded-xl border border-surface-border bg-surface-white px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                />
                {confirmRoleOpen ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRoleUpdate}
                      disabled={saving}
                      className="rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                    >
                      {saving ? 'Updating...' : `Confirm Role: ${targetRole}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRoleOpen(false)}
                      className="rounded-xl border border-surface-border bg-surface-white px-3 py-2 text-xs font-semibold text-typography-slate"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={targetRole === selectedUser.role}
                    onClick={() => setConfirmRoleOpen(true)}
                    className="rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
                  >
                    Update Role
                  </button>
                )}
              </div>

              {/* Account Status Management */}
              <div className="rounded-xl border border-surface-border bg-surface-soft/60 p-4 space-y-3">
                <h3 className="text-xs font-bold text-typography-navy uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Account Status
                </h3>
                <CustomSelect
                  value={targetStatus}
                  onChange={(val) => setTargetStatus(val as AccountStatus)}
                  options={STATUS_OPTIONS.filter((o) => o.value !== 'all')}
                />
                {targetStatus === 'suspended' && (
                  <input
                    type="datetime-local"
                    value={suspendedUntil}
                    onChange={(e) => setSuspendedUntil(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-white px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                  />
                )}
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Reason for status change..."
                  className="w-full rounded-xl border border-surface-border bg-surface-white px-3 py-2 text-xs text-typography-navy focus:border-brand-royal focus:outline-none"
                />
                {confirmStatusOpen ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStatusUpdate}
                      disabled={saving}
                      className="rounded-xl bg-functional-error px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {saving
                        ? 'Updating...'
                        : `Confirm Status: ${targetStatus}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmStatusOpen(false)}
                      className="rounded-xl border border-surface-border bg-surface-white px-3 py-2 text-xs font-semibold text-typography-slate"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmStatusOpen(true)}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Apply Account Status
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

