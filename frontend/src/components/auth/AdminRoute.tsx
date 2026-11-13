import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase/client';
import { AdminMfaGate } from './AdminMfaGate';

/**
 * Route guard for the Admin Control Center.
 * Verifies authenticated profile state, the authoritative database
 * `public.is_admin()` check, and Supabase Auth TOTP MFA (`aal2`)
 * before rendering administrative routes.
 */
export const AdminRoute: React.FC = () => {
  const { profile, loading: authLoading, isAuthenticated } = useAuth();
  const [verifying, setVerifying] = useState<boolean>(true);
  const [isDbAdmin, setIsDbAdmin] = useState<boolean>(false);
  const [mfaVerified, setMfaVerified] = useState<boolean>(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  const checkAdminAndMfa = useCallback(async () => {
    if (authLoading) return;

    if (!isAuthenticated || !profile || profile.role !== 'admin') {
      setIsDbAdmin(false);
      setMfaVerified(false);
      setMfaFactorId(null);
      setVerifying(false);
      return;
    }

    try {
      const [{ data: adminOk, error: adminErr }, { data: aalData }, { data: factorsData }] =
        await Promise.all([
          supabase.rpc('is_admin'),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ]);

      const dbAdmin = !adminErr && Boolean(adminOk);
      const verifiedTotp = (factorsData?.totp ?? []).find((f) => f.status === 'verified');
      const isAal2 = aalData?.currentLevel === 'aal2' && Boolean(verifiedTotp);

      setIsDbAdmin(dbAdmin);
      setMfaFactorId(verifiedTotp?.id ?? null);
      setMfaVerified(isAal2);
    } catch {
      setIsDbAdmin(false);
      setMfaVerified(false);
      setMfaFactorId(null);
    } finally {
      setVerifying(false);
    }
  }, [authLoading, isAuthenticated, profile]);

  useEffect(() => {
    void checkAdminAndMfa();
  }, [checkAdminAndMfa]);

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

  if (!mfaVerified) {
    return (
      <AdminMfaGate
        mode={mfaFactorId ? 'verify' : 'enroll'}
        factorId={mfaFactorId}
        onVerified={() => {
          setVerifying(true);
          void checkAdminAndMfa();
        }}
      />
    );
  }

  return <Outlet />;
};

