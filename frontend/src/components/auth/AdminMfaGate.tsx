import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { SeoHead } from '@/components/seo/SeoHead';

interface AdminMfaGateProps {
  mode: 'enroll' | 'verify';
  factorId: string | null;
  onVerified: () => void;
}

export const AdminMfaGate: React.FC<AdminMfaGateProps> = ({
  mode,
  factorId: initialFactorId,
  onVerified,
}) => {
  const [factorId, setFactorId] = useState<string | null>(initialFactorId);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [enrolling, setEnrolling] = useState(mode === 'enroll');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const startEnrollment = useCallback(async () => {
    setEnrolling(true);
    setError(null);
    setQrCode(null);
    setSecret(null);

    try {
      // Remove any stale unverified TOTP factors so enrollment never collides
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const unverifiedTotp = (factorsData?.all ?? []).filter(
        (f) => f.factor_type === 'totp' && f.status === 'unverified'
      );
      for (const stale of unverifiedTotp) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Ideora Admin (${new Date().toISOString().slice(0, 10)})`,
      });

      if (enrollError || !data) {
        throw enrollError ?? new Error('Could not initialize Google Authenticator setup.');
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to generate authenticator QR code.';
      setError(msg);
    } finally {
      setEnrolling(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'enroll') {
      void startEnrollment();
    } else {
      setFactorId(initialFactorId);
      setEnrolling(false);
    }
  }, [mode, initialFactorId, startEnrollment]);

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying) return;

    const cleanCode = code.replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    if (!factorId) {
      setError('Authenticator factor is not ready. Please refresh or retry.');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: cleanCode,
      });

      if (verifyError) {
        throw verifyError;
      }

      onVerified();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Invalid or expired 6-digit code. Please try again.';
      setError(msg);
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <SeoHead
        title="Admin 2FA Verification | Ideora"
        description="Google Authenticator two-factor verification for Ideora Admin Control Center."
        canonicalPath="/admin"
        noindex
      />

      <header className="mx-auto w-full max-w-lg flex items-center justify-between pb-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="text-brand-royal group-hover:scale-105 transition-transform">
            <IdeoraLogo size={30} />
          </div>
          <span className="text-lg font-light tracking-tight text-typography-navy font-heading">
            IDEORA Admin
          </span>
        </Link>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-typography-slate hover:text-brand-royal transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Workspace</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-lg my-auto">
        <div className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice border border-brand-pale px-3 py-1 text-xs font-semibold text-brand-royal">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Two-Factor Authentication</span>
            </div>

            <h1 className="text-2xl font-light tracking-tight text-typography-navy font-heading">
              {mode === 'enroll'
                ? 'Set up Google Authenticator'
                : 'Verify with Google Authenticator'}
            </h1>
            <p className="text-xs sm:text-sm text-typography-slate leading-relaxed">
              {mode === 'enroll'
                ? 'Scan the QR code below with Google Authenticator (or any TOTP authenticator app), then enter the 6-digit code to unlock the Admin Control Center.'
                : 'Enter the 6-digit verification code from your Google Authenticator app to access the Admin Control Center.'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-functional-error/30 bg-functional-error-light p-3.5 text-xs font-medium text-functional-error">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{error}</p>
                {mode === 'enroll' && !qrCode && (
                  <button
                    type="button"
                    onClick={() => void startEnrollment()}
                    className="inline-flex items-center gap-1 font-semibold underline hover:no-underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry QR Setup
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'enroll' && (
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-4">
              {enrolling ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-xs text-typography-slate">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-royal" />
                  <span>Generating authenticator QR code...</span>
                </div>
              ) : qrCode ? (
                <>
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="rounded-2xl border border-surface-border bg-white p-3 shadow-2xs shrink-0">
                      <img
                        src={qrCode}
                        alt="Google Authenticator QR code for Ideora Admin"
                        className="h-40 w-40 object-contain"
                      />
                    </div>
                    <div className="space-y-2 text-xs text-typography-slate">
                      <div className="flex items-center gap-1.5 font-semibold text-typography-navy">
                        <Smartphone className="h-4 w-4 text-brand-royal" />
                        <span>How to scan</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                        <li>Open Google Authenticator on your phone.</li>
                        <li>Tap <strong>+</strong> &rarr; <strong>Scan a QR code</strong>.</li>
                        <li>Enter the 6-digit code shown below.</li>
                      </ol>
                    </div>
                  </div>

                  {secret && (
                    <div className="pt-3 border-t border-surface-border/70">
                      <p className="text-[11px] font-semibold text-typography-muted uppercase tracking-wider mb-1.5">
                        Manual Setup Key
                      </p>
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-white px-3 py-2">
                        <code className="text-xs font-mono text-typography-navy break-all select-all">
                          {secret}
                        </code>
                        <button
                          type="button"
                          onClick={() => void handleCopySecret()}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-brand-royal hover:bg-brand-ice transition-colors shrink-0"
                        >
                          {copiedSecret ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-functional-success" />
                              <span className="text-functional-success">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          <form onSubmit={(e) => void handleVerify(e)} className="space-y-4">
            <div>
              <label
                htmlFor="admin-totp-code"
                className="block text-xs font-semibold text-typography-navy mb-1.5"
              >
                6-Digit Authenticator Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
                <input
                  id="admin-totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={enrolling || verifying || (!qrCode && mode === 'enroll')}
                  className="w-full rounded-xl border border-surface-border bg-surface-soft py-3 pl-10 pr-4 text-center text-lg font-mono tracking-[0.35em] text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={enrolling || verifying || code.length !== 6}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep transition-all disabled:opacity-60"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {mode === 'enroll'
                      ? 'Activate & Enter Admin Center'
                      : 'Verify & Enter Admin Center'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="pt-8 text-center text-xs text-typography-muted">
        Protected by Supabase Auth TOTP Multi-Factor Authentication
      </footer>
    </div>
  );
};

