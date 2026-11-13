import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
  AtSign,
  Github,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import type { UserRole, SkillCategory } from '@/types';

const availableSkills: { label: string; value: SkillCategory }[] = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Fullstack', value: 'fullstack' },
  { label: 'UI/UX Design', value: 'design' },
  { label: 'Product', value: 'product' },
  { label: 'AI / ML', value: 'ai' },
  { label: 'Marketing / Growth', value: 'marketing' },
];

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInGithub } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('founder');
  const [skills, setSkills] = useState<string[]>(['fullstack']);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationEmailSent, setVerificationEmailSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/dashboard';

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerificationEmailSent(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) throw signInErr;
      } else {
        const { error: signUpErr, requiresEmailVerification } = await signUp({
          email,
          password,
          full_name: fullName,
          username,
          role,
          skills,
          bio,
        });
        if (signUpErr) throw signUpErr;
        if (requiresEmailVerification) {
          setVerificationEmailSent(email.trim());
          return;
        }
      }
      navigate(redirectTo);
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGithub = async () => {
    setError(null);
    const { error: ghError } = await signInGithub();
    if (ghError) {
      setError(ghError.message);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Standalone Brand Bar */}
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
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-typography-slate hover:text-brand-royal transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Auth Card */}
      <div className="mx-auto w-full max-w-xl my-auto">
        <div className="rounded-2xl border border-surface-border bg-surface-white p-7 sm:p-9 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            {mode === 'signin' ? 'Welcome Back to IDEORA' : 'Join the Builder Network'}
          </div>

          <h1 className="text-2xl sm:text-3xl font-light text-typography-navy tracking-tight">
            {mode === 'signin'
              ? 'Sign in to your account'
              : 'Create your builder profile'}
          </h1>
          <p className="mt-1.5 text-sm font-normal text-typography-slate leading-relaxed">
            {mode === 'signin'
              ? 'Publish ideas, apply for open roles, and collaborate with co-founders.'
              : 'Tell founders and builders what you want to create or contribute.'}
          </p>

        {/* Mode Tabs */}
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-surface-soft p-1 border border-surface-border">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`rounded-lg py-2 text-xs font-medium transition-all ${
              mode === 'signin'
                ? 'bg-surface-white text-brand-royal shadow-sm'
                : 'text-typography-slate hover:text-typography-navy'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`rounded-lg py-2 text-xs font-medium transition-all ${
              mode === 'signup'
                ? 'bg-surface-white text-brand-royal shadow-sm'
                : 'text-typography-slate hover:text-typography-navy'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-3 text-xs font-semibold text-functional-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {verificationEmailSent && (
          <div className="mt-4 rounded-xl border border-brand-royal/25 bg-brand-ice/60 p-4 text-xs text-typography-navy">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-royal mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold text-brand-royal">
                  Check your email to verify your account
                </p>
                <p className="text-typography-slate leading-relaxed">
                  We sent a confirmation link to{' '}
                  <span className="font-semibold text-typography-navy">
                    {verificationEmailSent}
                  </span>
                  . Click the link in your inbox to activate your profile, then
                  sign in.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setVerificationEmailSent(null);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-brand-royal hover:underline"
                >
                  Go to Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ada Lovelace"
                      className="w-full rounded-xl border border-surface-border bg-surface-soft py-2.5 pl-10 pr-4 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-typography-navy mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="adalovelace"
                      className="w-full rounded-xl border border-surface-border bg-surface-soft py-2.5 pl-10 pr-4 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-typography-navy mb-1.5">
                  Primary Focus
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('founder')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      role === 'founder'
                        ? 'border-brand-royal bg-brand-ice/60 text-brand-royal'
                        : 'border-surface-border bg-surface-soft text-typography-slate'
                    }`}
                  >
                    <span className="block text-xs font-bold">
                      Idea Founder
                    </span>
                    <span className="mt-0.5 block text-[11px] opacity-80">
                      Pitching concepts & assembling teams
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('collaborator')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      role === 'collaborator'
                        ? 'border-brand-royal bg-brand-ice/60 text-brand-royal'
                        : 'border-surface-border bg-surface-soft text-typography-slate'
                    }`}
                  >
                    <span className="block text-xs font-bold">
                      Collaborator / Builder
                    </span>
                    <span className="mt-0.5 block text-[11px] opacity-80">
                      Joining ideas as co-founder or contributor
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-typography-navy mb-1.5">
                  Your Core Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSkills.map((sk) => {
                    const active = skills.includes(sk.value);
                    return (
                      <button
                        key={sk.value}
                        type="button"
                        onClick={() => toggleSkill(sk.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-all ${
                          active
                            ? 'bg-brand-royal text-white border-brand-royal'
                            : 'bg-surface-soft text-typography-slate border-surface-border hover:border-brand-light'
                        }`}
                      >
                        {sk.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-typography-navy mb-1.5">
                  Short Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What kind of products or technologies excite you?"
                  className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-typography-navy mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="builder@ideora.dev"
                className="w-full rounded-xl border border-surface-border bg-surface-soft py-2.5 pl-10 pr-4 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-typography-navy">
                Password
              </label>
              {mode === 'signin' && (
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-royal hover:text-brand-deep hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-surface-border bg-surface-soft py-2.5 pl-10 pr-4 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep transition-all disabled:opacity-60"
          >
            <span>
              {submitting
                ? 'Authenticating...'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Builder Account'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-surface-border w-full" />
            <span className="bg-surface-white px-3 text-xs text-typography-muted font-normal">
              or
            </span>
            <div className="border-t border-surface-border w-full" />
          </div>

          <button
            type="button"
            onClick={handleGithub}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-4 py-2.5 text-sm font-semibold text-typography-navy hover:bg-surface-light transition-colors"
          >
            <Github className="h-4 w-4" />
            <span>Continue with GitHub</span>
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-typography-muted">
            By continuing with email or OAuth sign-in, you agree to IDEORA&rsquo;s{' '}
            <Link to="/terms" className="font-semibold text-brand-royal hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-semibold text-brand-royal hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>

    {/* Discreet Auth Footer */}
      <footer className="pt-8 text-center text-xs text-typography-muted space-x-2">
        <span>&copy; {new Date().getFullYear()} IDEORA &bull; Where ideas find their builders.</span>
        <span>&bull;</span>
        <Link to="/privacy" className="hover:text-brand-royal hover:underline">
          Privacy Policy
        </Link>
        <span>&bull;</span>
        <Link to="/terms" className="hover:text-brand-royal hover:underline">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
};
