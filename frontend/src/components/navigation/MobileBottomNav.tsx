import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Lightbulb,
  Bell,
  User,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

interface MobileBottomNavProps {
  unreadCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  unreadCount = 0,
}) => {
  const { profile, isAuthenticated } = useAuth();
  const location = useLocation();

  // 5 primary destinations as required
  const tabs = [
    {
      label: 'Home',
      to: '/dashboard',
      icon: Home,
      isActive: location.pathname === '/dashboard' && !location.search.includes('tab='),
    },
    {
      label: 'Explore',
      to: '/explore',
      icon: Compass,
      isActive: location.pathname.startsWith('/explore'),
    },
    {
      label: 'My Ideas',
      to: '/dashboard?tab=ideas',
      icon: Lightbulb,
      isActive:
        location.pathname === '/dashboard' && location.search.includes('tab=ideas'),
    },
    {
      label: 'Activity',
      to: '/dashboard?tab=incoming',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      isActive:
        location.pathname === '/dashboard' && location.search.includes('tab=incoming'),
    },
    {
      label: 'Profile',
      to: isAuthenticated && profile ? `/profile/${profile.username}` : '/auth',
      icon: User,
      isProfile: true,
      isActive: location.pathname.startsWith('/profile') || location.pathname === '/auth',
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-lg mx-auto pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile Navigation"
    >
      <div className="relative rounded-3xl bg-surface-white/98 backdrop-blur-xl border border-surface-border/70 shadow-[0_12px_40px_rgba(20,33,61,0.14)] px-3 pt-3 pb-2.5 pointer-events-auto">
        {/* Floating Elevated Blue Circular '+' Action Button */}
        <Link
          to="/ideas/new"
          className="absolute -top-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-royal text-white shadow-xl shadow-brand-royal/45 hover:bg-brand-deep active:scale-95 transition-all focus:outline-none"
          title="Publish an Idea"
          aria-label="Publish an Idea"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </Link>

        {/* 5 Destination Navigation Items */}
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.label}
                to={tab.to}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors min-w-0 group',
                  tab.isActive
                    ? 'text-brand-royal font-semibold'
                    : 'text-typography-slate hover:text-typography-navy font-medium'
                )}
              >
                <div className="relative flex items-center justify-center">
                  {tab.isProfile && profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Profile'}
                      className={cn(
                        'h-5 w-5 rounded-full object-cover transition-transform',
                        tab.isActive
                          ? 'ring-2 ring-brand-royal scale-105'
                          : 'border border-surface-border group-hover:border-brand-royal/50'
                      )}
                    />
                  ) : (
                    <Icon
                      className={cn(
                        'h-5 w-5 transition-transform duration-150',
                        tab.isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8] group-hover:scale-105'
                      )}
                    />
                  )}

                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span className="absolute -top-1 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-functional-error px-1 text-[9px] font-bold text-white shadow-sm">
                      {Number(tab.badge) > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    'mt-1 text-[11px] tracking-tight truncate max-w-[62px] transition-colors',
                    tab.isActive
                      ? 'text-brand-royal font-medium'
                      : 'text-typography-slate group-hover:text-typography-navy'
                  )}
                >
                  {tab.label}
                </span>

                {tab.isActive && (
                  <span className="absolute -bottom-1 h-0.5 w-4 rounded-full bg-brand-royal" />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
