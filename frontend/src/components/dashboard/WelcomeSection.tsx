import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const WelcomeSection: React.FC = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Builder';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
      {/* Subtle brand tint gradient accent */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 h-44 w-44 rounded-full bg-brand-ice/80 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-ice border border-brand-pale px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-royal mb-3">
            <Sparkles className="h-3 w-3" />
            <span>Builder Workspace</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-light text-typography-navy tracking-tight font-heading leading-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm sm:text-base font-normal text-typography-slate leading-relaxed">
            Your next great collaboration could start with an idea. Discover verified concepts, connect with co-founders, or advance your active initiatives.
          </p>
        </div>

        <div className="shrink-0">
          <Link
            to="/ideas/new"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-brand-royal/20 hover:bg-brand-deep active:scale-95 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Publish an Idea</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

