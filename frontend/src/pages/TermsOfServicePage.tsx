import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldCheck, ArrowRight, Mail } from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';

interface TermsSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const LAST_UPDATED = 'November 13, 2026';

const sections: TermsSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: (
      <>
        <p>
          Welcome to <strong>IDEORA</strong> (available at{' '}
          <span className="font-medium text-typography-navy">https://ideorahq.top</span>).
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
          IDEORA website, application, and collaborative features.
        </p>
        <p>
          By accessing IDEORA, creating an account, or signing in via email or third-party
          OAuth (such as Google or GitHub), you agree to be bound by these Terms and our{' '}
          <Link to="/privacy" className="font-semibold text-brand-royal hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the platform.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: '2. Eligibility',
    content: (
      <>
        <p>
          You must be at least 16 years old (or the age of legal capacity to enter into binding
          agreements in your jurisdiction) to register for an IDEORA account and use the
          platform.
        </p>
        <p>
          By using IDEORA, you represent that the registration details you provide are accurate
          and that your use complies with applicable local and international laws.
        </p>
      </>
    ),
  },
  {
    id: 'accounts-and-security',
    title: '3. User Accounts & Account Security',
    content: (
      <>
        <p>
          To publish ideas, submit collaboration requests, or message other builders, you must
          register an account and verify your identity through Supabase Auth (via email
          verification or supported OAuth providers such as Google or GitHub).
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>You are responsible for safeguarding your login credentials and session access.</li>
          <li>You must not impersonate another person, misrepresent your role, or attempt to gain unauthorized administrative privileges.</li>
          <li>Notify us promptly if you suspect unauthorized access to your account.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'idea-ownership',
    title: '4. Idea Ownership & Intellectual Property',
    content: (
      <>
        <p>
          <strong>You retain full ownership of your original ideas and content.</strong>{' '}
          Publishing an idea, project summary, description, or comment on IDEORA does{' '}
          <strong>not</strong> transfer ownership or intellectual property rights to IDEORA or
          to any other user.
        </p>
        <p>
          <strong>Limited Hosting Licence:</strong> By submitting content to IDEORA, you grant
          IDEORA a non-exclusive, worldwide, royalty-free, revocable licence solely to host,
          store, reproduce, format, and display that content within the platform as needed to
          operate your account and the features you choose to use (such as public idea pages or
          shared project workspaces). This licence ends when you remove the content or delete
          your account, subject to reasonable backup and moderation-record retention.
        </p>
        <p>
          <strong>No Confidentiality Guarantee:</strong> Ideas published publicly on IDEORA can
          be read by other users and visitors. IDEORA cannot prevent third parties from viewing
          or independently building upon publicly posted concepts. Any formal confidentiality,
          equity, or IP-assignment agreements must be executed directly between collaborating
          parties.
        </p>
      </>
    ),
  },
  {
    id: 'user-content-and-collaboration',
    title: '5. User-Generated Content & Collaborations',
    content: (
      <>
        <p>
          You are solely responsible for the ideas, comments, messages, profile links, and
          project materials you submit on IDEORA. You represent that you have the necessary
          rights to share any content you post.
        </p>
        <p>
          IDEORA provides discovery, collaboration-request, project-workspace, and messaging
          tools to help founders and builders connect. However, IDEORA is{' '}
          <strong>not</strong> a party to agreements between users and does{' '}
          <strong>not</strong> guarantee funding, investment, employment, co-founder matches,
          or the success of any collaboration or venture.
        </p>
      </>
    ),
  },
  {
    id: 'prohibited-activities',
    title: '6. Prohibited Activities & Misuse',
    content: (
      <>
        <p>When using IDEORA, you agree not to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Post unlawful, fraudulent, defamatory, harassing, hateful, or infringing content.</li>
          <li>Spam users with unsolicited commercial promotions, phishing links, or automated scraping.</li>
          <li>Attempt to bypass Row-Level Security (RLS), escalate account privileges, abuse reporting workflows, or interfere with platform infrastructure.</li>
          <li>Submit false abuse reports or create duplicate accounts to evade a suspension or ban.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'moderation-and-termination',
    title: '7. Reporting, Moderation & Account Suspension',
    content: (
      <>
        <p>
          Users may report ideas, comments, profiles, or projects that violate these Terms.
          IDEORA administrators review reports and may approve, reject, or remove content, or
          suspend or ban accounts where reasonably necessary to protect platform integrity and
          user safety.
        </p>
        <p>
          If your account is suspended or banned, restricted actions across the platform may be
          disabled. You may stop using IDEORA at any time.
        </p>
      </>
    ),
  },
  {
    id: 'availability-and-changes',
    title: '8. Platform Availability & Service Changes',
    content: (
      <>
        <p>
          IDEORA is an evolving platform. We may modify, suspend, or discontinue features,
          perform maintenance, or update these Terms from time to time. Continued use of
          IDEORA after updated Terms are posted constitutes acceptance of the revised Terms.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimers-and-liability',
    title: '9. Disclaimers & Limitation of Liability',
    content: (
      <>
        <p>
          IDEORA is provided on an <strong>&ldquo;AS IS&rdquo;</strong> and{' '}
          <strong>&ldquo;AS AVAILABLE&rdquo;</strong> basis without warranties of any kind,
          express or implied, including implied warranties of merchantability, fitness for a
          particular purpose, or non-infringement.
        </p>
        <p>
          To the fullest extent permitted by applicable law, IDEORA and its operators shall not
          be liable for any indirect, incidental, special, consequential, or punitive damages,
          or any loss of profits, data, business opportunities, or goodwill arising from your
          use of the platform or interactions with other users.
        </p>
      </>
    ),
  },
  {
    id: 'governing-law',
    title: '10. Governing Law & Dispute Resolution',
    content: (
      <>
        <p>
          These Terms are governed by the laws of the <strong>Federal Republic of Nigeria</strong>,
          without regard to conflict-of-law principles, while recognizing that mandatory
          consumer protection laws in your country of residence may also apply where required
          by law.
        </p>
        <p>
          Before initiating formal legal proceedings, we encourage you to contact us so we can
          attempt to resolve any dispute informally in good faith.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: '11. Contact Information',
    content: (
      <>
        <p>
          For questions about these Terms of Service, moderation decisions, or legal
          enquiries, contact us at{' '}
          <a
            href="mailto:hello@ideorahq.top"
            className="font-semibold text-brand-royal hover:underline"
          >
            hello@ideorahq.top
          </a>
          .
        </p>
      </>
    ),
  },
];

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="bg-surface-soft py-12 sm:py-16">
      <SeoHead
        title="Terms of Service | Ideora"
        description="Review the Ideora Terms of Service governing idea publishing, collaboration, user conduct, and platform usage."
        canonicalPath="/terms"
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-10 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal">
            <FileText className="h-3.5 w-3.5" />
            Terms &amp; Conditions
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-light tracking-tight text-typography-navy font-heading">
            IDEORA Terms of Service
          </h1>
          <p className="mt-2 text-sm text-typography-slate max-w-2xl leading-relaxed">
            Rules governing account usage, idea ownership, collaborations, moderation, and
            platform responsibilities on IDEORA.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-typography-muted">
            <span>
              <strong className="text-typography-navy">Last Updated:</strong> {LAST_UPDATED}
            </span>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-1 font-semibold text-brand-royal hover:underline"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Read Privacy Policy
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
            <nav aria-label="Terms of Service sections">
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
                href="mailto:hello@ideorahq.top"
                className="inline-flex items-center gap-2 text-xs font-semibold text-brand-royal hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                hello@ideorahq.top
              </a>
            </div>
          </aside>

          {/* Terms Body */}
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

