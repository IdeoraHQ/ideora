-- ==============================================================================
-- IDEORA: Persist User Theme Preference (Light / Dark / System)
-- Migration: 20261113000016_add_theme_preference_to_user_settings.sql
--
-- Adds `theme_preference` to `public.user_settings` so authenticated users'
-- Light, Dark, or System Default preference persists across sessions and devices.
-- ==============================================================================

ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS theme_preference TEXT NOT NULL DEFAULT 'system'
    CONSTRAINT user_settings_theme_preference_check
    CHECK (theme_preference IN ('light', 'dark', 'system'));

