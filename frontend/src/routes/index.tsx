import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { AuthPage } from '@/pages/AuthPage';
import { CreateIdeaPage } from '@/pages/CreateIdeaPage';
import { IdeaDetailPage } from '@/pages/IdeaDetailPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Dedicated Standalone Auth Page (No Header, No Footer) */}
      <Route path="/auth" element={<AuthPage />} />

      {/* 2. Public Marketing and Discovery Routes wrapped in MainLayout (Navbar + Footer) */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="ideas/new" element={<CreateIdeaPage />} />
        <Route path="ideas/:slug" element={<IdeaDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
      </Route>

      {/* 2. Authenticated App Workspace wrapped in DashboardLayout (Desktop Left Sidebar + Mobile Fixed Bottom Nav) */}
      <Route path="/dashboard" element={<DashboardLayout title="Workspace Overview" breadcrumb="Overview" />}>
        <Route index element={<DashboardPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route element={<MainLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
