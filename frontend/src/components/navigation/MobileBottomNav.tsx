import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Compass,
  Users,
  Plus,
  User as UserIcon,
  MoreHorizontal,
  X,
  Lightbulb,
  FolderGit2,
  MessageSquare,
  Bell,
  MessageSquarePlus,
  Settings,
  ShieldCheck,
  Inbox,
  Info,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/common';
import { cn } from '@/utils/cn';

interface MobileBottomNavProps {
  unreadCount?: number;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  unreadCount = 0,
  unreadNotificationsCount,
  unreadMessagesCount = 0,
}) => {
  const effectiveNotifCount = unreadNotificationsCount ?? unreadCount;
  const { profile, isAuthenticated, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    navigate('/');
  };

  const profilePath = profile?.username ? `/profile/${profile.username}` : '/profile';

  const moreLinks = isAuthenticated
    ? [
        { label: 'Ideora Match', to: '/match', icon: Sparkles },
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'My Ideas', to: '/dashboard?tab=ideas', icon: Lightbulb },
        { label: 'Collaborations', to: '/dashboard?tab=incoming', icon: Inbox },
        { label: 'Projects', to: '/projects', icon: FolderGit2 },
        { label: 'Ask ORA', to: '/ai', icon: Sparkles },
        {
          label: 'Messages',
          to: '/messages',
          icon: MessageSquare,
          count: unreadMessagesCount,
        },
        {
          label: 'Notifications',
          to: '/notifications',
          icon: Bell,
          count: effectiveNotifCount,
        },
        { label: 'Feedback', to: '/feedback', icon: MessageSquarePlus },
        { label: 'My Profile', to: profilePath, icon: UserIcon },
        { label: 'Settings', to: '/settings', icon: Settings },
        { label: 'About', to: '/about', icon: Info },
        ...(profile?.role === 'admin'
          ? [{ label: 'Admin Center', to: '/admin', icon: ShieldCheck }]
          : []),
      ]
    : [
        { label: 'About Ideora', to: '/about', icon: Info },
        { label: 'Sign In', to: '/auth', icon: LogIn },
      ];

  const isMoreRouteActive = [
    '/projects',
    '/messages',
    '/notifications',
    '/feedback',
    '/settings',
    '/admin',
    '/about',
  ].some((prefix) => location.pathname.startsWith(prefix));

  return (
    <>
      {/* Slide-up "More" Sheet */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setMoreOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="More navigation options"
        >
          <div
            className="w-full rounded-t-3xl border-t border-surface-border bg-surface-white p-5 pb-8 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-typography-navy font-heading">
                  Workspace Menu
                </h2>
                <p className="text-xs text-typography-muted">
                  Navigate tools, messages, and appearance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-xl p-2 text-typography-muted hover:text-typography-navy hover:bg-surface-soft transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Theme Selector inside More sheet so mobile header stays clean */}
            <div className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface-soft px-4 py-3">
              <span className="text-xs font-semibold text-typography-navy">
                Appearance
              </span>
              <ThemeToggle variant="compact" />
            </div>

            {/* Grid of Navigation Links */}
            <div className="grid grid-cols-2 gap-2.5">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="relative flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-soft px-3.5 py-3 text-xs font-semibold text-typography-navy hover:border-brand-royal/40 hover:bg-surface-light transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="truncate">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-royal px-1.5 text-[10px] font-bold text-white">
                        {item.count > 9 ? '9+' : item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-functional-error/30 bg-functional-error-light/40 px-4 py-3 text-xs font-semibold text-functional-error hover:bg-functional-error-light transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fixed Notched Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] bg-transparent pointer-events-none"
        aria-label="Mobile navigation"
      >
        <div className="relative max-w-md mx-auto pointer-events-auto">
          {/* Frosted Notched Bar Background */}
          <svg
            viewBox="0 0 375 68"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-full w-full text-surface-white/95 drop-shadow-[0_-6px_20px_rgba(15,23,42,0.14)]"
          >
            <path
              d="M 0,22 Q 0,0 22,0 L 141,0 C 155,0 157,28 187.5,28 C 218,28 220,0 234,0 L 353,0 Q 375,0 375,22 L 375,68 L 0,68 Z"
              fill="currentColor"
            />
            <path
              d="M 0,22 Q 0,0 22,0 L 141,0 C 155,0 157,28 187.5,28 C 218,28 220,0 234,0 L 353,0 Q 375,0 375,22"
              fill="none"
              stroke="currentColor"
              className="text-surface-border/90"
              strokeWidth="1.2"
            />
          </svg>

          <div className="relative z-10 grid grid-cols-5 items-end h-[68px] px-2 pb-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition-all',
                  isActive
                    ? 'text-brand-royal font-semibold'
                    : 'text-typography-slate hover:text-typography-navy'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Home
                    className={cn(
                      'h-5 w-5 transition-transform',
                      isActive && 'drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                    )}
                  />
                  <span>Home</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/explore"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition-all',
                  isActive
                    ? 'text-brand-royal font-semibold'
                    : 'text-typography-slate hover:text-typography-navy'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Compass
                    className={cn(
                      'h-5 w-5 transition-transform',
                      isActive && 'drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                    )}
                  />
                  <span>Explore</span>
                </>
              )}
            </NavLink>

            {/* Center Floating Circular Create Button */}
            <div className="flex flex-col items-center justify-end pb-1">
              <Link
                to="/ideas/new"
                className="group flex h-14 w-14 -mt-8 items-center justify-center rounded-full bg-gradient-to-br from-[#38BDF8] via-brand-royal to-[#4338CA] text-white shadow-[0_6px_22px_rgba(37,99,235,0.48)] ring-2 ring-white/25 hover:brightness-110 active:scale-95 transition-all"
                aria-label="Create Idea"
              >
                <Plus className="h-6 w-6 stroke-[2.25] transition-transform group-hover:rotate-90 duration-200" />
              </Link>
              <span className="mt-1 text-[10px] font-semibold text-typography-navy">
                Create
              </span>
            </div>

            <NavLink
              to="/people"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition-all',
                  isActive
                    ? 'text-brand-royal font-semibold'
                    : 'text-typography-slate hover:text-typography-navy'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Users
                    className={cn(
                      'h-5 w-5 transition-transform',
                      isActive && 'drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                    )}
                  />
                  <span>People</span>
                </>
              )}
            </NavLink>

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition-all',
                moreOpen || isMoreRouteActive || location.pathname.startsWith(profilePath)
                  ? 'text-brand-royal font-semibold'
                  : 'text-typography-slate hover:text-typography-navy'
              )}
            >
              <div className="relative">
                {unreadMessagesCount + effectiveNotifCount > 0 ? (
                  <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-brand-royal" />
                ) : null}
                <MoreHorizontal className="h-5 w-5" />
              </div>
              <span>More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};
