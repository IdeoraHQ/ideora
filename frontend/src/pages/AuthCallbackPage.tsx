import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { sanitizeRedirectPath } from '@/services/api/auth';
import { useAuth } from '@/context/AuthContext';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { SeoHead } from '@/components/seo/SeoHead';

function extractOAuthError(searchParams: URLSearchParams): string | null {
  const hashParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
  );

  const errorCode = searchParams.get('error') || hashParams.get('error');
  const errorDescription =
    searchParams.get('error_description') || hashParams.get('error_description');

  if (!errorCode && !errorDescription) return null;

  if (errorCode === 'access_denied') {
    return 'Authentication was cancelled before completion. You can try again or sign in with email.';
  }

  return errorDescription || 'Authentication could not be completed. Please try again.';
}

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const nextPath = sanitizeRedirectPath(searchParams.get('next'));

    const completeAuth = async () => {
      const oauthError = extractOAuthError(searchParams);
      if (oauthError) {
        if (mounted) setError(oauthError);
        return;
      }

      try {
        // 1. Check if Supabase client already established a session (e.g., via detectSessionInUrl or page refresh)
        const {
          data: { session: existingSession },
          error: sessionErr,
        } = await supabase.auth.getSession();

        if (sessionErr) throw sessionErr;

        if (existingSession?.user) {
          await refreshProfile();
          if (mounted) {
            navigate(nextPath, { replace: true });
          }
          return;
        }

        // 2. If PKCE authorization code is present and not yet exchanged, exchange it once
        const code = searchParams.get('code');
        if (code) {
          const { data: exchangeData, error: exchangeErr } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeErr) {
            // Re-check session in case detectSessionInUrl raced and already consumed the code
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();

            if (!retrySession?.user) {
              throw exchangeErr;
            }
          } else if (!exchangeData.session) {
            throw new Error('Could not establish an authenticated session.');
          }

          await refreshProfile();
          if (mounted) {
            navigate(nextPath, { replace: true });
          }
          return;
        }

        // 3. No session and no code in URL
        if (mounted) {
          setError('No active authentication session was found. Please sign in again.');
        }
      } catch (err) {
        console.error('[IDEORA] OAuth callback error:', err);
        if (mounted) {
          setError(
            (err as Error).message ||
              'Unable to complete sign-in. Please return to the login page and try again.'
          );
        }
      }
    };

    void completeAuth();

    return () => {
      mounted = false;
    };
  }, [navigate, refreshProfile, searchParams]);

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col justify-center items-center px-4 py-12">
      <SeoHead
        title="Completing Sign In | Ideora"
        description="Completing authentication for Ideora."
        canonicalPath="/auth/callback"
        noindex
      />

      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-white p-8 shadow-sm text-center space-y-5">
        <div className="mx-auto flex items-center justify-center gap-2.5 text-brand-royal">
          <IdeoraLogo size={32} />
          <span className="text-xl font-light tracking-tight text-typography-navy font-heading">
            IDEORA
          </span>
        </div>

        {error ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-functional-error-light text-functional-error">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-typography-navy font-heading">
                Sign-In Could Not Be Completed
              </h1>
              <p className="text-xs sm:text-sm text-typography-slate leading-relaxed">
                {error}
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/auth"
                replace
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-typography-navy font-heading">
                Completing sign-in...
              </h1>
              <p className="text-xs sm:text-sm text-typography-slate">
                Verifying your session and loading your Ideora profile.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

