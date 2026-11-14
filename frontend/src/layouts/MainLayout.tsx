import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-surface-soft text-typography-charcoal pb-16 md:pb-0">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};
