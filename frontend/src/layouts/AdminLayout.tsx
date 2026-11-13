import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Lightbulb,
  Flag,
  FolderGit2,
  ScrollText,
  Settings,
  ShieldCheck,
  MessageSquarePlus,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { SeoHead } from '@/components/seo/SeoHead';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

interface AdminNavItem {
  label: string;
  description: string;
  to?: string;
  icon: LucideIcon;
  planned?: boolean;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: 'Overview',
    description: 'Platform statistics and activity',
    to: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Feedback',
    description: 'Feature requests & bug reports',
    to: '/admin/feedback',
    icon: MessageSquarePlus,
  },
  {
    label: 'Users',
    description: 'Accounts, roles and status',
    to: '/admin/users',
    icon: Users,
  },
  {
    label: 'Idea moderation',
    description: 'Review and manage submissions',
    to: '/admin/ideas',
    icon: Lightbulb,
  },
  {
    label: 'Reports',
    description: 'Investigate complaints',
    to: '/admin/reports',
    icon: Flag,
  },
  {
    label: 'Projects',
    description: 'Monitor collaborations',
    to: '/admin/projects',
    icon: FolderGit2,
  },
  {
    label: 'Audit logs',
    description: 'Track administrative actions',
    to: '/admin/audit-logs',
    icon: ScrollText,
  },
  {
    label: 'Settings',
    description: 'Platform configuration',
    to: '/admin/settings',
    icon: Settings,
  },
];

export const AdminLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderNavItems = (onNavigate?: () => void) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        if (item.planned || !item.to) {
          return (
            <div
              key={item.label}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl text-typography-muted/80 bg-surface-soft/50 border border-transparent select-none cursor-not-allowed"
              aria-disabled="true"
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-light text-typography-muted shrink-0">
                    Planned
                  </span>
                </div>
                <p className="text-[11px] text-typography-muted/70 truncate mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          );
        }

        return (
          <NavLink
            key={item.label}
            to={item.to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                isActive
                  ? 'bg-brand-ice text-brand-royal border border-brand-pale shadow-sm'
                  : 'text-typography-slate hover:bg-surface-light hover:text-typography-navy border border-transparent'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-semibold truncate">
                {item.label}
              </span>
              <span className="block text-[11px] text-typography-slate truncate mt-0.5">
                {item.description}
              </span>
            </div>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-soft text-typography-charcoal font-sans">
      <SeoHead
        title="Admin Control Center | Ideora"
        description="Private Ideora administrative control center."
        canonicalPath="/admin"
        noindex
      />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-68 lg:w-72 border-r border-surface-border bg-surface-white shrink-0 select-none z-30">
        <div className="flex h-16 items-center justify-between px-4 border-b border-surface-border">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="text-brand-royal shrink-0">
              <IdeoraLogo size={30} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold tracking-tight text-typography-navy font-heading">
                  IDEORA Admin
                </span>
                <ShieldCheck className="h-4 w-4 text-brand-royal" />
              </div>
              <span className="text-[10px] font-semibold text-typography-muted tracking-wider uppercase -mt-0.5">
                Control Center
              </span>
            </div>
          </Link>
        </div>

        <div className="p-3 border-b border-surface-border/60">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-surface-border bg-surface-soft text-typography-navy text-xs font-semibold hover:bg-surface-light transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Workspace</span>
          </Link>
        </div>

        {renderNavItems()}

        <div className="border-t border-surface-border p-3">
          {profile && (
            <div className="flex items-center gap-3 rounded-xl p-2 bg-surface-soft border border-surface-border/60">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover border border-surface-border"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-royal text-white text-xs font-semibold">
                  {profile.full_name?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-typography-navy truncate">
                  {profile.full_name}
                </p>
                <p className="text-[10px] text-brand-royal font-semibold uppercase tracking-wider truncate">
                  {profile.role}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-typography-muted hover:text-functional-error hover:bg-functional-error-light transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-surface-border bg-surface-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden inline-flex items-center justify-center rounded-xl border border-surface-border bg-surface-soft p-2 text-typography-navy hover:bg-surface-light"
              aria-label="Open admin navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-royal">
                IDEORA Admin Control Center
              </p>
              <h1 className="text-base sm:text-lg font-semibold text-typography-navy truncate font-heading">
                Platform Overview
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="md:hidden inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-soft px-3 py-1.5 text-xs font-semibold text-typography-navy hover:bg-surface-light"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Workspace</span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-ice border border-brand-pale px-3 py-1 text-[11px] font-semibold text-brand-royal">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Session</span>
            </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-typography-navy/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex w-72 max-w-[85vw] flex-col bg-surface-white h-full border-r border-surface-border shadow-2xl z-10">
            <div className="flex h-16 items-center justify-between px-4 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="text-brand-royal">
                  <IdeoraLogo size={26} />
                </div>
                <span className="text-base font-semibold text-typography-navy font-heading">
                  IDEORA Admin
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-typography-slate hover:bg-surface-light"
                aria-label="Close admin navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {renderNavItems(() => setMobileMenuOpen(false))}

            <div className="border-t border-surface-border p-3 space-y-2">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-surface-border bg-surface-soft text-typography-navy text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Workspace</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-functional-error/30 bg-functional-error-light/40 text-functional-error text-xs font-semibold"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

