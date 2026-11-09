import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  CheckCheck,
  User as UserIcon,
  LogOut,
  Sparkles,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/api';
import type { NotificationItem } from '@/types';
import { cn } from '@/utils/cn';

interface DashboardHeaderProps {
  title?: string;
  breadcrumb?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  breadcrumb = 'Workspace',
}) => {
  const { profile, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load user notifications if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadNotifs = async () => {
      const { data } = await fetchUserNotifications();
      if (data) setNotifications(data);
    };
    void loadNotifs();
  }, [isAuthenticated, location.pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    setIsNotifOpen(false);
    if (notif.idea?.slug) {
      navigate(`/ideas/${notif.idea.slug}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-surface-border bg-surface-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-typography-muted">
            <Link to="/dashboard" className="hover:text-brand-royal transition-colors">
              IDEORA
            </Link>
            <span>/</span>
            <span className="text-typography-slate font-medium truncate max-w-[140px] sm:max-w-xs">
              {breadcrumb}
            </span>
          </div>
          {title && (
            <h1 className="text-sm sm:text-base font-medium text-typography-navy truncate -mt-0.5">
              {title}
            </h1>
          )}
        </div>
      </div>

      {/* Center: Search Interface (Desktop & Tablet) */}
      <div className="hidden sm:flex flex-1 max-w-md mx-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search
            className={cn(
              'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors',
              isSearchFocused ? 'text-brand-royal' : 'text-typography-muted'
            )}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search ideas, skills, collaborators..."
            className={cn(
              'w-full rounded-xl border border-surface-border bg-surface-soft py-2 pl-10 pr-4 text-xs font-normal text-typography-navy placeholder-typography-muted transition-all focus:bg-surface-white focus:outline-none',
              isSearchFocused && 'border-brand-royal ring-2 ring-brand-pale/60 shadow-sm'
            )}
          />
        </form>
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Publish for tablets/mobile header */}
        <Link
          to="/ideas/new"
          className="hidden sm:inline-flex md:hidden items-center gap-1.5 rounded-xl bg-brand-royal px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep transition-all"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>New Idea</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative rounded-xl p-2 text-typography-slate hover:bg-surface-light hover:text-typography-navy transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-functional-error px-1 text-[9px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-surface-border bg-surface-white shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 bg-surface-soft">
                <span className="text-xs font-semibold text-typography-navy uppercase tracking-wider">
                  Notifications ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-royal hover:text-brand-deep"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-typography-muted">
                    <Sparkles className="mx-auto h-6 w-6 text-typography-muted mb-2 opacity-60" />
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleMarkRead(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors hover:bg-surface-light',
                        !n.is_read ? 'bg-brand-ice/40' : 'bg-surface-white'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-typography-navy truncate">
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-brand-royal shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-typography-slate line-clamp-2 leading-relaxed">
                        {n.content}
                      </p>
                      <span className="mt-1 block text-[10px] text-typography-muted">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        {profile ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-soft p-1 sm:px-2.5 sm:py-1.5 text-xs font-bold text-typography-navy hover:border-brand-light transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-royal text-white text-xs font-bold shadow-sm">
                {profile.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline max-w-[110px] truncate text-left">
                {profile.full_name}
              </span>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-surface-border bg-surface-white py-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="border-b border-surface-border px-4 py-2.5">
                  <p className="text-xs font-medium text-typography-navy truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-[11px] text-typography-muted truncate">
                    @{profile.username} &bull;{' '}
                    <span className="capitalize text-brand-royal font-medium">
                      {profile.role || 'Collaborator'}
                    </span>
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    to={`/profile/${profile.username}`}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-typography-charcoal hover:bg-surface-light"
                  >
                    <UserIcon className="h-4 w-4 text-brand-royal" />
                    View Profile
                  </Link>
                  <Link
                    to="/dashboard?tab=ideas"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-typography-charcoal hover:bg-surface-light"
                  >
                    <ExternalLink className="h-4 w-4 text-brand-royal" />
                    My Submitted Ideas
                  </Link>
                </div>

                <div className="border-t border-surface-border pt-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-functional-error hover:bg-functional-error-light text-left transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep transition-all"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};

