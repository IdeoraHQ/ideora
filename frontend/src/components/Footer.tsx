import React from 'react';
import { IdeoraLogo } from '@/components/IdeoraLogo';
import { Github, Twitter, Linkedin, MessageSquare } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-typography-navy text-typography-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand & Slogan */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="text-brand-light">
              <IdeoraLogo size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-light tracking-tight text-white font-heading">
                IDEORA
              </h3>
              <p className="text-sm font-normal text-brand-pale">
                Where ideas find their builders.
              </p>
            </div>
          </div>

          {/* Social Links from Palette Specification */}
          <div className="flex items-center gap-5 text-brand-pale">
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              aria-label="X (Twitter)"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/IdeoraHQ/ideora"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Discord"
            >
              <MessageSquare className="h-5 w-5" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-pale/70">
          <p>&copy; {new Date().getFullYear()} IDEORA. All rights reserved.</p>
          <p>Collaborative ecosystem for unfinished ideas and active builders.</p>
        </div>
      </div>
    </footer>
  );
};
