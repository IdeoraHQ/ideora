import React from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { DashboardHeader } from '@/components/navigation/DashboardHeader';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';

interface DashboardLayoutProps {
  title?: string;
  breadcrumb?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  breadcrumb = 'Workspace',
}) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-soft text-typography-charcoal font-sans">
      {/* 1. Desktop Persistent Left Sidebar (Hidden on mobile <768px) */}
      <DesktopSidebar />

      {/* 2. Main Application Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <DashboardHeader title={title} breadcrumb={breadcrumb} />

        {/* Scrollable Main Viewport (pb-24 ensures mobile content never hides behind bottom nav) */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-28 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* 3. Mobile Fixed Bottom Navigation (Strictly 5 destinations, hidden on >=768px desktop) */}
      <MobileBottomNav />
    </div>
  );
};

