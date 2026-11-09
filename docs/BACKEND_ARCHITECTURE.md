# IDEORA — Backend Architecture & Security Blueprint

> **Audience**: Backend Engineers & Co-Founders  
> **Status**: Production-Hardened (Milestone 3: Security, RLS Fortification, Rate Limiting & Anti-Tampering)  

---

## 1. Security Architecture Overview

IDEORA enforces security at the **PostgreSQL database engine level** via Supabase. Rather than relying solely on client-side or application-level rules, the database itself enforces authentication, authorization, role integrity, counter protections, and rate limiting.

### Core Security Layers:
1. **Row Level Security (RLS)**: Enforced on 100% of tables. No table is accessible without explicit matching policies.
2. **`search_path` Lockdown**: All `SECURITY DEFINER` functions have their search path explicitly fixed to `SET search_path = public, pg_temp` to prevent schema search path hijacking.
3. **Privilege Escalation Defense**: Triggers prevent users from updating their own role column to `admin`.
4. **Anti-Tampering Counter Triggers**: Direct client updates to metric fields (`upvotes_count`, `collaborators_count`) are rejected. Counts can only be modified through database-managed workflows.
5. **State-Machine RLS**: Collaboration request status transitions are enforced by RLS. Applicants can only withdraw pending applications; idea creators can only accept or decline.
6. **Rate Limiting Guard**: Built-in sliding window rate limiter prevents spam and brute-force actions on comments and requests.
7. **Atomic RPC Operations**: Upvotes are processed via a server-side transaction function (`toggle_idea_upvote_secure`) to prevent race conditions.

---

## 2. Security Migrations Catalog

### Migration 1: Foundation & Baseline RLS
📁 `backend/supabase/migrations/20261102000001_initial_schema.sql`
- Base tables: `profiles`, `ideas`, `idea_roles_needed`, `collaboration_requests`, `idea_upvotes`, `notifications`.
- Automatic user profile provisioning trigger (`on_auth_user_created`).
- Storage bucket RLS policies for avatars and attachments.

### Migration 2: Workflows & Automated Notifications
📁 `backend/supabase/migrations/20261107000002_workflow_triggers_and_comments.sql`
- Comments table with RLS.
- Collaboration request workflow trigger:
  - Notifies founders of incoming requests.
  - Automatically updates `spots_filled` and `collaborators_count` when requests are accepted.
  - Notifies applicants of decisions.
- Comment notification trigger.

### Migration 3: Security Hardening & Rate Limiting (Latest)
📁 `backend/supabase/migrations/20261108000003_backend_security_hardening.sql`
- **Search Path Hardening**:
  - `handle_updated_at`
  - `handle_new_user`
  - `handle_upvote_counter`
  - `handle_collaboration_request_workflow`
  - `handle_new_comment_notification`
- **Role Elevation Protection**:
  - Trigger `trg_protect_profile_role` checks that only `service_role` can assign `admin` status.
- **Metric Tampering Protection**:
  - Trigger `trg_protect_idea_counters` prevents client updates from falsifying upvotes or collaborator counts.
- **Collaboration RLS Hardening**:
  - Requesters can only transition from `pending` -> `withdrawn`.
  - Idea creators can only transition from `pending` -> `accepted` | `declined`.
- **User Action Audit & Sliding Window Rate Limiting**:
  - `public.user_action_audit` table.
  - `check_rate_limit(p_user_id, p_action_type, p_limit, p_window_interval)` function.
  - `trg_rate_limit_comments` enforces a ceiling of 10 comments per 5 minutes per user.
- **Atomic Secure Upvote RPC**:
  - `toggle_idea_upvote_secure(p_idea_id)` handles atomicity, existence checks, and returns the authoritative updated count.

---

## 3. How to Apply Security Migrations

### Option A: Supabase Web Dashboard
1. Open your project on [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Run `backend/supabase/migrations/20261108000003_backend_security_hardening.sql`.

### Option B: Supabase CLI
```bash
npx supabase db push
```
