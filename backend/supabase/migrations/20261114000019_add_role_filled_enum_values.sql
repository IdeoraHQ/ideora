-- ==============================================================================
-- IDEORA: Add 'role_filled' to request_status and notification_type enums
-- Migration: 20261114000019_add_role_filled_enum_values.sql
-- Note: Kept in its own migration so PostgreSQL commits the new enum values
--       before subsequent functions/triggers reference them.
-- ==============================================================================

ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'role_filled';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'role_filled';

