import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { SeoHead } from '@/components/seo/SeoHead';
import { updateUserPassword } from '@/services/api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Recovery session state
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form input state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. Listen for Supabase PASSWORD_RECOVERY event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setCheckingSession(false);
      } else if (session) {
        // Active session established from recovery token
        setIsValidSession(true);
        setCheckingSession(false);
      }
    });

    // 2. Fallback check for session or recovery tokens in URL
    const checkInitialSession = async () => {
      const hash = window.location.hash;
      const isRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token=');
      const search = window.location.search;
      const isCodeAuth = search.includes('code=');

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session || isRecoveryHash || isCodeAuth) {
          setIsValidSession(true);
        } else {
          setIsValidSession(false);
        }
      } catch {
        if (mounted) setIsValidSession(false);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    void checkInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await updateUserPassword(password);

      if (updateError) {
        setError(updateError.message || 'Could not update password. Please try again.');
      } else {
        setIsSuccess(true);
        // Cleanly sign out current temporary recovery session to prevent dangling state
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Branding Bar */}
      <SeoHead
        title="Set New Password | Ideora"
        description="Set a new password for your Ideora account."
        canonicalPath="/reset-password"
        noindex
      />
      <header className="mx-auto w-full max-w-xl flex items-center justify-between pb-4">
        <Link to="/" className="flex items-center gap-2.5 group" title="Return to IDEORA">
          <div className="text-brand-royal group-hover:scale-105 transition-transform">
            <IdeoraLogo size={32} />
          </div>
          <span className="text-xl font-light tracking-tight text-typography-navy font-heading">
            IDEORA
          </span>
        </Link>
        <Link
          to="/auth"
          className="text-xs font-semibold text-typography-slate hover:text-brand-royal transition-colors"
        >
          Back to Sign In
        </Link>
      </header>

      {/* Main Container Card */}
      <main className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-surface-border bg-surface-white p-8 shadow-sm sm:p-10">
          {checkingSession ? (
            /* Checking recovery session */
            <div className="py-12 text-center space-y-3">
              <RotateCw className="mx-auto h-8 w-8 text-brand-royal animate-spin" />
              <p className="text-sm font-medium text-typography-navy">
                Verifying recovery credentials...
              </p>
              <p className="text-xs text-typography-slate font-normal">
                Connecting to Supabase Auth security layer
              </p>
            </div>
          ) : !isValidSession ? (
            /* Invalid or Expired Session */
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-functional-error-light text-functional-error mb-2">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-light text-typography-navy font-heading tracking-tight">
                Invalid or Expired Link
              </h1>
              <p className="text-xs sm:text-sm font-normal text-typography-slate leading-relaxed">
                This password reset link is invalid, has expired, or has already been used.
                For your security, recovery links are time-limited and single-use.
              </p>
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep transition-all"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Request New Recovery Link</span>
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            /* Success Confirmation State */
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-functional-success-light text-functional-success mb-2">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-light text-typography-navy font-heading tracking-tight">
                Password Updated!
              </h1>
              <p className="text-xs sm:text-sm font-normal text-typography-slate leading-relaxed">
                Your IDEORA account password has been successfully updated. You can now sign in with your new credentials.
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep transition-all"
                >
                  <span>Sign In with New Password</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Set New Password Form */
            <div>
              <div className="text-center mb-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal mb-3">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-light text-typography-navy font-heading tracking-tight">
                  Set New Password
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm font-normal text-typography-slate leading-relaxed">
                  Enter and confirm a new secure password for your account.
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-3.5 text-xs font-semibold text-functional-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-bold text-typography-navy mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoFocus
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-surface-border bg-surface-soft py-2.5 pl-10 pr-10 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-typography-muted hover:text-typography-navy"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-bold text-typography-navy mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full rounded-xl border border-surface-border bg-surface-soft py-2.5 pl-10 pr-10 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-typography-muted hover:text-typography-navy"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep transition-all disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer info */}
      <footer className="mx-auto w-full max-w-xl text-center pt-8 text-xs text-typography-muted">
        <p>&copy; {new Date().getFullYear()} IDEORA. Protected with Supabase encryption.</p>
      </footer>
    </div>
  );
};

