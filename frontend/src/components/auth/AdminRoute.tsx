import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase/client';

/**
 * Route guard for the Admin Control Center.
 * Verifies both authenticated profile state and the authoritative database
 * `public.is_admin()` check before rendering administrative routes.
 */
export const AdminRoute: React.FC = () => {
  const { profile, loading: authLoading, isAuthenticated } = useAuth();
  const [verifying, setVerifying] = useState<boolean>(true);
  const [isDbAdmin, setIsDbAdmin] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    const verifyAdmin = async () => {
      if (authLoading) return;

      if (!isAuthenticated || !profile || profile.role !== 'admin') {
        if (active) {
          setIsDbAdmin(false);
          setVerifying(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (active) {
          setIsDbAdmin(!error && Boolean(data));
          setVerifying(false);
        }
      } catch {
        if (active) {
          setIsDbAdmin(false);
          setVerifying(false);
        }
      }
    };

    void verifyAdmin();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, profile]);

  if (authLoading || verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-soft text-typography-navy font-sans">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-surface-border bg-surface-white px-8 py-6 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-brand-royal" />
          <p className="text-xs font-medium text-typography-slate">
            Verifying administrator access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.role !== 'admin' || !isDbAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

