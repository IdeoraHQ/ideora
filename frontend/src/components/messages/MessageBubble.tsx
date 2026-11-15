import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Ban,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { Message } from '@/types';
import { cn } from '@/utils/cn';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isGroupedWithPrevious: boolean;
  isRequestClosed: boolean;
  onEditMessage: (messageId: string, newBody: string) => Promise<string | null>;
  onDeleteMessage: (messageId: string) => Promise<string | null>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMine,
  isGroupedWithPrevious,
  isRequestClosed,
  onEditMessage,
  onDeleteMessage,
}) => {
  const isDeleted = Boolean(message.deleted_at);
  const isEdited = Boolean(message.edited_at) && !isDeleted;
  const canModify = isMine && !isDeleted && !isRequestClosed;

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.body);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Close actions menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  // Focus edit textarea when entering edit mode
  useEffect(() => {
    if (isEditing) {
      editTextareaRef.current?.focus();
      const len = editTextareaRef.current?.value.length ?? 0;
      editTextareaRef.current?.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Cancel editing/deleting automatically if message becomes deleted via realtime
  useEffect(() => {
    if (isDeleted) {
      setIsEditing(false);
      setConfirmingDelete(false);
      setMenuOpen(false);
    }
  }, [isDeleted]);

  const startEditing = () => {
    setMenuOpen(false);
    setConfirmingDelete(false);
    setEditDraft(message.body);
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditDraft(message.body);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setEditError('Message cannot be empty.');
      return;
    }
    if (trimmed.length > 5000) {
      setEditError('Message exceeds the 5,000 character limit.');
      return;
    }
    if (trimmed === message.body.trim()) {
      setIsEditing(false);
      setEditError(null);
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    const errMsg = await onEditMessage(message.id, trimmed);
    setSavingEdit(false);

    if (errMsg) {
      // Keep user's edited draft intact so they can retry
      setEditError(errMsg);
    } else {
      setIsEditing(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const startDeleteConfirm = () => {
    setMenuOpen(false);
    setIsEditing(false);
    setDeleteError(null);
    setConfirmingDelete(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const errMsg = await onDeleteMessage(message.id);
    setDeleting(false);

    if (errMsg) {
      setDeleteError(errMsg);
    } else {
      setConfirmingDelete(false);
    }
  };

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'group flex flex-col max-w-[88%] sm:max-w-[72%]',
        isGroupedWithPrevious ? 'mt-1' : 'mt-3.5',
        isMine ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      {/* Bubble + Contextual Actions Row */}
      <div
        className={cn(
          'flex items-center gap-1.5 w-full',
          isMine ? 'justify-end' : 'justify-start'
        )}
      >
        {/* Contextual Actions Trigger (left of sender bubble) */}
        {canModify && !isEditing && !confirmingDelete && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Message actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg text-typography-muted hover:bg-surface-light hover:text-typography-navy focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal/40 transition-all',
                menuOpen
                  ? 'opacity-100 bg-surface-light text-typography-navy'
                  : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Message options"
                className="absolute right-0 bottom-full mb-1 z-30 w-36 rounded-xl border border-surface-border bg-surface-white p-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={startEditing}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-typography-navy hover:bg-surface-soft transition-colors text-left"
                >
                  <Pencil className="h-3.5 w-3.5 text-typography-slate" />
                  Edit
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={startDeleteConfirm}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-functional-error hover:bg-functional-error-light/60 transition-colors text-left"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Message Content / Edit Mode / Deleted Placeholder */}
        {isEditing ? (
          <div className="w-full min-w-[240px] sm:min-w-[320px] rounded-2xl border border-brand-royal bg-surface-white p-3 shadow-sm space-y-2">
            <label htmlFor={`edit-msg-${message.id}`} className="sr-only">
              Edit message
            </label>
            <textarea
              id={`edit-msg-${message.id}`}
              ref={editTextareaRef}
              value={editDraft}
              onChange={(e) => {
                setEditDraft(e.target.value);
                if (editError) setEditError(null);
              }}
              onKeyDown={handleEditKeyDown}
              disabled={savingEdit}
              rows={3}
              maxLength={5000}
              className="w-full rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs sm:text-sm text-typography-navy placeholder-typography-muted resize-y focus:bg-surface-white focus:outline-none focus:border-brand-royal"
            />
            {editError && (
              <div className="flex items-center gap-1.5 text-[11px] text-functional-error">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-typography-muted">
                Enter to save · Esc to cancel
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={savingEdit}
                  className="rounded-lg border border-surface-border px-2.5 py-1 text-xs font-medium text-typography-slate hover:bg-surface-soft hover:text-typography-navy transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveEdit()}
                  disabled={savingEdit || !editDraft.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-royal px-3 py-1 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-50 transition-colors"
                >
                  {savingEdit && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : isDeleted ? (
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-2xl border border-dashed px-3.5 py-2 text-xs italic',
              isMine
                ? 'border-surface-border bg-surface-soft text-typography-muted rounded-br-xs'
                : 'border-surface-border bg-surface-white/70 text-typography-muted rounded-bl-xs'
            )}
          >
            <Ban className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <span>This message was deleted.</span>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13.5px] leading-relaxed break-words max-w-full',
              isMine
                ? 'bg-brand-royal text-white rounded-br-xs shadow-xs'
                : 'bg-surface-white text-typography-navy border border-surface-border rounded-bl-xs shadow-2xs'
            )}
          >
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</p>
          </div>
        )}
      </div>

      {/* Inline Delete Confirmation */}
      {confirmingDelete && !isDeleted && (
        <div
          role="alertdialog"
          aria-label="Delete this message?"
          className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border border-functional-error/30 bg-surface-white px-3 py-2 text-xs shadow-sm"
        >
          <span className="font-medium text-typography-navy">Delete this message?</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false);
                setDeleteError(null);
              }}
              disabled={deleting}
              className="rounded-lg border border-surface-border px-2.5 py-1 text-[11px] font-medium text-typography-slate hover:bg-surface-soft transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDelete()}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-lg bg-functional-error px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
              Delete
            </button>
          </div>
          {deleteError && (
            <p className="w-full text-[11px] text-functional-error">{deleteError}</p>
          )}
        </div>
      )}

      {/* Timestamp, Edited Label & Read Receipt */}
      <div
        className={cn(
          'flex items-center gap-1.5 mt-1 px-1 text-[10px] text-typography-muted select-none',
          isMine ? 'justify-end' : 'justify-start'
        )}
      >
        <span className="tabular-nums">{formattedTime}</span>
        {isEdited && (
          <span
            title={
              message.edited_at
                ? `Edited at ${new Date(message.edited_at).toLocaleString()}`
                : 'Edited'
            }
            className="text-[10px] text-typography-muted"
          >
            · Edited
          </span>
        )}
        {isMine && !isDeleted && (
          <span
            title={
              message.read_at
                ? `Read ${new Date(message.read_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Sent'
            }
            aria-label={message.read_at ? 'Read' : 'Sent'}
            className="inline-flex items-center"
          >
            {message.read_at ? (
              <CheckCheck className="h-3 w-3 text-brand-royal" />
            ) : (
              <Check className="h-3 w-3 text-typography-muted" />
            )}
          </span>
        )}
      </div>
    </div>
  );
};

