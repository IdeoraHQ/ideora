import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import type { AiNavigationAction } from '@/services/api';

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

function isTableRow(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|') && line.includes('|');
}

function isTableSeparator(line: string): boolean {
  return /^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(line);
}

function parseTableCells(line: string): string[] {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(\/[^)\s]+\))/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-typography-navy">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-[11px] text-brand-royal border border-surface-border/70"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\((\/[^)\s]+)\)$/);
    if (linkMatch && isSafeInternalPath(linkMatch[2])) {
      return (
        <Link
          key={idx}
          to={linkMatch[2]}
          className="font-semibold text-brand-royal underline decoration-brand-royal/40 underline-offset-2 hover:text-brand-deep"
        >
          {linkMatch[1]}
        </Link>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const AiMessageContent: React.FC<{
  content: string;
  navigationActions?: AiNavigationAction[];
}> = ({ content, navigationActions }) => {
  const navigate = useNavigate();
  const lines = content.split('\n');
  const safeActions = (navigationActions || []).filter(
    (action) =>
      action &&
      typeof action.path === 'string' &&
      isSafeInternalPath(action.path) &&
      typeof action.label === 'string'
  );

  const blocks: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (!line) {
      blocks.push(<div key={`sp-${i}`} className="h-1" />);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      blocks.push(<hr key={`hr-${i}`} className="my-2 border-surface-border" />);
      continue;
    }

    // Markdown table block
    if (isTableRow(line)) {
      const tableRows: string[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          j += 1;
          continue;
        }
        if (isTableRow(nextLine)) {
          tableRows.push(nextLine);
          j += 1;
        } else {
          break;
        }
      }

      if (tableRows.length >= 2 && isTableSeparator(tableRows[1])) {
        const headers = parseTableCells(tableRows[0]);
        const bodyRows = tableRows.slice(2).map(parseTableCells);
        blocks.push(
          <div
            key={`tbl-${i}`}
            className="my-2 overflow-x-auto rounded-xl border border-surface-border bg-surface-soft/50"
          >
            <table className="w-full border-collapse text-left text-[11px] sm:text-xs">
              <thead className="bg-surface-light/80 border-b border-surface-border">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-3 py-2 font-semibold text-typography-navy whitespace-nowrap"
                    >
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/70">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-surface-white/60">
                    {headers.map((_, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-typography-charcoal align-top">
                        {renderInlineFormatting(row[cIdx] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = j - 1;
        continue;
      }
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h4
          key={`h4-${i}`}
          className="pt-1 text-xs sm:text-sm font-semibold text-typography-navy"
        >
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      const text = line.replace(/^#{1,3}\s+/, '');
      blocks.push(
        <h3
          key={`h3-${i}`}
          className="pt-1.5 text-sm sm:text-base font-semibold text-typography-navy font-heading"
        >
          {renderInlineFormatting(text)}
        </h3>
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push(
        <div key={`ul-${i}`} className="flex items-start gap-2 pl-1">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-royal shrink-0" />
          <p className="flex-1">{renderInlineFormatting(line.slice(2))}</p>
        </div>
      );
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      blocks.push(
        <div key={`ol-${i}`} className="flex items-start gap-2 pl-1">
          <span className="font-semibold text-brand-royal tabular-nums shrink-0">
            {numberedMatch[1]}.
          </span>
          <p className="flex-1">{renderInlineFormatting(numberedMatch[2])}</p>
        </div>
      );
      continue;
    }

    blocks.push(<p key={`p-${i}`}>{renderInlineFormatting(line)}</p>);
  }

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-typography-charcoal break-words">
      {blocks}

      {safeActions.length > 0 && (
        <div className="pt-2 space-y-2">
          {safeActions.map((action) => (
            <div
              key={action.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-brand-royal/20 bg-brand-ice/40 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-typography-navy">
                  <Compass className="h-3.5 w-3.5 text-brand-royal shrink-0" />
                  <span className="truncate">{action.label}</span>
                </div>
                {action.description && (
                  <p className="mt-0.5 text-[11px] text-typography-slate line-clamp-2">
                    {action.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate(action.path)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-royal px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-brand-deep transition-colors shrink-0"
              >
                <span>Open {action.label}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
