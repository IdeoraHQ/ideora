import React, { useEffect } from 'react';
import { Send, Loader2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  sending: boolean;
  disabled: boolean;
  disabledReason?: string;
  sendError: string | null;
  onDismissError: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  value,
  onChange,
  onSubmit,
  sending,
  disabled,
  disabledReason,
  sendError,
  onDismissError,
  textareaRef,
}) => {
  // Auto-resize textarea height up to 144px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [value, textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !sending && value.trim()) {
        onSubmit();
      }
    }
  };

  const canSend = Boolean(value.trim()) && !disabled && !sending;

  return (
    <div className="sticky bottom-0 z-20 px-3 py-2.5 sm:px-5 sm:py-3.5 bg-surface-white border-t border-surface-border shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      {sendError && (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light/60 px-3 py-2 text-xs text-functional-error"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{sendError}</span>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="rounded-md p-0.5 hover:bg-functional-error/10 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-1">
        <div
          className={cn(
            'flex items-end gap-2 rounded-3xl border bg-surface-soft pl-4 pr-2 py-1.5 transition-all',
            disabled
              ? 'border-surface-border opacity-75'
              : 'border-surface-border focus-within:border-brand-royal focus-within:bg-surface-white focus-within:ring-2 focus-within:ring-brand-royal/15'
          )}
        >
          <label htmlFor="message-composer-input" className="sr-only">
            Message input
          </label>
          <textarea
            id="message-composer-input"
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            enterKeyHint="send"
            rows={1}
            maxLength={5000}
            placeholder={
              disabled
                ? disabledReason || 'Messaging is disabled for this conversation.'
                : 'Type a message...'
            }
            className="flex-1 bg-transparent py-1.5 text-sm text-typography-navy placeholder-typography-muted resize-none focus:outline-none disabled:cursor-not-allowed max-h-36 leading-relaxed"
          />

          <button
            type="submit"
            disabled={!canSend}
            aria-label={sending ? 'Sending message' : 'Send message'}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-full transition-all shrink-0',
              canSend
                ? 'bg-brand-royal text-white shadow-xs hover:bg-brand-deep active:scale-95'
                : 'bg-surface-light text-typography-muted cursor-not-allowed'
            )}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] text-typography-muted">
          <span className="hidden sm:inline">
            Press <kbd className="font-sans font-medium text-typography-slate">Enter</kbd> to send,{' '}
            <kbd className="font-sans font-medium text-typography-slate">Shift + Enter</kbd> for a new line
          </span>
          <span className="sm:hidden">Tap send to deliver</span>
          {value.length > 4000 && (
            <span
              className={cn(
                'tabular-nums',
                value.length >= 4900 ? 'text-functional-warning font-medium' : ''
              )}
            >
              {value.length} / 5000
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

