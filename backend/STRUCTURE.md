# IDEORA — Frontend Architecture & Developer Guide

> **Audience**: Frontend Collaborator / Co-Founder  
> **Role Division**:  
> - **Backend Team**: Database schemas, Supabase migrations, Row Level Security (RLS) policies, database triggers, storage buckets, API service functions, and data types.  
> - **Frontend Developer**: UI/UX design, client components, forms, validation, routing, responsive design, user experience, and real-time state consumption.  

---

## 1. Project Purpose & Vision

**IDEORA** is a collaborative ecosystem designed for founders, software engineers, designers, and creators:
> **"Where unfinished ideas meet the people who build them."**

Countless visionary concepts die in private notes apps because solo founders lack either technical execution, UI/UX design, or domain expertise. IDEORA enables founders to publish early-stage concepts, define the exact contributor roles they need (e.g. Founding Frontend Engineer, UI/UX Designer, AI Specialist), and allows builders to discover and apply to co-found or contribute to those ideas.

---

## 2. Technology Stack & Tooling

As the frontend developer, you will be working with a modern, high-performance tech stack:

- **Framework**: [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Bundler & Build Tool**: [Vite 6](https://vite.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + PostCSS + Autoprefixer
- **Icons**: [Lucide React](https://lucide.dev/)
- **Client Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Backend / Authentication / Database**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
- **Code Quality**: ESLint 9 (Flat Config) + Prettier

---

## 3. Strict Development Rules

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
Before pushing any code or opening a PR, always run:
```bash
npm run typecheck   # Validates TypeScript types (tsc -b --noEmit)
npm run lint        # Runs ESLint to ensure clean syntax and rules
npm run build       # Verifies production Vite build compilation
```

---

## 4. Brand Palette & Design Tokens

Tailwind is already configured with IDEORA's official brand design system in `tailwind.config.js`. Use these custom classes:

| Class Prefix | Purpose | Examples |
| :--- | :--- | :--- |
| `bg-brand-royal`, `text-brand-royal` | Primary brand accent | `#2563EB` (Royal Blue) |
| `bg-brand-deep`, `hover:bg-brand-deep` | Deep interactive hover state | `#1D4ED8` |
| `bg-brand-ice`, `text-brand-ice` | Tinted pill backgrounds & light highlights | `#EFF6FF` |
| `border-brand-pale` | Subtle brand borders | `#DBEAFE` |
| `text-typography-navy` | Main headlines & titles | `#14213D` |
| `text-typography-charcoal` | Primary body text | `#1E293B` |
| `text-typography-slate` | Secondary captions, timestamps, descriptions | `#64748B` |
| `bg-surface-white` | Card and modal surface background | `#FFFFFF` |
| `bg-surface-soft` | Page body background | `#F8FAFC` |
| `border-surface-border` | Standard card and section dividing lines | `#E2E8F0` |
| `text-functional-success` | Role open / acceptance states | `#16A34A` |
| `text-functional-error` | Validation errors, decline states | `#DC2626` |
| `text-functional-warning` | Pending review alerts | `#F59E0B` |

---

## 5. Application Structure & File Tree

```text
ideora/
├── src/
│   ├── assets/              # Logo SVG and branding graphics
│   ├── components/          # Global UI components (Navbar, Footer, IdeoraLogo)
│   ├── context/             # Global React Contexts (AuthContext)
│   ├── features/            # Feature-specific components
│   │   └── ideas/components/IdeaCard.tsx
│   ├── hooks/               # Custom reusable React hooks (e.g. useSupabaseStatus)
│   ├── layouts/             # Shared wrappers (MainLayout)
│   ├── pages/               # Route-level page views (see Section 6)
│   ├── routes/              # Client route declarations (AppRoutes)
│   ├── services/            # Backend communication layer
│   │   ├── api/             # Typed API functions (auth, ideas, collaborations, profiles, notifications)
│   │   └── supabase/        # Initialized Supabase client instance
│   ├── types/               # TypeScript interfaces & database schema types
│   ├── utils/               # Helper utilities (cn for Tailwind class merging)
│   ├── App.tsx              # Root app wrapper with AuthProvider and BrowserRouter
│   ├── main.tsx             # React DOM entry point
│   └── index.css            # Global CSS & Tailwind directives
├── supabase/                # PostgreSQL schema migrations maintained by the Backend Team
├── tailwind.config.js       # Custom design system tokens
└── vite.config.ts           # Bundler configuration with `@/` path alias
```

---

## 6. Pages & Functions to Build / Maintain

Here is the exact breakdown of the views and user interactions you will be responsible for:

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

## 7. Backend Data Contracts & Hook Cheatsheet

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

## 8. Setup & Development Server

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Setup environment variables**:
   Create `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. **Start local Vite development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`.

