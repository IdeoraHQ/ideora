import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowRight, Mail } from 'lucide-react';

interface PolicySection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const LAST_UPDATED = 'November 13, 2026';

const sections: PolicySection[] = [
  {
    id: 'overview',
    title: '1. Overview & Scope',
    content: (
      <>
        <p>
          This Privacy Policy explains how <strong>IDEORA</strong> (&ldquo;IDEORA&rdquo;,
          &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, stores,
          and protects information when you visit{' '}
          <span className="font-medium text-typography-navy">https://ideorahq.top</span> or
          use our web application to publish startup ideas, discover initiatives, and
          collaborate with builders.
        </p>
        <p>
          By creating an account or using IDEORA, you acknowledge the practices described in
          this Privacy Policy. If you do not agree with this policy, please do not use the
          platform.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: '2. Information We Collect',
    content: (
      <>
        <p>We collect only the information needed to operate IDEORA&rsquo;s core features:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account &amp; Authentication Information:</strong> Email address,
            authentication identifiers, password credentials (managed securely by Supabase Auth),
            and verification status.
          </li>
          <li>
            <strong>Profile Information:</strong> Full name, username, primary role selection
            (<code>founder</code> or <code>collaborator</code>), selected skills, short bio,
            avatar URL, and optional external links (GitHub, LinkedIn, or personal website).
          </li>
          <li>
            <strong>User-Generated Content:</strong> Ideas you publish (titles, summaries,
            descriptions, categories, statuses, and required roles), comments, upvotes,
            collaboration requests, project workspace details, and direct messages exchanged
            with other users.
          </li>
          <li>
            <strong>Safety, Moderation &amp; Audit Data:</strong> User-submitted abuse reports,
            account security status records (such as active, suspended, or banned status), and
            rate-limiting / security audit logs used to protect the platform.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'auth-and-google-signin',
    title: '3. Account Registration, Google Sign-In & OAuth',
    content: (
      <>
        <p>
          IDEORA uses <strong>Supabase Auth</strong> to manage user registration, email
          verification, password recovery, and third-party OAuth sign-in (including{' '}
          <strong>Google Sign-In</strong> and <strong>GitHub</strong>).
        </p>
        <p>
          When you choose <strong>Continue with Google</strong>, Google authenticates your
          identity and shares basic profile information with us through Supabase Auth based on
          the OAuth scopes you approve—typically your <strong>name</strong>,{' '}
          <strong>email address</strong>, and <strong>profile picture URL</strong>.
        </p>
        <p>
          <strong>Limited Google Scope:</strong> IDEORA uses Google Sign-In strictly for
          authentication and creating or signing into your IDEORA profile. IDEORA does{' '}
          <strong>not</strong> request access to, read, modify, or store data from your
          Gmail, Google Drive, Google Calendar, Contacts, or any other Google Workspace
          service.
        </p>
      </>
    ),
  },
  {
    id: 'profile-and-ugc',
    title: '4. Profile Data, Ideas, Collaborations & Messages',
    content: (
      <>
        <p>
          IDEORA is a collaborative builder network. Certain information you submit is visible
          to other users by design:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Public Profiles &amp; Published Ideas:</strong> Your profile details
            (username, name, bio, skills, role, and optional links) and published ideas
            (including comments and upvote counts) can be viewed by visitors and other members.
            Draft ideas remain restricted to your account unless published.
          </li>
          <li>
            <strong>Collaboration Requests &amp; Projects:</strong> Applications to join an
            idea are shared with the idea creator, and project workspace memberships are
            visible to participating collaborators.
          </li>
          <li>
            <strong>Direct Messages &amp; Notifications:</strong> Messages sent between
            collaborators are stored so participants can view conversation history and read
            status. In-app notifications are generated for relevant collaboration, comment, and
            upvote activity.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-info',
    title: '5. How We Use Collected Information',
    content: (
      <>
        <p>We use your information strictly to provide, secure, and improve IDEORA:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Authenticate your account, send verification/password-reset emails, and maintain active sessions.</li>
          <li>Display your builder profile, published ideas, collaboration requests, and project memberships.</li>
          <li>Deliver direct messages and in-app notifications between collaborators.</li>
          <li>Enforce platform rules, investigate user reports, prevent spam or privilege abuse, and maintain security audit trails.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'storage-and-providers',
    title: '6. Storage, Security & Service Providers',
    content: (
      <>
        <p>
          IDEORA relies on trusted infrastructure providers to run the application:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Supabase:</strong> Provides our PostgreSQL database, Row-Level Security
            (RLS) access controls, and authentication services (including OAuth and email
            verification).
          </li>
          <li>
            <strong>Vercel:</strong> Hosts and delivers the IDEORA web frontend over HTTPS.
          </li>
          <li>
            <strong>Google Fonts:</strong> Serves the <code>Outfit</code> web typeface used in
            the user interface.
          </li>
        </ul>
        <p>
          We enforce database Row-Level Security (RLS), column-level privilege restrictions,
          and server-side validation to protect user accounts and restrict administrative
          actions to authorized administrators. However, no internet transmission or electronic
          storage system can be guaranteed 100% secure.
        </p>
      </>
    ),
  },
  {
    id: 'sharing-and-disclosure',
    title: '7. Information Sharing & Disclosure',
    content: (
      <>
        <p>
          We do <strong>not</strong> sell your personal data or share it with third-party
          advertising networks. We may disclose information only in the following cases:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>With other IDEORA users when you publish public ideas, comments, or profile details, or send collaboration requests and direct messages.</li>
          <li>With our core infrastructure providers (Supabase and Vercel) solely as necessary to host and operate the service.</li>
          <li>When required by applicable law, valid legal process, or to protect the safety, rights, and integrity of IDEORA and its users.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'retention-and-deletion',
    title: '8. Data Retention & Account Deletion',
    content: (
      <>
        <p>
          We retain your account, profile, and content data for as long as your account remains
          active or as needed to operate the service, enforce moderation decisions, and
          maintain security audit records.
        </p>
        <p>
          You can edit your profile information at any time from your profile page and remove
          your own ideas through the platform&rsquo;s idea-deletion controls (which may retain
          non-public moderation records where required for safety).
        </p>
        <p>
          Self-service full account deletion is not currently automated in the user interface.
          To request deletion of your account and associated personal data, please contact us at{' '}
          <a
            href="mailto:privacy@ideorahq.top"
            className="font-semibold text-brand-royal hover:underline"
          >
            privacy@ideorahq.top
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: '9. Your Privacy Rights',
    content: (
      <>
        <p>
          Depending on your location, you may have rights to access, correct, update, or
          request deletion of your personal information, or to withdraw consent for optional
          profile fields.
        </p>
        <p>
          If you signed in using Google OAuth, you may also revoke IDEORA&rsquo;s access at
          any time through your Google Account security settings.
        </p>
      </>
    ),
  },
  {
    id: 'cookies-and-analytics',
    title: '10. Cookies, Local Storage & Analytics',
    content: (
      <>
        <p>
          IDEORA does <strong>not</strong> currently run third-party advertising cookies or
          behavioral analytics trackers (such as Google Analytics or ad pixels).
        </p>
        <p>
          Essential browser storage managed by Supabase Auth is used strictly to maintain your
          authenticated session and keep you signed in securely.
        </p>
      </>
    ),
  },
  {
    id: 'international-transfers',
    title: '11. International Data Transfers & Children’s Privacy',
    content: (
      <>
        <p>
          <strong>International Transfers:</strong> IDEORA operates initially from Nigeria and
          serves builders internationally. Because Supabase and Vercel operate cloud
          infrastructure across multiple regions, your data may be processed in jurisdictions
          outside your country of residence.
        </p>
        <p>
          <strong>Children&rsquo;s Privacy:</strong> IDEORA is intended for users aged 16 and
          older (or the minimum age required to consent to data processing in your
          jurisdiction). We do not knowingly collect personal data from children under that
          age.
        </p>
      </>
    ),
  },
  {
    id: 'changes-and-contact',
    title: '12. Policy Updates & Contact Information',
    content: (
      <>
        <p>
          We may update this Privacy Policy as IDEORA evolves. When we make material changes,
          we will update the &ldquo;Last Updated&rdquo; date at the top of this page.
        </p>
        <p>
          For privacy questions, data access requests, or deletion enquiries, contact us at{' '}
          <a
            href="mailto:privacy@ideorahq.top"
            className="font-semibold text-brand-royal hover:underline"
          >
            privacy@ideorahq.top
          </a>
          .
        </p>
      </>
    ),
  },
];

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="bg-surface-soft py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-10 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal">
            <ShieldCheck className="h-3.5 w-3.5" />
            Legal &amp; Privacy
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-light tracking-tight text-typography-navy font-heading">
            IDEORA Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-typography-slate max-w-2xl leading-relaxed">
            How IDEORA handles account credentials, Google Sign-In identity data, builder
            profiles, published ideas, and direct collaborations.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-typography-muted">
            <span>
              <strong className="text-typography-navy">Last Updated:</strong> {LAST_UPDATED}
            </span>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/terms"
              className="inline-flex items-center gap-1 font-semibold text-brand-royal hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              Read Terms of Service
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {/* Content Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 rounded-2xl border border-surface-border bg-surface-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-typography-navy mb-3">
              Contents
            </h2>
            <nav aria-label="Privacy Policy sections">
              <ul className="space-y-1.5">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-lg px-2.5 py-1.5 text-xs font-medium text-typography-slate hover:bg-brand-ice/60 hover:text-brand-royal transition-colors"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-5 border-t border-surface-border pt-4">
              <a
                href="mailto:privacy@ideorahq.top"
                className="inline-flex items-center gap-2 text-xs font-semibold text-brand-royal hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                privacy@ideorahq.top
              </a>
            </div>
          </aside>

          {/* Policy Body */}
          <article className="lg:col-span-8 space-y-6">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-typography-navy font-heading">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm text-typography-slate leading-relaxed">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
};

