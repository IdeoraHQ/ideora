import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { requestPasswordReset } from '@/services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      // Dynamic redirect URL adapts seamlessly to localhost or production domain
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: resetError } = await requestPasswordReset(cleanEmail, redirectUrl);

      if (resetError) {
        // Do not disclose whether email exists if the provider returns user-not-found,
        // but surface real network / rate-limit errors
        if (
          resetError.message.toLowerCase().includes('rate limit') ||
          resetError.message.toLowerCase().includes('too many')
        ) {
          setError('Too many requests. Please wait a few moments before trying again.');
        } else {
          // Standard security practice: neutral response
          setSubmittedEmail(cleanEmail);
        }
      } else {
        setSubmittedEmail(cleanEmail);
      }
    } catch {
      // Security standard: neutral success state prevents account enumeration
      setSubmittedEmail(cleanEmail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Branding Bar */}
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-typography-slate hover:text-brand-royal transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* Main Container Card */}
      <main className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-surface-border bg-surface-white p-8 shadow-sm sm:p-10">
          {submittedEmail ? (
            /* Success Confirmation State */
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-functional-success-light text-functional-success mb-2">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-light text-typography-navy font-heading tracking-tight">
                Check your email
              </h1>
              <p className="text-xs sm:text-sm font-normal text-typography-slate leading-relaxed">
                If an account exists for <span className="font-semibold text-typography-navy">{submittedEmail}</span>,
                we have sent a secure password recovery link.
              </p>
              <div className="rounded-2xl bg-surface-soft border border-surface-border p-4 text-xs text-typography-slate text-left space-y-1.5">
                <p className="font-semibold text-typography-navy">Next steps:</p>
                <ul className="list-disc list-inside space-y-1 text-typography-charcoal">
                  <li>Open the email from IDEORA and click the recovery link.</li>
                  <li>Check your spam or junk folder if it does not appear within 2 minutes.</li>
                  <li>The recovery link is valid for a limited time.</li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedEmail(null);
                    setEmail('');
                  }}
                  className="w-full sm:w-auto text-xs font-semibold text-brand-royal hover:underline py-2"
                >
                  Try another email
                </button>
                <Link
                  to="/auth"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-deep transition-all"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <div>
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-light text-typography-navy font-heading tracking-tight">
                  Forgot your password?
                </h1>
                <p className="mt-2 text-xs sm:text-sm font-normal text-typography-slate leading-relaxed">
                  Enter your email address and we&apos;ll send you a secure link to reset your account password.
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
                  <label htmlFor="recovery-email" className="block text-xs font-bold text-typography-navy mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
                    <input
                      id="recovery-email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="builder@ideora.dev"
                      className="w-full rounded-xl border border-surface-border bg-surface-soft py-2.5 pl-10 pr-4 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Sending Recovery Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-surface-border text-center">
                <p className="text-xs text-typography-slate font-normal">
                  Remember your password?{' '}
                  <Link
                    to="/auth"
                    className="font-semibold text-brand-royal hover:underline"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer info */}
      <footer className="mx-auto w-full max-w-xl text-center pt-8 text-xs text-typography-muted">
        <p>&copy; {new Date().getFullYear()} IDEORA. Secure identity via Supabase Auth.</p>
      </footer>
    </div>
  );
};

