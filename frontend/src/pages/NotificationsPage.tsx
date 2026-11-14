import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Users,
  MessageSquare,
  MessageSquarePlus,
  ThumbsUp,
  Sparkles,
  ArrowRight,
  RotateCw,
  Inbox,
  Filter,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/api';
import type { NotificationItem, NotificationType } from '@/types';
import { cn } from '@/utils/cn';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load user notifications
  const loadNotifications = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const { data, error } = await fetchUserNotifications({ limit: 100 });
      if (error) {
        setErrorMessage(error.message || 'Failed to load notifications.');
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to connect to notifications service.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadNotifications();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadNotifications]);

  // Unread count calculated across all notifications
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Filtered notifications list
  const displayedNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  // Mark a single notification as read / unread toggle
  const handleToggleRead = async (e: React.MouseEvent, notif: NotificationItem) => {
    e.stopPropagation();
    const newReadState = !notif.is_read;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: newReadState } : n))
    );

    const { error } = await markNotificationAsRead(notif.id, newReadState);
    if (error) {
      // Revert if request fails
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: notif.is_read } : n))
      );
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    const { error } = await markAllNotificationsAsRead();
    if (error) {
      void loadNotifications();
    }
    setMarkingAll(false);
  };

  // Navigate to target destination
  const handleNavigateDestination = async (notif: NotificationItem) => {
    // If unread, mark read in background
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      void markNotificationAsRead(notif.id, true);
    }

    if (notif.type === 'collaboration_request') {
      navigate('/dashboard?tab=incoming');
      return;
    }

    if (notif.type === 'new_message') {
      navigate('/messages');
      return;
    }

    if (notif.type === 'feedback_updated') {
      navigate('/feedback');
      return;
    }

    if (notif.idea?.slug) {
      navigate(`/ideas/${notif.idea.slug}`);
      return;
    }

    if (notif.actor?.username) {
      navigate(`/profile/${notif.actor.username}`);
      return;
    }

    navigate('/dashboard');
  };

  // Helper: Format relative timestamp
  const formatRelativeTime = (isoString: string): string => {
    const timestamp = new Date(isoString).getTime();
    const now = Date.now();
    const diffSeconds = Math.floor((now - timestamp) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: new Date().getFullYear() !== new Date(isoString).getFullYear() ? 'numeric' : undefined,
    });
  };

  // Helper: Type icon & accent style
  const getNotificationVisuals = (type: NotificationType) => {
    switch (type) {
      case 'collaboration_request':
        return {
          icon: Users,
          bg: 'bg-brand-ice text-brand-royal border-brand-pale',
          badgeText: 'Collaboration Request',
          actionText: 'Review Application',
        };
      case 'request_accepted':
        return {
          icon: CheckCircle2,
          bg: 'bg-functional-success-light text-functional-success border-functional-success/20',
          badgeText: 'Application Accepted',
          actionText: 'Open Project',
        };
      case 'request_declined':
        return {
          icon: XCircle,
          bg: 'bg-functional-error-light text-functional-error border-functional-error/20',
          badgeText: 'Application Update',
          actionText: 'View Idea',
        };
      case 'role_filled':
        return {
          icon: XCircle,
          bg: 'bg-surface-soft text-typography-slate border-surface-border',
          badgeText: 'Role Filled',
          actionText: 'View Idea',
        };
      case 'new_comment':
        return {
          icon: MessageSquare,
          bg: 'bg-brand-ice/70 text-brand-royal border-brand-pale',
          badgeText: 'Discussion Note',
          actionText: 'View Discussion',
        };
      case 'new_message':
        return {
          icon: MessageSquare,
          bg: 'bg-brand-ice text-brand-royal border-brand-pale',
          badgeText: 'Direct Message',
          actionText: 'Open Conversation',
        };
      case 'idea_upvoted':
        return {
          icon: ThumbsUp,
          bg: 'bg-brand-pale/40 text-brand-royal border-brand-royal/20',
          badgeText: 'Endorsement',
          actionText: 'View Idea',
        };
      case 'feedback_updated':
        return {
          icon: MessageSquarePlus,
          bg: 'bg-brand-ice text-brand-royal border-brand-pale',
          badgeText: 'Feedback Update',
          actionText: 'View Feedback',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-surface-soft text-typography-slate border-surface-border',
          badgeText: 'Update',
          actionText: 'View Details',
        };
    }
  };

  // If user is not authenticated, render clear sign-in card
  if (!isAuthenticated && !loading) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-3xl border border-surface-border bg-surface-white p-8 sm:p-10 shadow-2xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-4 border border-brand-pale">
            <Bell className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-typography-navy tracking-tight font-heading">
            Sign in to View Notifications
          </h1>
          <p className="mt-2 text-sm text-typography-slate leading-relaxed">
            Monitor real-time updates on your idea applications, co-founder endorsements, and team discussions.
          </p>
          <Link
            to="/auth"
            state={{ from: '/notifications' }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-brand-deep transition-all"
          >
            Sign In / Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Page Header Card */}
      <div className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border/70">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice border border-brand-pale px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal mb-2">
              <Bell className="h-3.5 w-3.5" />
              Activity & Notifications
            </div>
            <h1 className="text-3xl sm:text-4xl font-light text-typography-navy tracking-tight font-heading leading-tight">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm font-normal text-typography-slate leading-relaxed max-w-2xl">
              Stay updated on collaborator applications, review team acceptances, and monitor feedback across your initiatives.
            </p>
          </div>

          {/* Quick Counter Summary */}
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <div className="rounded-2xl bg-surface-soft border border-surface-border px-4 py-2 text-right">
              <span className="block text-2xl font-light text-brand-royal">
                {unreadCount}
              </span>
              <span className="block text-[11px] font-medium text-typography-muted">
                Unread Alerts
              </span>
            </div>
          </div>
        </div>

        {/* 2. Control Bar: Filter Tabs + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
          {/* Segmented Filter Pills */}
          <div className="inline-flex rounded-xl bg-surface-soft p-1 border border-surface-border">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
                filter === 'all'
                  ? 'bg-surface-white text-brand-royal shadow-2xs border border-surface-border/70'
                  : 'text-typography-slate hover:text-typography-navy'
              )}
            >
              <span>All</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                  filter === 'all'
                    ? 'bg-brand-ice text-brand-royal'
                    : 'bg-surface-light text-typography-muted'
                )}
              >
                {notifications.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
                filter === 'unread'
                  ? 'bg-surface-white text-brand-royal shadow-2xs border border-surface-border/70'
                  : 'text-typography-slate hover:text-typography-navy'
              )}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-royal text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadNotifications(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-white px-3 py-1.5 text-xs font-medium text-typography-slate hover:bg-surface-light hover:text-typography-navy transition-colors disabled:opacity-50"
              title="Refresh notifications"
            >
              <RotateCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-brand-royal')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markingAll}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs',
                unreadCount > 0
                  ? 'bg-brand-royal text-white hover:bg-brand-deep'
                  : 'bg-surface-soft border border-surface-border text-typography-muted cursor-not-allowed opacity-60'
              )}
              title={unreadCount > 0 ? 'Mark all notifications as read' : 'No unread notifications'}
            >
              <CheckCheck className="h-4 w-4" />
              <span>{markingAll ? 'Updating...' : 'Mark all read'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Error Alert */}
      {errorMessage && (
        <div className="rounded-2xl border border-functional-error/30 bg-functional-error-light p-4 text-xs font-medium text-functional-error flex items-center justify-between gap-3">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => void loadNotifications(true)}
            className="font-semibold underline hover:text-functional-error/80"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Notifications Feed List */}
      {loading ? (
        <div className="rounded-3xl border border-surface-border bg-surface-white p-12 text-center shadow-2xs space-y-3">
          <Sparkles className="mx-auto h-7 w-7 text-brand-royal animate-spin" />
          <p className="text-xs font-semibold text-typography-slate">
            Loading your notification activity...
          </p>
        </div>
      ) : displayedNotifications.length === 0 ? (
        /* Empty States */
        <div className="rounded-3xl border border-surface-border bg-surface-white p-12 sm:p-16 text-center shadow-2xs">
          {filter === 'unread' ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-functional-success-light text-functional-success border border-functional-success/20">
                <Check className="h-6 w-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-typography-navy font-heading">
                All Caught Up!
              </h3>
              <p className="text-xs text-typography-slate leading-relaxed">
                You have reviewed all your alerts. When new collaborator requests or architecture notes arrive, they will appear here.
              </p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
              >
                <Filter className="h-3.5 w-3.5 text-brand-royal" />
                <span>View All Notifications</span>
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-soft text-typography-muted border border-surface-border">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-typography-navy font-heading">
                No Notifications Yet
              </h3>
              <p className="text-xs text-typography-slate leading-relaxed">
                As founders explore your profile, apply to your roles, or endorse your published concepts, real-time alerts will stream here.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-deep transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Explore Initiatives</span>
                </Link>
                <Link
                  to="/ideas/new"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-soft px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
                >
                  <span>Publish an Idea</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Populated Notification Cards */
        <div className="space-y-3">
          {displayedNotifications.map((notif) => {
            const visual = getNotificationVisuals(notif.type);
            const Icon = visual.icon;

            return (
              <div
                key={notif.id}
                onClick={() => void handleNavigateDestination(notif)}
                className={cn(
                  'group relative rounded-2xl border transition-all duration-150 p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-4',
                  !notif.is_read
                    ? 'bg-brand-ice/20 border-brand-pale hover:border-brand-royal/50 shadow-2xs'
                    : 'bg-surface-white border-surface-border hover:border-brand-light/70 hover:shadow-2xs'
                )}
              >
                {/* Left: Icon, Details, Content */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Type Visual Icon */}
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105',
                      visual.bg
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Body Content */}
                  <div className="space-y-1 min-w-0 flex-1">
                    {/* Top Meta Line */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-typography-muted">
                      {/* Badge of Notification Type */}
                      <span className="font-semibold text-typography-navy">
                        {visual.badgeText}
                      </span>

                      <span>&bull;</span>

                      {/* Relative Timestamp */}
                      <span>{formatRelativeTime(notif.created_at)}</span>

                      {/* Associated Idea Pill if present */}
                      {notif.idea && (
                        <>
                          <span>&bull;</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ideas/${notif.idea?.slug}`);
                            }}
                            className="font-medium text-brand-royal hover:underline truncate max-w-[200px]"
                            title={notif.idea.title}
                          >
                            {notif.idea.title}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Notification Title */}
                    <h2 className="text-sm font-semibold text-typography-navy group-hover:text-brand-royal transition-colors leading-snug break-all [word-break:break-all]">
                      {notif.title}
                    </h2>

                    {/* Notification Message Text */}
                    <p className="text-xs font-normal text-typography-slate leading-relaxed break-all [word-break:break-all]">
                      {notif.content}
                    </p>

                    {/* Actor Details Strip if actor profile attached */}
                    {notif.actor && (
                      <div className="pt-1 flex items-center gap-2">
                        {notif.actor.avatar_url ? (
                          <img
                            src={notif.actor.avatar_url}
                            alt={notif.actor.full_name}
                            className="h-5 w-5 rounded-full object-cover border border-surface-border"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-ice text-brand-royal text-[10px] font-bold">
                            {notif.actor.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${notif.actor?.username}`);
                          }}
                          className="text-[11px] font-medium text-typography-slate hover:text-brand-royal transition-colors"
                        >
                          {notif.actor.full_name} (@{notif.actor.username})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Read State & Interactive Actions */}
                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-border/60">
                  {/* Status Indicator Pill */}
                  <div className="flex items-center gap-2">
                    {!notif.is_read ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-royal text-white px-2 py-0.5 text-[10px] font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        Unread
                      </span>
                    ) : (
                      <span className="text-[11px] text-typography-muted font-medium">
                        Read
                      </span>
                    )}

                    {/* Read / Unread Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => void handleToggleRead(e, notif)}
                      className="rounded-lg p-1 text-typography-muted hover:text-brand-royal hover:bg-surface-soft transition-colors"
                      title={notif.is_read ? 'Mark as unread' : 'Mark as read'}
                      aria-label={notif.is_read ? 'Mark as unread' : 'Mark as read'}
                    >
                      <Check className={cn('h-3.5 w-3.5', notif.is_read ? 'text-typography-muted' : 'text-brand-royal')} />
                    </button>
                  </div>

                  {/* Primary Target Destination Link Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleNavigateDestination(notif);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-brand-ice border border-brand-royal/20 px-3 py-1.5 text-xs font-semibold text-brand-royal hover:bg-brand-pale/50 transition-colors"
                  >
                    <span>{visual.actionText}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

