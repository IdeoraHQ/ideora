import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 text-center bg-surface-soft">
      <span className="rounded-full bg-brand-ice border border-brand-pale px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal">
        404 Not Found
      </span>
      <h1 className="mt-4 text-3xl sm:text-5xl font-light text-typography-navy tracking-tight">
        Page Not Found
      </h1>
      <p className="mt-3 text-sm text-typography-slate max-w-md font-normal leading-relaxed">
        The page you are looking for doesn&apos;t exist or has moved to another orbit.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep shadow-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Home
      </Link>
    </div>
  );
};
