import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  Lightbulb,
  Users,
  FolderGit2,
  MessageSquare,
  Bell,
  Settings,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

interface DesktopSidebarProps {
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Explore Ideas', to: '/explore', icon: Compass },
    { label: 'My Ideas', to: '/dashboard?tab=ideas', icon: Lightbulb },
    { label: 'Collaborations', to: '/dashboard?tab=incoming', icon: Users },
    { label: 'Projects', to: '/projects', icon: FolderGit2, badge: 'Soon' },
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
      count: unreadNotificationsCount,
    },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-surface-border bg-surface-white transition-all duration-300 ease-in-out shrink-0 select-none z-30',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-surface-border">
        <Link
          to="/dashboard"
          className={cn(
            'flex items-center gap-3 overflow-hidden transition-all',
            isCollapsed && 'justify-center w-full'
          )}
          title="IDEORA Workspace"
        >
          <div className="text-brand-royal shrink-0">
            <IdeoraLogo size={32} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-light tracking-tight text-typography-navy font-heading">
                IDEORA
              </span>
              <span className="text-[10px] font-semibold text-typography-muted -mt-0.5 tracking-wider uppercase">
                Collaboration Platform
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Primary Action Button */}
      <div className="p-3 border-b border-surface-border/60">
        <Link
          to="/ideas/new"
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl bg-brand-royal text-white font-semibold text-xs shadow-sm hover:bg-brand-deep transition-all duration-200 shadow-brand-royal/15',
            isCollapsed ? 'h-10 w-10 p-0 mx-auto' : 'w-full py-2.5 px-3'
          )}
          title="Publish an Idea"
        >
          <PlusCircle className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Publish an Idea</span>}
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150',
                isCollapsed && 'justify-center px-0 h-10 w-10 mx-auto',
                isActive
                  ? 'bg-brand-ice text-brand-royal border border-brand-pale font-semibold shadow-sm'
                  : 'text-typography-slate hover:bg-surface-light hover:text-typography-navy'
              )
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
            {!isCollapsed && (
              <span className="truncate flex-1 font-medium">{item.label}</span>
            )}
            {!isCollapsed && Boolean(item.count && item.count > 0) && (
              <span className="inline-flex items-center justify-center rounded-full bg-brand-royal px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0">
                {item.count}
              </span>
            )}
            {!isCollapsed && item.badge && (
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-surface-light text-typography-muted">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Profile Summary & Collapse Toggle */}
      <div className="border-t border-surface-border p-3 space-y-2">
        {/* User Card */}
        {profile && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl p-2 bg-surface-soft border border-surface-border/60 transition-all',
              isCollapsed && 'justify-center p-1.5'
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-royal text-white text-xs font-semibold shadow-sm">
              {profile.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-typography-navy truncate leading-tight">
                  {profile.full_name}
                </p>
                <p className="text-[10px] text-typography-muted truncate capitalize">
                  {profile.role || 'Collaborator'}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1 rounded-lg text-typography-muted hover:text-functional-error hover:bg-functional-error-light transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Collapse Sidebar Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold text-typography-muted hover:text-typography-navy hover:bg-surface-light transition-colors',
            isCollapsed && 'px-0'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[11px]">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

