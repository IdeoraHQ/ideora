# IDEORA — Project Architecture & Collaboration Guide

> **Audience**: Frontend Collaborator / Co-Founder  
> **Repository Layout**: Clean separation into `frontend/`, `backend/`, and `DOCS/`.  
> - **Backend Team**: Supabase migrations, PostgreSQL schemas, Row Level Security (RLS) policies, database triggers, storage buckets, and core data contracts.  
> - **Frontend Developer**: UI/UX design, client components, forms, validation, routing, responsive design, user experience, and real-time state consumption.  

---

## 1. Project Purpose & Vision

**IDEORA** is a collaborative ecosystem designed for founders, software engineers, designers, and creators:
> **"Where unfinished ideas meet the people who build them."**

Countless visionary concepts die in private notes apps because solo founders lack either technical execution, UI/UX design, or domain expertise. IDEORA enables founders to publish early-stage concepts, define the exact contributor roles they need (e.g. Founding Frontend Engineer, UI/UX Designer, AI Specialist), and allows builders to discover and apply to co-found or contribute to those ideas.

---

## 2. Directory Structure

The repository is organized into three primary folders:

```text
ideora/
├── backend/                   # Database schemas, migrations & backend logic
│   └── supabase/
│       └── migrations/
│           ├── 20261102000001_initial_schema.sql
│           └── 20261107000002_workflow_triggers_and_comments.sql
│
├── frontend/                  # React 18 + TypeScript + Vite + Tailwind CSS app
│   ├── public/                # Static assets (favicons, robots.txt)
│   ├── src/
│   │   ├── assets/            # Branding graphics & SVGs
│   │   ├── components/        # Global layout components (Navbar, Footer, IdeoraLogo)
│   │   ├── context/           # React Context (AuthContext)
│   │   ├── features/          # Domain presentation features (IdeaCard)
│   │   ├── hooks/             # Custom React hooks (useSupabaseStatus)
│   │   ├── layouts/           # Page layouts (MainLayout)
│   │   ├── pages/             # Route-level views (Home, Explore, Auth, CreateIdea, IdeaDetail, Dashboard, Profile)
│   │   ├── routes/            # Client routing declarations (AppRoutes)
│   │   ├── services/          # Backend communication layer
│   │   │   ├── api/           # Typed Supabase API calls (auth, ideas, collaborations, profiles, notifications)
│   │   │   └── supabase/      # Supabase client setup
│   │   ├── types/             # TypeScript database schemas & domain interfaces
│   │   ├── utils/             # Helper utilities (cn for Tailwind class merging)
│   │   ├── App.tsx            # App root
│   │   └── main.tsx           # Entry point
│   ├── package.json           # Frontend dependencies & build scripts
│   ├── vite.config.ts         # Vite bundler configuration
│   ├── tailwind.config.js     # Brand design system tokens
│   └── .env.example           # Environment template
│
├── DOCS/                      # Technical specifications & documentation
│   ├── BACKEND_ARCHITECTURE.md
│   └── ...
│
├── README.md                  # Project overview
└── STRUCTURE.md               # Main developer onboarding guide
```

---

## 3. Git Workflow: Pushing to Your Own Branch (`frontend`)

To maintain stability and prevent conflicts with the backend team:

### ⚠️ Never push directly to `main`
Always work on your dedicated branch named `frontend`.

### Step-by-Step Git Commands:

1. **Clone the repository (if starting fresh)**:
   ```bash
   git clone https://github.com/IdeoraHQ/ideora.git
   cd ideora
   ```

2. **Checkout or switch to your branch (`frontend`)**:
   ```bash
   # If creating the branch for the first time:
   git checkout -b frontend

   # If the branch already exists on remote:
   git checkout frontend
   git pull origin frontend
   ```

3. **Make your changes inside `frontend/`**:
   - Write your components, pages, styles, and tests.

4. **Verify quality gates before committing**:
   ```bash
   cd frontend
   npm run typecheck   # Validates TypeScript types (tsc -b --noEmit)
   npm run lint        # Runs ESLint to ensure clean syntax
   npm run build       # Verifies that production build compiles cleanly
   cd ..
   ```

5. **Stage and commit your changes**:
   ```bash
   git add frontend/
   git commit -m "feat(frontend): describe your changes clearly"
   ```

6. **Push to your `frontend` branch**:
   ```bash
   git push -u origin frontend
   ```

7. **Create a Pull Request (PR)**:
   - On GitHub, open a Pull Request from `frontend` into `main`.
   - The backend team will review and merge it.

---

## 4. Strict Development Rules

### ⚠️ Rule 1: NO HARDCODED DATA OR CREDENTIALS
- **Do not hardcode mock users, mock ideas, static lists, demo login buttons, or fake authentication states** anywhere in the pages or components.
- **Do not hardcode secrets or URLs**. All environment configuration comes strictly from environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- All data must flow dynamically from the backend through the services layer (`src/services/api/*`) or the `useAuth()` context (`src/context/AuthContext.tsx`).

### Rule 2: Separation of Concerns
- The backend team maintains the database queries, schemas, and API functions.
- If you need a new data query, a new relational join, or a new database table, coordinate with the backend team or check the typed data layer in `src/types/` and `src/services/api/`.

### Rule 3: Quality Gates
Always make sure `npm run typecheck` and `npm run build` pass before pushing to GitHub.

---

## 5. Technology Stack & Tooling

- **Framework**: [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Bundler & Build Tool**: [Vite 6](https://vite.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + PostCSS + Autoprefixer
- **Icons**: [Lucide React](https://lucide.dev/)
- **Client Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Backend / Authentication / Database**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
- **Code Quality**: ESLint 9 (Flat Config) + Prettier

---

## 6. GitHub OAuth & Callback URI Configuration

To enable **GitHub Sign-In / Sign-Up**:

### 1. In GitHub Developer Settings
1. Go to **GitHub Settings** > **Developer Settings** > **OAuth Apps** > **New OAuth App**.
2. Fill in:
   - **Application name**: `IDEORA`
   - **Homepage URL**: `http://localhost:5173` (or your production domain e.g. `https://ideora.vercel.app`)
   - **Authorization callback URL**:
     ```text
     https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
     ```
     *(Replace `<YOUR-PROJECT-REF>` with your Supabase project ID found in your Supabase dashboard URL).*

### 2. In Supabase Dashboard
1. Go to **Authentication** > **Providers** > **GitHub**.
2. Enable GitHub.
3. Paste the **Client ID** and **Client Secret** generated by GitHub.
4. Under **URL Configuration**, add your frontend redirect URLs:
   - `http://localhost:5173/**`
   - `https://your-production-domain.com/**`

---

## 7. Pages & Functions to Build / Maintain

### 1. Landing Page (`src/pages/HomePage.tsx` — `/`)
- **Hero Section**: Slogan, headline, clear value proposition, and Call to Action buttons leading to `/explore` and `/ideas/new`.
- **Value Proposition Highlights**: 3-pillar feature breakdown explaining how IDEORA helps founders find co-founders.
- **Trending Ideas Grid**: Fetches real trending ideas dynamically via `fetchPublishedIdeas({ sortBy: 'trending' })`.
- **Upvoting Action**: Allows users to dynamically upvote/downvote ideas from cards using `toggleIdeaUpvote(ideaId)`.

### 2. Discovery & Search Page (`src/pages/ExplorePage.tsx` — `/explore`)
- **Search Bar**: Debounced or interactive keyword filtering across titles, summaries, tags, and problem statements.
- **Role Category Filters**: Quick pills allowing builders to find ideas needing `'frontend' | 'backend' | 'design' | 'fullstack' | 'ai' | 'marketing'`.
- **Collaboration Model Filter**: Filter by `'co_founder' | 'contributor' | 'open_source' | 'advisor'`.
- **Sort Switcher**: Toggle between `Trending` (highest upvotes) and `Newest`.
- **Empty States**: Friendly, branded empty state when no ideas match filter criteria.

### 3. Authentication (`src/pages/AuthPage.tsx` — `/auth`)
- **Sign In Tab**: Email and password login via `signIn(email, password)`.
- **Sign Up Tab**: Real account creation via `signUp(payload)` capturing:
  - `email`, `password`
  - `full_name`, `username`
  - `role`: `'founder'` vs `'collaborator'`
  - `skills`: array of selected skill categories
  - `bio`
- **GitHub OAuth**: One-click sign-in button via `signInGithub()`.
- **Form Validation & Error Banners**: Display server-side auth errors (e.g. invalid password, taken username).

### 4. Idea Submission & Editor (`src/pages/CreateIdeaPage.tsx` — `/ideas/new`)
- **Protected View**: Prompts unauthenticated visitors to sign in before submitting.
- **Idea Metadata Form**:
  - `title`, `category`, `summary` (elevator pitch), `description` (markdown or multi-paragraph architecture pitch).
  - `collaboration_type`: Co-founder, Contributor, Open Source, or Advisor.
  - `tags`: Tag pill manager with input on Enter or comma.
- **Dynamic Roles Needed Builder**:
  - Allows founders to add multiple open roles needed (e.g. "Lead React Engineer", spots: 2).
  - Can remove rows or adjust spot counts.
- **Actions**:
  - `Save as Draft` (`status: 'draft'`)
  - `Publish & Recruit Builders` (`status: 'seeking_collaborators'`) via `createIdea(payload)`.

### 5. Idea Detail & Collaboration Workspace (`src/pages/IdeaDetailPage.tsx` — `/ideas/:slug`)
- **Idea Showcase**: Full title, status pill, category, description, and author card.
- **Open Roles Section**:
  - Shows each role needed, description, and seat status (`spots_filled / spots_available`).
  - **"Apply for Role" Drawer / Modal**: Allows builders to pitch their background and submit a collaboration request via `submitCollaborationRequest()`.
- **Founder Request Review Panel**:
  - Displayed **only** when the logged-in user is the creator of the idea (`profile.id === idea.creator_id`).
  - Lists applicant names, profile links, pitches, and provides 1-click **Accept** and **Decline** actions via `updateRequestStatus()`.
  - Accepting a request automatically fills role spots and triggers notifications in the database.
- **Discussion Thread**:
  - Lists comments posted on the idea.
  - Comment composer calling `createIdeaComment()`.

### 6. Builder Workspace (`src/pages/DashboardPage.tsx` — `/dashboard`)
- **Metrics Bar**: Quick summary of `My Ideas`, `Pending Incoming Requests`, `Sent Applications`, and `Total Upvotes`.
- **Tabs**:
  1. **My Ideas**: List of ideas created by the user with status dropdown (`seeking_collaborators`, `in_progress`, `launched`, `draft`, `archived`) and delete button.
  2. **Incoming Collaborator Requests**: Triage inbox for founders to review and accept/decline applications across all their ideas.
  3. **My Sent Applications**: Tracks status of applications sent to other founders (`pending`, `accepted`, `declined`) with option to withdraw.

### 7. Builder Profile (`src/pages/ProfilePage.tsx` — `/profile/:username` & `/profile`)
- **Profile Header**: Avatar initial, full name, username, role badge, bio, skills tags, and external social links (GitHub, LinkedIn, Portfolio).
- **Inline Profile Editor**: Available when viewing own profile to update bio, skills, and links via `updateCurrentProfile()`.
- **Idea Portfolio**: Grid displaying all ideas published by this builder.

---

## 8. Backend Data Contracts & Hook Cheatsheet

Import everything you need directly from `@/context/AuthContext` or `@/services/api`:

### Authentication (`useAuth`)
```typescript
import { useAuth } from '@/context/AuthContext';

const {
  profile,          // UserProfile | null
  isAuthenticated,  // boolean
  loading,          // boolean
  signIn,           // (email, password) => Promise<{ error }>
  signUp,           // (payload) => Promise<{ error }>
  signInGithub,     // () => Promise<{ error }>
  signOut,          // () => Promise<void>
  refreshProfile,   // () => Promise<void>
} = useAuth();
```

### Ideas API (`@/services/api`)
```typescript
import {
  fetchPublishedIdeas,    // ({ category, roleCategory, collaborationType, search, tag, sortBy })
  fetchIdeaBySlug,        // (slug: string)
  createIdea,             // (payload: CreateIdeaPayload)
  updateIdeaStatus,       // (ideaId: string, status: IdeaStatus)
  deleteIdea,             // (ideaId: string)
  toggleIdeaUpvote,       // (ideaId: string)
  fetchUserUpvotedIdeaIds // () => Promise<string[]>
} from '@/services/api';
```

### Collaborations API (`@/services/api`)
```typescript
import {
  submitCollaborationRequest,   // ({ idea_id, role_id, message })
  fetchIdeaRequests,            // (ideaId: string)
  fetchFounderIncomingRequests, // (founderId: string)
  fetchUserSentRequests,        // (userId: string)
  updateRequestStatus           // (requestId: string, status: 'accepted' | 'declined' | 'withdrawn')
} from '@/services/api';
```

### Notifications API (`@/services/api`)
```typescript
import {
  fetchUserNotifications,       // () => Promise<{ data, error }>
  markNotificationAsRead,       // (notificationId: string)
  markAllNotificationsAsRead    // () => Promise<{ error }>
} from '@/services/api';
```

---

## 9. Setup & Development Server

1. **Navigate to the frontend folder**:
   ```bash
   cd frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure environment variables**:
   Create `frontend/.env.local`:
   ```env
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
4. **Start local Vite development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`.
