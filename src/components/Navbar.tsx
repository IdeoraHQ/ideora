import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, PlusCircle, Github, Database } from 'lucide-react';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { useSupabaseStatus } from '@/hooks/useSupabaseStatus';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { isConfigured } = useSupabaseStatus();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="text-brand-royal group-hover:scale-105 transition-transform">
            <IdeoraLogo size={34} />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-typography-navy">
              IDEORA
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              isActive('/')
                ? 'bg-brand-ice text-brand-royal'
                : 'text-typography-slate hover:text-typography-navy hover:bg-surface-light'
            }`}
          >
            Overview
          </Link>
          <Link
            to="/explore"
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              isActive('/explore')
                ? 'bg-brand-ice text-brand-royal'
                : 'text-typography-slate hover:text-typography-navy hover:bg-surface-light'
            }`}
          >
            <Compass className="h-4 w-4" />
            Explore Ideas
          </Link>
        </nav>

        {/* Actions & Status */}
        <div className="flex items-center gap-3">
          {/* Supabase Status Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isConfigured
                ? 'bg-functional-success-light text-functional-success border-functional-success/30'
                : 'bg-functional-warning-light text-functional-warning border-functional-warning/30'
            }`}
            title={
              isConfigured
                ? 'Supabase connection verified'
                : 'Supabase credentials pending in .env.local'
            }
          >
            <Database className="h-3 w-3" />
            <span>{isConfigured ? 'Supabase Ready' : 'Supabase Pending'}</span>
          </div>

          <a
            href="https://github.com/IdeoraHQ/ideora"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-typography-slate hover:text-typography-navy rounded-lg hover:bg-surface-light transition-colors"
            title="GitHub Repository"
          >
            <Github className="h-5 w-5" />
          </a>

          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep transition-all hover:shadow-md"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Publish Idea</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
