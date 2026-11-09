import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface IdeaSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const IdeaSearch: React.FC<IdeaSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search by idea title, problem statement, keywords, or tags...',
  className,
}) => {
  return (
    <div className={cn('relative w-full', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-surface-border bg-surface-white py-2.5 pl-10 pr-9 text-xs sm:text-sm text-typography-navy placeholder-typography-muted shadow-2xs transition-all focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-pale/50"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-typography-muted hover:text-typography-navy transition-colors rounded-md"
          title="Clear search query"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

