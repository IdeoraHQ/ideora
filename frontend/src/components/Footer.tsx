import React from 'react';
import { Link } from 'react-router-dom';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { Github, MessageSquare } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0F172A] text-white py-12 border-t border-surface-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand & Slogan */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="text-brand-light">
              <IdeoraLogo size={40} />
            </div>
            <div>
              <p className="text-2xl font-light tracking-tight text-white font-heading">
                IDEORA
              </p>
              <p className="text-sm font-normal text-slate-300">
                Where ideas find their builders.
              </p>
            </div>
          </div>

          {/* Social Links from Palette Specification */}
          <div className="flex items-center gap-5 text-slate-300">
            <a
              href="https://x.com/Naijapins27"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              aria-label="X (Twitter)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com/IdeoraHQ/ideora"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://discord.gg/SwaJqVftV"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Discord"
            >
              <MessageSquare className="h-5 w-5" />
            </a>
            <a
              href="https://www.threads.net/@alpha.wolf2704"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Threads"
            >
              <svg
                viewBox="0 0 192 192"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.131-57.318C56.951 24.424 74.202 17.109 97.01 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.195 47.292 9.643 32.788 28.08 19.882 44.485 13.224 67.315 13.001 95.932L13 96v.067c.224 28.617 6.882 51.447 19.788 67.854C47.292 182.358 68.882 191.806 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.19 18.963-18.945 18.392-42.691 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.552Zm-43.095 40.519c-10.44.588-21.286-4.098-21.82-14.135-.397-7.442 5.296-15.746 22.461-16.735 1.966-.113 3.895-.169 5.79-.169 6.235 0 12.068.606 17.37 1.765-1.978 24.702-13.58 28.713-23.801 29.274Z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} IDEORA. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Home
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/explore"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Explore Ideas
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/people"
              className="text-slate-300 hover:text-white transition-colors"
            >
              People
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/about"
              className="text-slate-300 hover:text-white transition-colors"
            >
              About
            </Link>
            <span aria-hidden="true">&bull;</span>
            <a
              href="mailto:hello@ideorahq.top"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Contact
            </a>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/privacy"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/terms"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <span className="hidden sm:inline" aria-hidden="true">
              &bull;
            </span>
            <span className="hidden sm:inline">
              Collaborative ecosystem for unfinished ideas and active builders.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
