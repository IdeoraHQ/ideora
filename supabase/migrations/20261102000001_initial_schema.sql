-- ==============================================================================
-- IDEORA: Initial Database Schema, Authentication, & Row Level Security (RLS)
-- Migration: 20261102000001_initial_schema.sql
-- Description: Sets up profiles, ideas, idea roles, collaboration requests,
--              upvotes, notifications, triggers, and comprehensive RLS policies.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('founder', 'collaborator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE idea_status AS ENUM ('draft', 'seeking_collaborators', 'in_progress', 'launched', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE collaboration_type AS ENUM ('co_founder', 'contributor', 'advisor', 'open_source');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'collaboration_request',
        'request_accepted',
        'request_declined',
        'new_comment',
        'idea_upvoted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    skills TEXT[] DEFAULT '{}'::TEXT[],
    github_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    role user_role DEFAULT 'collaborator'::user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3)
);

-- 4. IDEAS TABLE
CREATE TABLE IF NOT EXISTS public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status idea_status DEFAULT 'seeking_collaborators'::idea_status NOT NULL,
    collaboration_type collaboration_type DEFAULT 'co_founder'::collaboration_type NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    upvotes_count INTEGER DEFAULT 0 NOT NULL,
    collaborators_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT title_min_length CHECK (char_length(title) >= 5)
);

-- 5. IDEA ROLES NEEDED TABLE
CREATE TABLE IF NOT EXISTS public.idea_roles_needed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    role_title TEXT NOT NULL,
    category TEXT NOT NULL,
    spots_available INTEGER DEFAULT 1 NOT NULL,
    spots_filled INTEGER DEFAULT 0 NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT spots_check CHECK (spots_filled <= spots_available)
);

-- 6. COLLABORATION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.idea_roles_needed(id) ON DELETE SET NULL,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status request_status DEFAULT 'pending'::request_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_request_per_role UNIQUE (idea_id, requester_id, role_id)
);

-- 7. IDEA UPVOTES TABLE
CREATE TABLE IF NOT EXISTS public.idea_upvotes (
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (idea_id, user_id)
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_ideas_creator_id ON public.ideas(creator_id);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON public.ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON public.ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON public.ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idea_roles_idea_id ON public.idea_roles_needed(idea_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_idea_id ON public.collaboration_requests(idea_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_requester ON public.collaboration_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);

-- 10. AUTOMATIC TIMESTAMPS TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_ideas_updated_at
    BEFORE UPDATE ON public.ideas
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_collaboration_requests_updated_at
    BEFORE UPDATE ON public.collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. AUTOMATIC PROFILE CREATION ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_username TEXT;
    raw_name TEXT;
BEGIN
    -- Extract username and full name from auth metadata or fallback to email prefix
    raw_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    );
    raw_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        NEW.id,
        raw_username,
        raw_name,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = TIMEZONE('utc', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. AUTOMATIC UPVOTE COUNTER TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_upvote_counter()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.ideas
        SET upvotes_count = upvotes_count + 1
        WHERE id = NEW.idea_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.ideas
        SET upvotes_count = GREATEST(0, upvotes_count - 1)
        WHERE id = OLD.idea_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_upvote_change
    AFTER INSERT OR DELETE ON public.idea_upvotes
    FOR EACH ROW EXECUTE FUNCTION public.handle_upvote_counter();

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_roles_needed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone can view profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (TRUE);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- IDEAS POLICIES
-- ------------------------------------------------------------------------------
-- Everyone can read published ideas; creators can also view their drafts
CREATE POLICY "Published ideas are viewable by everyone"
    ON public.ideas FOR SELECT
    USING (status != 'draft'::idea_status OR auth.uid() = creator_id);

-- Authenticated users can insert an idea as creator
CREATE POLICY "Authenticated users can create ideas"
    ON public.ideas FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = creator_id);

-- Only idea creators can update their ideas
CREATE POLICY "Creators can update own ideas"
    ON public.ideas FOR UPDATE
    TO authenticated
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- Only idea creators can delete their ideas
CREATE POLICY "Creators can delete own ideas"
    ON public.ideas FOR DELETE
    TO authenticated
    USING (auth.uid() = creator_id);

-- ------------------------------------------------------------------------------
-- IDEA ROLES NEEDED POLICIES
-- ------------------------------------------------------------------------------
-- Anyone can view roles needed
CREATE POLICY "Roles needed are viewable by everyone"
    ON public.idea_roles_needed FOR SELECT
    USING (TRUE);

-- Idea creators can manage roles needed
CREATE POLICY "Creators can insert roles for their ideas"
    ON public.idea_roles_needed FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = idea_roles_needed.idea_id
              AND ideas.creator_id = auth.uid()
        )
    );

CREATE POLICY "Creators can update roles for their ideas"
    ON public.idea_roles_needed FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = idea_roles_needed.idea_id
              AND ideas.creator_id = auth.uid()
        )
    );

CREATE POLICY "Creators can delete roles for their ideas"
    ON public.idea_roles_needed FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = idea_roles_needed.idea_id
              AND ideas.creator_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- COLLABORATION REQUESTS POLICIES
-- ------------------------------------------------------------------------------
-- Requesters and idea creators can view requests
CREATE POLICY "View collaboration requests"
    ON public.collaboration_requests FOR SELECT
    TO authenticated
    USING (
        auth.uid() = requester_id
        OR EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = collaboration_requests.idea_id
              AND ideas.creator_id = auth.uid()
        )
    );

-- Authenticated users can submit a request (cannot request on own idea)
CREATE POLICY "Submit collaboration request"
    ON public.collaboration_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = requester_id
        AND NOT EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = collaboration_requests.idea_id
              AND ideas.creator_id = auth.uid()
        )
    );

-- Creators can accept/decline; requesters can withdraw
CREATE POLICY "Update collaboration request status"
    ON public.collaboration_requests FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = requester_id
        OR EXISTS (
            SELECT 1 FROM public.ideas
            WHERE ideas.id = collaboration_requests.idea_id
              AND ideas.creator_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- IDEA UPVOTES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Upvotes viewable by everyone"
    ON public.idea_upvotes FOR SELECT
    USING (TRUE);

CREATE POLICY "Authenticated users can toggle upvote"
    ON public.idea_upvotes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own upvote"
    ON public.idea_upvotes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = recipient_id);

CREATE POLICY "Users update own notification read state"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- ==============================================================================
-- 14. STORAGE BUCKET CONFIGURATION & POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars', 'avatars', TRUE),
    ('idea-attachments', 'idea-attachments', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, authenticated owner upload
CREATE POLICY "Public avatars are viewable by everyone"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );
