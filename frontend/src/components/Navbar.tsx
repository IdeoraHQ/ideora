import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  PlusCircle,
  Github,
  Database,
  Bell,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  CheckCheck,
  Sparkles,
} from 'lucide-react';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { useSupabaseStatus } from '@/hooks/useSupabaseStatus';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/api';
import type { NotificationItem } from '@/types';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConfigured } = useSupabaseStatus();
  const { profile, isAuthenticated, signOut } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    const loadNotifications = async () => {
      const { data } = await fetchUserNotifications();
      if (data) setNotifications(data);
    };

    void loadNotifications();
  }, [isAuthenticated, profile?.id, location.pathname]);

  useEffect(() => {
    if (!notifOpen && !userMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen, userMenuOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notif.id ? { ...item, is_read: true } : item
        )
      );
    }
    setNotifOpen(false);
    if (notif.idea?.slug) {
      navigate(`/ideas/${notif.idea.slug}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="text-brand-royal group-hover:scale-105 transition-transform">
            <IdeoraLogo size={34} />
          </div>
          <div>
            <span className="text-2xl font-light tracking-tight text-typography-navy font-heading">
              IDEORA
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive('/')
                ? 'bg-brand-ice text-brand-royal'
                : 'text-typography-slate hover:text-typography-navy hover:bg-surface-light'
            }`}
          >
            Overview
          </Link>
          <Link
            to="/explore"
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive('/explore')
                ? 'bg-brand-ice text-brand-royal'
                : 'text-typography-slate hover:text-typography-navy hover:bg-surface-light'
            }`}
          >
            <Compass className="h-4 w-4" />
            Explore Ideas
          </Link>
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/dashboard')
                  ? 'bg-brand-ice text-brand-royal'
                  : 'text-typography-slate hover:text-typography-navy hover:bg-surface-light'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Workspace
            </Link>
          )}
        </nav>

        {/* Actions & Status */}
        <div className="flex items-center gap-2.5">
          {/* Supabase Status Pill */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isConfigured
                ? 'bg-functional-success-light text-functional-success border-functional-success/30'
                : 'bg-brand-ice text-brand-royal border-brand-pale'
            }`}
            title={
              isConfigured
                ? 'Supabase cloud database connected'
                : 'Running with interactive local state store (set .env.local for Supabase Cloud)'
            }
          >
            <Database className="h-3 w-3" />
            <span>{isConfigured ? 'Supabase Live' : 'Interactive Local DB'}</span>
          </div>

          <a
            href="https://github.com/IdeoraHQ/ideora"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex p-2 text-typography-slate hover:text-typography-navy rounded-lg hover:bg-surface-light transition-colors"
            title="GitHub Repository"
          >
            <Github className="h-5 w-5" />
          </a>

          <Link
            to="/ideas/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep transition-all hover:shadow-md"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Publish Idea</span>
          </Link>

          {isAuthenticated && profile ? (
            <>
              {/* Notifications Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative rounded-xl p-2 text-typography-slate hover:bg-surface-light hover:text-typography-navy transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-functional-error text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-surface-border bg-surface-white shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 bg-surface-soft">
                      <span className="text-xs font-semibold uppercase tracking-wider text-typography-navy">
                        Notifications ({unreadCount} unread)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-royal hover:text-brand-deep"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-typography-slate">
                          <Sparkles className="mx-auto h-6 w-6 text-typography-muted mb-2" />
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleMarkRead(n)}
                            className={`w-full text-left px-4 py-3 transition-colors hover:bg-surface-light ${
                              !n.is_read ? 'bg-brand-ice/40' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-typography-navy">
                                {n.title}
                              </span>
                              {!n.is_read && (
                                <span className="h-2 w-2 rounded-full bg-brand-royal shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="mt-1 text-xs text-typography-slate line-clamp-2">
                              {n.content}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar / Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-2.5 py-1.5 text-xs font-bold text-typography-navy hover:border-brand-light transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-royal text-white text-xs font-bold">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {profile.full_name}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-surface-border bg-surface-white py-2 shadow-xl z-50">
                    <div className="border-b border-surface-border px-4 py-2.5">
                      <p className="text-xs font-bold text-typography-navy truncate">
                        {profile.full_name}
                      </p>
                      <p className="text-[11px] text-typography-slate truncate">
                        @{profile.username} &bull;{' '}
                        <span className="capitalize text-brand-royal font-semibold">
                          {profile.role}
                        </span>
                      </p>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-typography-charcoal hover:bg-surface-light"
                    >
                      <LayoutDashboard className="h-4 w-4 text-brand-royal" />
                      Builder Workspace
                    </Link>

                    <Link
                      to={`/profile/${profile.username}`}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-typography-charcoal hover:bg-surface-light"
                    >
                      <UserIcon className="h-4 w-4 text-brand-royal" />
                      My Profile
                    </Link>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-functional-error hover:bg-functional-error-light/50 text-left border-t border-surface-border mt-1 pt-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-royal/30 bg-brand-ice px-3.5 py-2 text-sm font-bold text-brand-royal hover:bg-brand-pale/60 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
