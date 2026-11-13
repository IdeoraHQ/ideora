-- ==============================================================================
-- IDEORA: Bootstrap Initial Platform Administrator
-- Migration: 20261113000012_assign_initial_admin.sql
--
-- Assigns 'admin' role to user ID b279e57f-60e6-4ebc-b0c1-d7e2875b955f
-- safely via migration (postgres/service role) and records a system audit log.
-- ==============================================================================

DO $$
DECLARE
    v_target_id CONSTANT UUID := 'b279e57f-60e6-4ebc-b0c1-d7e2875b955f';
    v_existing public.profiles;
BEGIN
    SELECT * INTO v_existing
    FROM public.profiles
    WHERE id = v_target_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot assign admin: profile % does not exist in public.profiles.', v_target_id;
    END IF;

    IF v_existing.role IS DISTINCT FROM 'admin'::public.user_role THEN
        UPDATE public.profiles
        SET
            role = 'admin'::public.user_role,
            updated_at = pg_catalog.now()
        WHERE id = v_target_id;

        INSERT INTO public.profile_security_status (
            user_id,
            account_status,
            status_reason,
            suspended_until,
            updated_at
        )
        VALUES (
            v_target_id,
            'active'::public.account_status,
            NULL,
            NULL,
            pg_catalog.now()
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
            account_status = 'active'::public.account_status,
            status_reason = NULL,
            suspended_until = NULL,
            updated_at = pg_catalog.now();

        INSERT INTO public.admin_audit_logs (
            actor_type,
            admin_id,
            action,
            target_type,
            target_id,
            previous_values,
            new_values,
            reason
        )
        VALUES (
            'system',
            NULL,
            'initial_admin_assigned',
            'profile',
            v_target_id,
            pg_catalog.jsonb_build_object('role', v_existing.role),
            pg_catalog.jsonb_build_object('role', 'admin'),
            'Bootstrap initial platform administrator via migration'
        );
    END IF;
END $$;

