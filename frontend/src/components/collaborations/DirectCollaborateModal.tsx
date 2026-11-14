import React, { useEffect, useState } from 'react';
import { X, Send, Loader2, AlertCircle, CheckCircle2, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomSelect } from '@/components/common/CustomSelect';
import { submitCollaborationRequest, fetchUserIdeas } from '@/services/api';
import { Idea } from '@/types';

const PURPOSE_OPTIONS = [
  { label: 'Looking for a technical collaborator', value: 'Looking for a technical collaborator' },
  { label: 'Looking for a frontend / UI collaborator', value: 'Looking for a frontend / UI collaborator' },
  { label: 'Looking to contribute my skills to a project', value: 'Looking to contribute my skills to a project' },
  { label: 'Exploring a new idea together', value: 'Exploring a new idea together' },
  { label: 'Looking for a co-founder', value: 'Looking for a co-founder' },
  { label: 'Custom purpose...', value: '__custom__' },
];

export interface DirectCollaborateRecipient {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  skills?: string[];
  preferred_roles?: string[];
}

interface DirectCollaborateModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: DirectCollaborateRecipient | null;
  onSuccess?: () => void;
}

export const DirectCollaborateModal: React.FC<DirectCollaborateModalProps> = ({
  isOpen,
  onClose,
  recipient,
  onSuccess,
}) => {
  const { profile, isAuthenticated } = useAuth();
  const [purposeSelect, setPurposeSelect] = useState(PURPOSE_OPTIONS[0].value);
  const [customPurpose, setCustomPurpose] = useState('');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>('');
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(false);
    setPurposeSelect(PURPOSE_OPTIONS[0].value);
    setCustomPurpose('');
    setSelectedIdeaId('');
    setMessage('');
    setSkillInput('');
    setSkillsOffered(profile?.skills?.slice(0, 5) ?? []);

    if (profile?.id) {
      fetchUserIdeas(profile.id)
        .then(({ data }) => {
          setMyIdeas((data || []).filter((i) => i.status !== 'draft'));
        })
        .catch(() => {
          setMyIdeas([]);
        });
    }
  }, [isOpen, profile?.id, profile?.skills]);

  if (!isOpen || !recipient) return null;

  const displayName = recipient.full_name || recipient.username || 'this builder';
  const resolvedPurpose =
    purposeSelect === '__custom__' ? customPurpose.trim() : purposeSelect;

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (!skillsOffered.includes(trimmed)) {
      setSkillsOffered((prev) => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsOffered((prev) => prev.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !profile) {
      setError('Please sign in to send a collaboration request.');
      return;
    }
    if (!resolvedPurpose) {
      setError('Please choose or enter a collaboration purpose.');
      return;
    }
    if (message.trim().length < 15) {
      setError('Please write a short message (at least 15 characters) explaining how you want to collaborate.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: submitErr } = await submitCollaborationRequest({
      recipient_id: recipient.id,
      idea_id: selectedIdeaId || null,
      request_type: selectedIdeaId ? 'idea_based' : 'general',
      purpose: resolvedPurpose,
      skills_offered: skillsOffered,
      message: message.trim(),
    });

    setSubmitting(false);

    if (submitErr) {
      setError(submitErr.message || 'Could not send collaboration request.');
      return;
    }

    setSuccess(true);
    onSuccess?.();
    setTimeout(() => {
      onClose();
    }, 1100);
  };

  const ideaOptions = [
    { label: 'None — General collaboration (no specific idea)', value: '' },
    ...myIdeas.map((idea) => ({
      label: idea.title,
      value: idea.id,
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="direct-collab-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface-white border border-surface-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-soft/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="direct-collab-title"
                className="text-base font-bold text-typography-navy font-heading truncate"
              >
                Collaborate with {displayName}
              </h2>
              <p className="text-xs text-typography-muted truncate">
                Send a direct collaboration request — no published idea required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-typography-muted hover:text-typography-navy hover:bg-surface-soft transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-functional-error-light border border-functional-error/20 px-3.5 py-2.5 text-xs text-functional-error">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 rounded-xl bg-functional-success-light border border-functional-success/20 px-3.5 py-2.5 text-xs font-medium text-functional-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Collaboration request sent to {displayName}!</span>
            </div>
          )}

          {/* Purpose */}
          <div className="space-y-1.5">
            <CustomSelect
              label="Collaboration Purpose"
              options={PURPOSE_OPTIONS}
              value={purposeSelect}
              onChange={setPurposeSelect}
            />
            {purposeSelect === '__custom__' && (
              <input
                type="text"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                placeholder="e.g., Looking for a backend engineer for an AI study tool"
                maxLength={120}
                className="mt-2 w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2.5 text-sm text-typography-navy placeholder:text-typography-muted focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
              />
            )}
          </div>

          {/* Optional Related Idea */}
          {myIdeas.length > 0 && (
            <div>
              <CustomSelect
                label="Related Idea (Optional)"
                options={ideaOptions}
                value={selectedIdeaId}
                onChange={setSelectedIdeaId}
              />
            </div>
          )}

          {/* Skills / Contribution Offered */}
          <div>
            <label className="block text-xs font-semibold text-typography-navy mb-1.5">
              Skills or Contribution You Can Offer
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add a skill (e.g., React, Product Design, Go)"
                className="flex-1 rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-sm text-typography-navy placeholder:text-typography-muted focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="inline-flex items-center gap-1 rounded-xl border border-surface-border bg-surface-soft px-3 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-border/40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            {skillsOffered.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skillsOffered.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-ice px-2.5 py-1 text-xs font-medium text-brand-royal"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-typography-navy"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="direct-collab-message"
              className="block text-xs font-semibold text-typography-navy mb-1.5"
            >
              Message
            </label>
            <textarea
              id="direct-collab-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Introduce yourself to ${displayName} and explain why you'd like to collaborate...`}
              required
              className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2.5 text-sm text-typography-navy placeholder:text-typography-muted focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal/20 resize-none"
            />
            <p className="mt-1 text-[11px] text-typography-muted">
              Once accepted, a direct conversation opens in Messages.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-typography-slate hover:bg-surface-soft transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

