# IDEORA — Comprehensive "Coming Soon" & Unfinished Feature Audit

**Document:** `IDEORA_COMING_SOON_FEATURE_AUDIT.md`  
**Audit Date:** November 10, 2026  
**Auditor:** Antigravity AI Pair Programmer  
**Repository:** `ideora` (React + Vite + Tailwind CSS + Supabase)  
**Inspection Type:** Full-Scope Non-Invasive Audit (Read-Only)

---

## 1. Executive Summary

A comprehensive, non-invasive code audit was conducted across the entire IDEORA codebase to identify all features, pages, navigation items, cards, menu controls, and database capabilities that are currently marked as **"Coming Soon"**, disabled, incomplete, missing backend integration, or represented by placeholder/mock states.

### Key Audit Findings:
1. **Explicit "Soon" Badges & Dead Navigation Links**:
   - The desktop navigation sidebar explicitly tags **`Projects`** (`/projects`) and **`Messages`** (`/messages`) with a `"Soon"` badge.
   - Crucially, neither route exists in the React router (`AppRoutes.tsx`). Clicking either item immediately throws users to the generic 404 **NotFoundPage**.
   - Two additional top-level sidebar items—**`Notifications`** (`/notifications`) and **`Settings`** (`/settings`)—also lack route definitions and produce 404 errors when clicked.
2. **Disconnected Supabase Storage**:
   - The Supabase database migrations define and configure two public storage buckets (`avatars` and `idea-attachments`) with full Row Level Security (RLS) policies.
   - However, the frontend has **zero** file upload UI. Profile avatar editing is limited to text fields, and idea creation has no attachment uploader.
3. **Hardcoded Metrics & Static Placeholders**:
   - On public profiles, the **"Commitment Score"** is hardcoded to a static `"100%"`, and the **"Verified Builder"** badge is permanently displayed for all users without an underlying verification table or admin flag.
   - On the Idea Details page, the **Development Roadmap** visually illustrates a 5-stage progression, but milestones are hardcoded and step progression is simply derived from the idea's coarse status (`seeking_collaborators`, `in_progress`, `launched`).
4. **Backend Readiness vs. Frontend Gap**:
   - Several major features already have robust, security-hardened database foundations (e.g., `notifications`, `idea_comments`, `collaboration_requests`, and `idea_upvotes` atomic RPCs), but are missing dedicated full-page views, real-time Supabase subscriptions, or account configuration screens.

---

## 2. Complete Inventory of Unfinished & Placeholder Features

The table below catalogs every identified feature, broken interaction, placeholder, and incomplete workflow across the IDEORA application.

| Feature Name | Application Location | Current State | Intended Functionality | Frontend Status | Backend Status | Database Requirements | Dependencies | Complexity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Projects Workspace** | Desktop Sidebar (`DesktopSidebar.tsx:42`) | **Coming Soon / Broken Link** (Badge: "Soon", links to `/projects`) | Dedicated hub for accepted teams, code repos, milestones, and build tracking. | Missing (`/projects` route renders 404) | Missing | Missing `projects`, `project_members`, `milestones` tables | Collaboration Requests (Accepted status) | High | Critical |
| **Direct Messaging** | Desktop Sidebar (`DesktopSidebar.tsx:43`) | **Coming Soon / Broken Link** (Badge: "Soon", links to `/messages`) | 1-on-1 and team chat between collaborators and founders. | Missing (`/messages` route renders 404) | Missing | Missing `conversations`, `messages` tables | User Auth, Profiles | High | High |
| **Notifications Center** | Desktop Sidebar (`DesktopSidebar.tsx:45`) | **Partially Implemented / Broken Link** | Full-screen notification inbox to manage, filter, and archive notifications. | Partial (Dropdown popover exists; `/notifications` page 404s) | Complete (`notifications` table & trigger policies exist) | Existing table: `public.notifications` | Auth Context | Low | High |
| **Account Settings** | Desktop Sidebar (`DesktopSidebar.tsx:50`) | **Broken Link** (links to `/settings`) | Manage account credentials, email preferences, connected accounts, and data export. | Missing (`/settings` route renders 404) | Partial (Supabase auth manages email/pass) | Missing `user_settings` / `preferences` table | Auth Context | Medium | Medium |
| **Mobile "Activity" Hub** | Mobile Bottom Nav (`MobileBottomNav.tsx:47`) | **Misleading Navigation** | Mobile activity stream for collaboration updates and alerts. | Partial (Redirects to `/dashboard?tab=incoming` instead of activity) | Complete (Notifications exist in DB) | Existing table: `public.notifications` | Notifications | Low | Medium |
| **Profile Avatar Upload** | Profile Page (`ProfilePage.tsx:295`) | **Missing UI / Placeholder** | Allow builders to upload custom profile pictures. | Missing (No file picker, fallback to first letter) | Complete (Bucket `avatars` with RLS exists) | Existing bucket: `storage.buckets/avatars` | Profiles API | Low | Medium |
| **Idea Attachments / Pitch Decks** | Create Idea Page (`CreateIdeaPage.tsx`) | **Missing UI** | Upload PDF specs, pitch decks, wireframes, and architecture diagrams. | Missing (No file upload input in submission form) | Complete (Bucket `idea-attachments` exists) | Existing bucket: `storage.buckets/idea-attachments` | Ideas API | Medium | High |
| **Save Idea as Draft** | Create Idea Page (`CreateIdeaPage.tsx:166`) | **Partially Implemented** | Save in-progress concept drafts privately before public publishing. | Partial (Logic supports `status: draft`, but UI button is missing) | Complete (`ideas.status = 'draft'` supported) | Existing table: `public.ideas` | Ideas API | Low | High |
| **Custom Milestones & Roadmap** | Idea Details Page (`IdeaDetailPage.tsx:805`) | **Static Mock** | Founder customizes milestone dates, deliverables, and completion status. | Mock (Hardcoded 5 milestones derived from idea status) | Missing | Missing `idea_milestones` table | Idea Details | Medium | Medium |
| **Custom Ownership Terms** | Idea Details Page (`IdeaDetailPage.tsx:929`) | **Placeholder Text** | Founder specifies exact equity split, open-source license, or IP terms. | Placeholder (Hardcoded "Not specified (Default Creator Retention)") | Missing (No column on `ideas` table) | Missing column `ideas.ownership_terms` or license enum | Create Idea Form | Low | High |
| **Structured Breakdown Fields** | Idea Details Page (`IdeaDetailPage.tsx:609`) | **Template Placeholder** | Separate problem, solution, target audience, and expected impact fields. | Template (Synthesized from `summary` and `category`) | Missing (Only `summary` & `description` exist) | Missing columns `target_audience`, `expected_impact` | Create Idea Form | Low | Medium |
| **Verified Builder Status** | Profile Page (`ProfilePage.tsx:319`) | **Misleading Static Badge** | Verification of builder credentials, GitHub activity, or past launches. | Mock (Hardcoded "Verified Builder" pill for every user) | Missing | Missing column `profiles.is_verified` | Admin / GitHub OAuth | Low | Low |
| **Commitment Score** | Profile Page (`ProfilePage.tsx:480`) | **Static Mock** | Reputation metric based on accepted collaboration completion rate. | Mock (Hardcoded "100%" string) | Missing | Requires audit / completion analytics | Collaboration History | High | Low |
| **Joined Projects on Profile** | Profile Page (`ProfilePage.tsx:642`) | **Incomplete View** | Showcase initiatives where the user is an accepted collaborator, not just creator. | Missing (Only renders ideas where `creator_id = user.id`) | Complete (`collaboration_requests` with status `accepted`) | Existing table: `public.collaboration_requests` | Profiles API | Low | High |
| **Forgot Password / Recovery** | Auth Page (`AuthPage.tsx`) | **Missing Functionality** | Password reset email workflow. | Missing (No "Forgot password?" link or modal) | Complete (Supabase `auth.resetPasswordForEmail` ready) | Supabase Auth builtin | Auth Context | Low | High |
| **Realtime Updates** | Application-wide | **Missing Implementation** | Instant push notifications, live chat, and collaborator alerts without polling. | Missing (Zero WebSocket/Realtime subscriptions in frontend) | Partial (Supabase Realtime available on server) | Supabase Realtime publication setup | Supabase Client | Medium | Medium |
| **Server-Side Pagination** | Explore Page (`ExplorePage.tsx:46`) | **Incomplete Data Pipeline** | Paginated or infinite-scroll fetching of initiatives. | Missing (Loads all ideas into browser memory at once) | Supported (Supabase `.range(from, to)`) | Existing table: `public.ideas` | Explore State | Medium | Medium |
| **Footer External Links** | Footer (`Footer.tsx:28-60`) | **Generic Placeholders** | Direct links to official IDEORA Discord, Twitter/X, and LinkedIn. | Placeholder (Links point to generic `https://x.com`, `discord.com`, etc.) | N/A (Static config) | None | Project Setup | Low | Low |

---

## 3. Frontend Implementation Status

### 3.1 Routing & Navigation Architecture
- **Active Routes** (Defined in `AppRoutes.tsx`):
  - `/` (Home / Landing Page)
  - `/auth` (Dedicated Standalone Authentication)
  - `/explore` (Idea Discovery & Filtering)
  - `/ideas/new` (Publish Concept Form)
  - `/ideas/:slug` (Idea Details & Collaboration Hub)
  - `/dashboard` (Workspace Overview, My Ideas, Incoming/Sent Requests)
  - `/profile` & `/profile/:username` (Builder Profile)
  - `*` (404 Fallback)
- **Dead Navigation Targets** (Linked in UI but lacking route definitions):
  - `/projects` (Triggered from `DesktopSidebar.tsx:42`) &rarr; **404**
  - `/messages` (Triggered from `DesktopSidebar.tsx:43`) &rarr; **404**
  - `/notifications` (Triggered from `DesktopSidebar.tsx:45`) &rarr; **404**
  - `/settings` (Triggered from `DesktopSidebar.tsx:50`) &rarr; **404**

### 3.2 State Management & User Feedback
- **Forms and Mutations**:
  - `CreateIdeaPage`: Validation, error alerts, and redirect on submit are fully operational.
  - `IdeaDetailPage`: Collaboration request modal, status dropdown, idea editing modal, and comment submission are fully operational with clear validation and error states.
  - `ProfilePage`: Inline editing for bio, role, skills, and links is operational.
- **Empty States**:
  - Empty states are thoroughly implemented on Explore, Dashboard (My Ideas, Incoming Requests, Sent Applications, Recommended Ideas), and Profile.
- **Mobile Safe Areas & Layout Safeguards**:
  - Mobile bottom navigation includes fixed-height clearance (`pb-28`) and CSS `env(safe-area-inset-bottom)` accounting.
  - Word-break rules (`break-all` and `[word-break:break-all]`) prevent layout shifts from long titles or URLs.

---

## 4. Backend & Database Readiness

Inspection of the Supabase configuration and database migrations (`backend/supabase/migrations/`) reveals the following backend readiness:

### 4.1 Implemented & Hardened Tables
1. **`public.profiles`**: Full schema with automatic user provisioning trigger on `auth.users` insert.
2. **`public.ideas`**: Stores title, slug, summary, description, category, status, collaboration_type, tags, upvotes_count, collaborators_count.
   - Protected by `trg_protect_idea_counters` to prevent direct client counter spoofing.
3. **`public.idea_roles_needed`**: Manages open seats, role categories, and filled status.
4. **`public.collaboration_requests`**: Supports `pending`, `accepted`, `declined`, `withdrawn` states.
   - Trigger `handle_collaboration_request_workflow` automatically increments/decrements `collaborators_count` and dispatches automated notifications.
5. **`public.idea_upvotes`**: Enforces unique `(idea_id, user_id)` constraint.
   - Managed atomically via `toggle_idea_upvote_secure` RPC function.
6. **`public.notifications`**: Automated dispatch upon upvotes, comments, request submissions, acceptances, and declines.
7. **`public.idea_comments`**: Architecture discussions with parent/child discussion support.
8. **`public.user_action_audit`**: Anti-abuse security audit log tracking user mutations and IP addresses.

### 4.2 Implemented Storage Buckets
- **`avatars`**: Configured as public read with owner-scoped `storage.objects` upload and update policies.
- **`idea-attachments`**: Configured as public read with authenticated upload policies.
- *Status*: Both buckets are configured in the database, but completely disconnected from the client frontend.

### 4.3 Missing Backend Schemas
- **Projects / Team Workspaces**: No tables for repository URLs, sprint tasks, shared notes, or team rosters once an application is accepted.
- **Direct Messaging**: No tables for peer-to-peer or group messaging.
- **Custom Roadmaps / Milestones**: No `idea_milestones` table.
- **User Settings**: No table for user preferences (email digests, dark mode, visibility toggles).

---

## 5. Broken or Misleading Interactions

1. **Sidebar 404 Links**:
   - Clicking **Projects**, **Messages**, **Notifications**, or **Settings** in the desktop sidebar displays the 404 "Page Not Found" screen.
   - *Impact*: High user confusion. Users expect either a functional page or a modal explaining that the feature is in preview.
2. **Misleading Static Profile Badges**:
   - Every builder displays a **"Verified Builder"** badge and a **"100% Commitment Score"**.
   - *Impact*: False signal of trust. Users may rely on this verification metric when deciding whether to collaborate or share proprietary concepts.
3. **Missing "Save Draft" Trigger**:
   - The idea creation API accepts `status = 'draft'`, but the UI form only has a single "Publish Initiative" button that immediately publishes with `status = 'seeking_collaborators'`.
   - *Impact*: Founders cannot draft concepts incrementally or save work in progress.
4. **Avatar Upload Invisibility**:
   - The user profile displays an avatar circle, but clicking "Edit Profile" provides no method to upload an image. Only users who authenticated via GitHub have an avatar (synced from GitHub OAuth metadata).
5. **Absence of Password Recovery**:
   - The sign-in form provides no "Forgot Password?" link. A user who forgets their password has no self-serve recovery option.

---

## 6. Prioritized Implementation Roadmap

The identified features have been categorized into 4 execution phases based on business value, technical dependencies, and implementation complexity.

```
+-------------------------------------------------------------------------+
| Phase 1: Core Functional Completeness                                    |
| - Notifications Page (/notifications)                                   |
| - Password Reset & Recovery (/auth/reset-password)                      |
| - Save Idea Drafts & Status Filtering                                   |
| - Profile Avatar & Idea Attachment Uploads                              |
| - Custom Ownership & IP Terms on Ideas                                  |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| Phase 2: Collaboration & Project Workspaces                             |
| - Project Workspaces Hub (/projects & /projects/:id)                    |
| - Display Joined Collaborations on Profiles                             |
| - Custom Idea Roadmaps & Milestones                                     |
| - Mobile Activity Stream                                                |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| Phase 3: Communication & Account Management                             |
| - Direct Messaging & Team Chat (/messages)                              |
| - Account Settings & Preferences (/settings)                            |
| - Server-Side Pagination & Infinite Scroll on Explore                   |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
| Phase 4: Advanced Platform Enhancements                                 |
| - Supabase Realtime Live Subscriptions                                  |
| - Verified Builder Workflow & Reputation Scoring                        |
| - Markdown Rich Text Editor for Concept Descriptions                    |
+-------------------------------------------------------------------------+
```

### Phase 1 — Core Functionality (Immediate)
*Focus: Eliminate dead 404 links, complete existing half-integrated features, and enable file storage.*
1. **Notifications Full Page (`/notifications`)**:
   - Create dedicated view to browse, filter, and mark all alerts as read.
   - Eliminates sidebar 404 error.
   - *Dependencies*: Existing `public.notifications` table.
2. **Password Reset Flow**:
   - Add "Forgot Password?" trigger on `/auth` and implement recovery callback.
   - *Dependencies*: Supabase Auth.
3. **Avatar & Idea Attachment Upload**:
   - Integrate file picker in `ProfilePage` and `CreateIdeaPage` connected to the existing `avatars` and `idea-attachments` Supabase storage buckets.
4. **Draft Concept Saving**:
   - Add a secondary "Save Draft" button to `CreateIdeaPage` and a Drafts filter in Dashboard "My Ideas".
5. **Ownership & Licensing Selection**:
   - Add a structured license/terms selector on `CreateIdeaPage` (e.g., MIT, Apache 2.0, Commercial Equity Split, Proprietary Retention) and store on the idea.

### Phase 2 — Collaboration and Project Workspaces
*Focus: Provide teams with a collaborative workspace once applications are accepted.*
1. **Projects Hub (`/projects` & `/projects/:id`)**:
   - Replace the sidebar "Soon" badge with a functional Project Dashboard.
   - Renders initiatives where the user is either the creator or an accepted collaborator.
   - Includes repository links, meeting links, and team rosters.
2. **Joined Projects on Public Profile**:
   - Add a "Collaborating On" section to `ProfilePage` showcasing accepted projects.
3. **Custom Milestones**:
   - Allow creators to define structured milestones with deliverables and completion toggles.
4. **Dedicated Mobile Activity Hub**:
   - Point the mobile "Activity" tab to a clean notification and request feed.

### Phase 3 — User Experience, Messaging & Account Management
*Focus: Direct communication and user settings.*
1. **Direct Messaging (`/messages`)**:
   - Introduce `conversations` and `messages` tables.
   - Provide direct messaging between founders and applicants before or after accepting applications.
2. **Account Settings (`/settings`)**:
   - Account deletion, password update, email notification settings.
3. **Explore Page Server-Side Pagination**:
   - Implement cursor or range-based pagination on `fetchPublishedIdeas`.

### Phase 4 — Advanced Platform Enhancements
*Focus: Optional optimizations and automated trust systems.*
1. **Supabase Realtime Channels**:
   - Push live notifications and comment updates without page reloads.
2. **Dynamic Commitment & Verification Scoring**:
   - Replace hardcoded "100%" and "Verified Builder" pills with algorithmic activity tracking.
3. **Rich Text / Markdown Editor**:
   - Enhanced formatting and live preview for concept briefs.

---

## 7. Recommended Next Feature to Implement

### Recommendation: **Full Notifications Page (`/notifications`) + Password Recovery**

#### Why this should be tackled first:
1. **Zero Database Migrations Required**: The backend `public.notifications` table, RLS policies, unread tracking, and automated triggers are **100% complete and working**.
2. **Immediate UX Fix**: Eliminates the prominent 404 error triggered when clicking "Notifications" in the desktop sidebar.
3. **High Return on Effort**: Takes minimal development effort (Low Complexity) while directly addressing user engagement and trust.
4. **Mobile Alignment**: Provides the exact view needed to back the mobile bottom navigation's "Activity" tab.

---

## 8. Files and Components Inspected

### Source Files Inspected:
- **Routing & Layouts**:
  - `frontend/src/App.tsx`
  - `frontend/src/routes/index.tsx`
  - `frontend/src/layouts/DashboardLayout.tsx`
  - `frontend/src/layouts/MainLayout.tsx`
- **Navigation & Chrome**:
  - `frontend/src/components/navigation/DesktopSidebar.tsx`
  - `frontend/src/components/navigation/MobileBottomNav.tsx`
  - `frontend/src/components/navigation/DashboardHeader.tsx`
  - `frontend/src/components/Navbar.tsx`
  - `frontend/src/components/Footer.tsx`
  - `frontend/src/components/IdeoraLogo.tsx`
- **Pages**:
  - `frontend/src/pages/HomePage.tsx`
  - `frontend/src/pages/ExplorePage.tsx`
  - `frontend/src/pages/CreateIdeaPage.tsx`
  - `frontend/src/pages/IdeaDetailPage.tsx`
  - `frontend/src/pages/DashboardPage.tsx`
  - `frontend/src/pages/ProfilePage.tsx`
  - `frontend/src/pages/AuthPage.tsx`
  - `frontend/src/pages/NotFoundPage.tsx`
- **Dashboard Components**:
  - `frontend/src/components/dashboard/WelcomeSection.tsx`
  - `frontend/src/components/dashboard/StatsOverview.tsx`
  - `frontend/src/components/dashboard/RecentIdeas.tsx`
  - `frontend/src/components/dashboard/CollaborationRequests.tsx`
  - `frontend/src/components/dashboard/ActiveCollaborations.tsx`
  - `frontend/src/components/dashboard/QuickActions.tsx`
- **Idea Components**:
  - `frontend/src/components/ideas/IdeaCard.tsx`
  - `frontend/src/components/ideas/IdeaGrid.tsx`
  - `frontend/src/components/ideas/IdeaFilters.tsx`
  - `frontend/src/components/ideas/IdeaSearch.tsx`
  - `frontend/src/components/ideas/IdeaDiscoveryShortcuts.tsx`
  - `frontend/src/components/ideas/IdeaFilterDrawer.tsx`
- **API & Data Services**:
  - `frontend/src/services/api/ideas.ts`
  - `frontend/src/services/api/collaborations.ts`
  - `frontend/src/services/api/notifications.ts`
  - `frontend/src/services/api/profiles.ts`
  - `frontend/src/services/api/auth.ts`
  - `frontend/src/services/supabase/client.ts`
- **Backend Migrations**:
  - `backend/supabase/migrations/20261102000001_initial_schema.sql`
  - `backend/supabase/migrations/20261107000002_workflow_triggers_and_comments.sql`
  - `backend/supabase/migrations/20261108000003_backend_security_hardening.sql`

