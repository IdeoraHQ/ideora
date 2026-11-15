import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const HIDDEN_PATHS = ['/ai', '/admin/ai', '/auth', '/forgot-password', '/reset-password'];

export const FloatingAiLauncher: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isHidden = HIDDEN_PATHS.some(
    (prefix) =>
      location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
  );

  if (isHidden) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/ai')}
      aria-label="Ask ORA"
      title="Ask ORA — Your intelligent companion inside Ideora"
      className="fixed bottom-20 right-4 z-40 md:bottom-5 md:right-6 inline-flex items-center gap-2 rounded-full border border-brand-royal/25 bg-surface-white/95 px-3.5 py-2.5 text-xs font-semibold text-typography-navy shadow-lg shadow-brand-royal/15 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-royal/50 hover:bg-brand-royal hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-royal/40"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-royal text-white shadow-sm">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <span className="tracking-tight">Ask ORA</span>
    </button>
  );
};
