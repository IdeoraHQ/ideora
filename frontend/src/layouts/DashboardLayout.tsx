import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { DashboardHeader } from '@/components/navigation/DashboardHeader';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { useAuth } from '@/context/AuthContext';
import { SeoHead } from '@/components/seo/SeoHead';
import { fetchUnreadNotificationsCount, fetchTotalUnreadMessagesCount } from '@/services/api';

interface DashboardLayoutProps {
  title?: string;
  breadcrumb?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  breadcrumb = 'Workspace',
}) => {
  const { isAuthenticated, profile } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setUnreadMessagesCount(0);
      return;
    }

    const checkUnread = async () => {
      const [notifCount, msgCount] = await Promise.all([
        fetchUnreadNotificationsCount(),
        fetchTotalUnreadMessagesCount(),
      ]);
      setUnreadCount(notifCount);
      setUnreadMessagesCount(msgCount);
    };

    void checkUnread();
  }, [isAuthenticated, profile?.id, location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-soft text-typography-charcoal font-sans">
      <SeoHead
        title={title ? `${title} | Ideora` : 'Workspace | Ideora'}
        description="Private Ideora builder workspace for managing ideas, collaborations, messages, and account settings."
        canonicalPath={location.pathname}
        noindex
      />
      {/* 1. Desktop Persistent Left Sidebar (Hidden on mobile <768px) */}
      <DesktopSidebar
        unreadNotificationsCount={unreadCount}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* 2. Main Application Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <DashboardHeader
          title={title}
          breadcrumb={breadcrumb}
          unreadMessagesCount={unreadMessagesCount}
        />

        {/* Scrollable Main Viewport (pb-24 ensures mobile content never hides behind bottom nav) */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-28 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* 3. Mobile Fixed Bottom Navigation (Strictly 5 destinations, hidden on >=768px desktop) */}
      <MobileBottomNav unreadCount={unreadCount} />
    </div>
  );
};

