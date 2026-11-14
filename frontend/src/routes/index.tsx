import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { PeoplePage } from '@/pages/PeoplePage';
import { AboutPage } from '@/pages/AboutPage';
import { AuthPage } from '@/pages/AuthPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { CreateIdeaPage } from '@/pages/CreateIdeaPage';
import { IdeaDetailPage } from '@/pages/IdeaDetailPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminFeedbackPage } from '@/pages/admin/AdminFeedbackPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminIdeasPage } from '@/pages/admin/AdminIdeasPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminProjectsPage } from '@/pages/admin/AdminProjectsPage';
import { AdminAuditLogsPage } from '@/pages/admin/AdminAuditLogsPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { FeedbackPage } from '@/pages/FeedbackPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/pages/TermsOfServicePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Dedicated Standalone Authentication & Account Security Pages */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* 2. Public Marketing and Discovery Routes wrapped in MainLayout (Navbar + Footer) */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="ideas/new" element={<CreateIdeaPage />} />
        <Route path="ideas/:slug" element={<IdeaDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsOfServicePage />} />
      </Route>

      {/* 3. Authenticated App Workspace wrapped in DashboardLayout (Desktop Left Sidebar + Mobile Fixed Bottom Nav) */}
      <Route path="/dashboard" element={<DashboardLayout title="Workspace Overview" breadcrumb="Overview" />}>
        <Route index element={<DashboardPage />} />
      </Route>

      {/* 4. Notifications Center */}
      <Route path="/notifications" element={<DashboardLayout title="Notifications Center" breadcrumb="Notifications" />}>
        <Route index element={<NotificationsPage />} />
      </Route>

      {/* 5. Direct Messaging Workspace */}
      <Route path="/messages" element={<DashboardLayout title="Direct Messages" breadcrumb="Messages" />}>
        <Route index element={<MessagesPage />} />
      </Route>

      {/* 6. Projects Hub & Individual Project Workspaces */}
      <Route path="/projects" element={<DashboardLayout title="Projects Hub" breadcrumb="Projects" />}>
        <Route index element={<ProjectsPage />} />
      </Route>
      <Route path="/projects/:id" element={<DashboardLayout title="Project Workspace" breadcrumb="Projects" />}>
        <Route index element={<ProjectDetailPage />} />
      </Route>

      {/* 7. Feedback Center */}
      <Route path="/feedback" element={<DashboardLayout title="Feedback Center" breadcrumb="Feedback" />}>
        <Route index element={<FeedbackPage />} />
      </Route>

      {/* 8. User Settings */}
      <Route path="/settings" element={<DashboardLayout title="Account Settings" breadcrumb="Settings" />}>
        <Route index element={<SettingsPage />} />
      </Route>

      {/* Protected Admin Control Center */}
      <Route path="/admin" element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="feedback" element={<AdminFeedbackPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="ideas" element={<AdminIdeasPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route element={<MainLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
