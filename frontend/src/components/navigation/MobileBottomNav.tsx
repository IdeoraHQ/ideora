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
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'My Ideas', to: '/dashboard?tab=ideas', icon: Lightbulb },
        { label: 'Collaborations', to: '/dashboard?tab=incoming', icon: Inbox },
        { label: 'Projects', to: '/projects', icon: FolderGit2 },
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

      {/* Fixed Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-surface-border bg-surface-white/95 backdrop-blur-md px-2 pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-royal font-semibold' : 'text-typography-slate'
              )
            }
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/explore"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-royal font-semibold' : 'text-typography-slate'
              )
            }
          >
            <Compass className="h-5 w-5" />
            <span>Explore</span>
          </NavLink>

          {/* Center Floating Publish Button */}
          <div className="flex items-center justify-center">
            <Link
              to="/ideas/new"
              className="flex h-11 w-11 -mt-4 items-center justify-center rounded-2xl bg-brand-royal text-white shadow-lg shadow-brand-royal/30 hover:bg-brand-deep active:scale-95 transition-all"
              aria-label="Publish Idea"
            >
              <Plus className="h-6 w-6" />
            </Link>
          </div>

          <NavLink
            to="/people"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-royal font-semibold' : 'text-typography-slate'
              )
            }
          >
            <Users className="h-5 w-5" />
            <span>People</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
              moreOpen || isMoreRouteActive || location.pathname.startsWith(profilePath)
                ? 'text-brand-royal font-semibold'
                : 'text-typography-slate'
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
      </nav>
    </>
  );
};
