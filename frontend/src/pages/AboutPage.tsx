import React from 'react';
import { Link } from 'react-router-dom';
import {
  Lightbulb,
  Users,
  MessageSquare,
  ShieldCheck,
  Mail,
  ArrowRight,
  Compass,
  FolderGit2,
  Lock,
} from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-surface-soft py-12 sm:py-16">
      <SeoHead
        title="About Ideora — Where Unfinished Ideas Find Their Builders"
        description="Learn what Ideora is, who it serves, how idea-based and people-based collaboration requests work, and how we protect user accounts and data."
        canonicalPath="/about"
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Hero / Overview */}
        <header className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-10 shadow-sm space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal">
            <Lightbulb className="h-3.5 w-3.5" />
            About Ideora
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-typography-navy font-heading">
            Built so unfinished ideas do not stay unfinished
          </h1>
          <p className="text-sm sm:text-base text-typography-slate leading-relaxed max-w-3xl">
            Ideora is a collaboration platform where people with early or unfinished project
            concepts connect with developers, designers, and problem-solvers who want to build
            something meaningful together. You can publish an idea and recruit collaborators for
            specific roles, or discover builders directly by their skills and interests even
            before publishing an idea.
          </p>
        </header>

        {/* Who It Serves */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-7 shadow-2xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-typography-navy font-heading">
              For Idea Creators
            </h2>
            <p className="text-sm text-typography-slate leading-relaxed">
              Have a software, AI, design, or product concept you cannot finish alone? Publish
              your idea with a clear summary, specify the collaborator roles you need, and review
              incoming requests from builders interested in helping bring it to life.
            </p>
            <Link
              to="/ideas/new"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-royal hover:underline pt-1"
            >
              Publish an Idea
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-7 shadow-2xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-typography-navy font-heading">
              For Builders &amp; Collaborators
            </h2>
            <p className="text-sm text-typography-slate leading-relaxed">
              Want to contribute your engineering, design, or product skills without having to
              publish your own idea first? Create a builder profile with your skills and
              interests, explore open initiatives, or connect directly with other builders.
            </p>
            <Link
              to="/people"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-royal hover:underline pt-1"
            >
              Browse People Discovery
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* How Collaboration Works */}
        <section className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-royal">
              How Ideora Works
            </span>
            <h2 className="mt-1 text-2xl font-light text-typography-navy font-heading">
              Transparent collaboration workflows
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
              <Compass className="h-5 w-5 text-brand-royal" />
              <h3 className="text-sm font-semibold text-typography-navy">
                1. Discover Ideas or People
              </h3>
              <p className="text-xs text-typography-slate leading-relaxed">
                Search published initiatives on{' '}
                <Link to="/explore" className="text-brand-royal font-medium hover:underline">
                  Explore Ideas
                </Link>{' '}
                or filter builders by skills, preferred roles, and interests on{' '}
                <Link to="/people" className="text-brand-royal font-medium hover:underline">
                  People Discovery
                </Link>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
              <MessageSquare className="h-5 w-5 text-brand-royal" />
              <h3 className="text-sm font-semibold text-typography-navy">
                2. Request to Collaborate
              </h3>
              <p className="text-xs text-typography-slate leading-relaxed">
                Apply for a specific role on an idea, or send an idea-independent collaboration
                request directly from a builder&rsquo;s profile with your purpose and offered
                skills.
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-soft p-5 space-y-2">
              <FolderGit2 className="h-5 w-5 text-brand-royal" />
              <h3 className="text-sm font-semibold text-typography-navy">
                3. Message &amp; Build Together
              </h3>
              <p className="text-xs text-typography-slate leading-relaxed">
                Once a recipient accepts your request, a private conversation opens in{' '}
                <Link to="/messages" className="text-brand-royal font-medium hover:underline">
                  Messages
                </Link>{' '}
                (and idea-based collaborations unlock a shared project workspace).
              </p>
            </div>
          </div>
        </section>

        {/* Security, Ownership & Data Handling */}
        <section className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-typography-navy font-heading">
                Accounts, Ownership &amp; Data Protection
              </h2>
              <p className="text-xs text-typography-slate">
                How we handle identity, privacy, and your intellectual property
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-typography-slate leading-relaxed">
            <div className="rounded-2xl border border-surface-border bg-surface-soft p-4 space-y-1.5">
              <p className="font-semibold text-typography-navy flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-brand-royal" />
                Verified Authentication &amp; Row-Level Security
              </p>
              <p>
                Authentication, email verification, and password recovery are handled by Supabase
                Auth. Database access is enforced through PostgreSQL Row-Level Security (RLS) so
                private messages, settings, and admin controls remain restricted to authorized
                accounts.
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-soft p-4 space-y-1.5">
              <p className="font-semibold text-typography-navy flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-royal" />
                You Own Your Ideas &amp; Visibility
              </p>
              <p>
                Publishing on Ideora does not transfer ownership of your ideas. Private email
                addresses are never shown on public profiles or People Discovery, and you can
                toggle your People Discovery visibility or request account deletion anytime in
                Settings.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
            <Link to="/privacy" className="font-semibold text-brand-royal hover:underline">
              Read Privacy Policy &rarr;
            </Link>
            <Link to="/terms" className="font-semibold text-brand-royal hover:underline">
              Read Terms of Service &rarr;
            </Link>
          </div>
        </section>

        {/* Official Contact & Social Channels */}
        <section
          id="contact"
          className="rounded-3xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold text-typography-navy font-heading">
              Contact Ideora
            </h2>
            <p className="text-xs sm:text-sm text-typography-slate max-w-xl leading-relaxed">
              Questions, privacy requests, security reports, or feedback? Reach us directly by
              email or connect on our official channels.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="mailto:hello@ideorahq.top"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-royal text-white hover:bg-brand-deep transition-colors shadow-2xs"
              aria-label="Email hello@ideorahq.top"
              title="hello@ideorahq.top"
            >
              <Mail className="h-5 w-5" />
            </a>
            <a
              href="https://x.com/Naijapins27"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-surface-soft text-typography-navy hover:border-brand-royal/40 hover:text-brand-royal transition-colors"
              aria-label="X (@Naijapins27)"
              title="X (@Naijapins27)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://www.threads.net/@alpha.wolf2704"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-surface-soft text-typography-navy hover:border-brand-royal/40 hover:text-brand-royal transition-colors"
              aria-label="Threads (@alpha.wolf2704)"
              title="Threads (@alpha.wolf2704)"
            >
              <svg viewBox="0 0 192 192" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.131-57.318C56.951 24.424 74.202 17.109 97.01 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.195 47.292 9.643 32.788 28.08 19.882 44.485 13.224 67.315 13.001 95.932L13 96v.067c.224 28.617 6.882 51.447 19.788 67.854C47.292 182.358 68.882 191.806 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.19 18.963-18.945 18.392-42.691 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.552Zm-43.095 40.519c-10.44.588-21.286-4.098-21.82-14.135-.397-7.442 5.296-15.746 22.461-16.735 1.966-.113 3.895-.169 5.79-.169 6.235 0 12.068.606 17.37 1.765-1.978 24.702-13.58 28.713-23.801 29.274Z" />
              </svg>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

