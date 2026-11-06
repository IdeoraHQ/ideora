# IDEORA — Backend Architecture & Data Contracts

> **Audience**: Development Team & Frontend Co-Founder  
> **Status**: Milestone 1 (Foundation, Schema, Authentication, RLS & Data Contracts)

---

## 1. Architecture Overview

IDEORA uses a modern serverless backend architecture built on **Supabase (PostgreSQL 15)**:

- **Authentication**: Managed via Supabase Auth (`auth.users`), mapped 1:1 with `public.profiles`.
- **Authorization**: Enforced at the database engine level using PostgreSQL **Row Level Security (RLS)**.
- **Data Integrity**: Enforced through foreign keys with cascading deletes, `CHECK` constraints, triggers, and PostgreSQL enums.
- **Client Access**: Strongly typed via `@supabase/supabase-js` using TypeScript database schemas.

---

## 2. Database Schema Blueprint

### Enums
- `user_role`: `'founder' | 'collaborator' | 'admin'`
- `idea_status`: `'draft' | 'seeking_collaborators' | 'in_progress' | 'launched' | 'archived'`
- `collaboration_type`: `'co_founder' | 'contributor' | 'advisor' | 'open_source'`
- `request_status`: `'pending' | 'accepted' | 'declined' | 'withdrawn'`
- `notification_type`: `'collaboration_request' | 'request_accepted' | 'request_declined' | 'new_comment' | 'idea_upvoted'`

### Tables & Relationships

| Table | Description | Primary Key | Foreign Keys |
| :--- | :--- | :--- | :--- |
| `public.profiles` | User profile, bio, skills, socials | `id (UUID)` | `id -> auth.users.id` |
| `public.ideas` | Core published or draft idea | `id (UUID)` | `creator_id -> profiles.id` |
| `public.idea_roles_needed` | Skill roles and open seats for an idea | `id (UUID)` | `idea_id -> ideas.id` |
| `public.collaboration_requests`| Applications by builders to join an idea | `id (UUID)` | `idea_id -> ideas.id`, `requester_id -> profiles.id`, `role_id -> idea_roles_needed.id` |
| `public.idea_upvotes` | Community interest / upvote ledger | `(idea_id, user_id)` | `idea_id -> ideas.id`, `user_id -> profiles.id` |
| `public.notifications` | Realtime alerts for users | `id (UUID)` | `recipient_id -> profiles.id`, `actor_id -> profiles.id`, `idea_id -> ideas.id` |

---

## 3. Row Level Security (RLS) Rules Matrix

All tables have RLS enabled:

- **`profiles`**:
  - `SELECT`: Public.
  - `INSERT / UPDATE`: Authenticated user matching `auth.uid() = id`.
- **`ideas`**:
  - `SELECT`: Public for published ideas (`status != 'draft'`); creators can view their own drafts.
  - `INSERT`: Authenticated users (`creator_id = auth.uid()`).
  - `UPDATE / DELETE`: Creator only (`creator_id = auth.uid()`).
- **`idea_roles_needed`**:
  - `SELECT`: Public.
  - `INSERT / UPDATE / DELETE`: Idea creator only.
- **`collaboration_requests`**:
  - `SELECT`: Idea creator OR the applicant.
  - `INSERT`: Authenticated users (cannot apply to own idea).
  - `UPDATE`: Idea creator can accept/decline; applicant can withdraw.
- **`idea_upvotes`**:
  - `SELECT`: Public.
  - `INSERT / DELETE`: Authenticated user (`user_id = auth.uid()`).
- **`notifications`**:
  - `SELECT / UPDATE`: Recipient only (`recipient_id = auth.uid()`).

---

## 4. Frontend Data Contracts (For Frontend Co-Founder)

Import directly from `@/types` or `@/services/api`:

### A. Submitting an Idea (`createIdea`)
```typescript
import { createIdea } from '@/services/api';
import type { CreateIdeaPayload } from '@/types';

const payload: CreateIdeaPayload = {
  title: 'AI Pair Programmer for Open Source',
  summary: 'A triage bot for GitHub issue queues.',
  description: 'Detailed description of the architecture and mission...',
  category: 'Developer Tools',
  collaboration_type: 'co_founder',
  tags: ['AI', 'OpenSource', 'TypeScript'],
  roles_needed: [
    {
      role_title: 'Fullstack Engineer',
      category: 'fullstack',
      spots_available: 2,
      description: 'Experience with React and Node.js',
    },
  ],
};

const { data, error } = await createIdea(payload);
```

### B. Querying Ideas (`fetchPublishedIdeas`)
```typescript
import { fetchPublishedIdeas } from '@/services/api';

const { data, error } = await fetchPublishedIdeas({
  category: 'Developer Tools',
  search: 'AI',
});
```

### C. Requesting Collaboration (`submitCollaborationRequest`)
```typescript
import { submitCollaborationRequest } from '@/services/api';

const { data, error } = await submitCollaborationRequest({
  idea_id: 'idea-uuid',
  role_id: 'role-uuid',
  message: "Hey! I'm a fullstack engineer interested in co-founding this with you.",
});
```

---

## 5. Applying Migrations

The migration file is located at:
`supabase/migrations/20261102000001_initial_schema.sql`

To apply to your cloud Supabase project:
1. Open your project on [database.new](https://database.new) or [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Paste the contents of `20261102000001_initial_schema.sql` and run it.
4. Or using Supabase CLI:
   ```bash
   npx supabase db push
   ```
