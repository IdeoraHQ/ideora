import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings,
  Save,
} from 'lucide-react';
import {
  fetchAdminPlatformSettings,
  adminUpdatePlatformSetting,
} from '@/services/api/admin';
import type { Json, PlatformSetting } from '@/types';
import { cn } from '@/utils/cn';

function isBooleanSetting(value: Json): value is { enabled: boolean; message?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).enabled === 'boolean'
  );
}

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, Json>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchAdminPlatformSettings();
    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load platform settings.');
    } else {
      setSettings(data);
      const initialDrafts: Record<string, Json> = {};
      data.forEach((s) => {
        initialDrafts[s.key] = s.value;
      });
      setDraftValues(initialDrafts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleToggle = (key: string, current: { enabled: boolean; message?: string }) => {
    setDraftValues((prev) => ({
      ...prev,
      [key]: { ...current, enabled: !current.enabled },
    }));
  };

  const handleMessageChange = (
    key: string,
    current: { enabled: boolean; message?: string },
    message: string
  ) => {
    setDraftValues((prev) => ({
      ...prev,
      [key]: { ...current, message },
    }));
  };

  const handleSaveSetting = async (key: string) => {
    if (savingKey) return;
    setSavingKey(key);
    setSaveMsg(null);
    setSaveErr(null);

    const { data, error: err } = await adminUpdatePlatformSetting({
      key,
      value: draftValues[key],
      reason: reasons[key],
    });

    setSavingKey(null);
    if (err || !data) {
      setSaveErr(err?.message || `Failed to update "${key}".`);
      return;
    }

    setSaveMsg(`Updated setting "${key}" and recorded audit log.`);
    setReasons((prev) => ({ ...prev, [key]: '' }));
    await loadSettings();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-typography-navy font-heading tracking-tight">
            Platform Configuration
          </h1>
          <p className="text-xs text-typography-slate mt-0.5">
            Manage global IDEORA feature flags and operational controls.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-soft transition-colors disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-4 text-xs font-semibold text-functional-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {saveErr && (
        <div className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-4 text-xs font-semibold text-functional-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{saveErr}</span>
        </div>
      )}
      {saveMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{saveMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-surface-border bg-surface-white p-12 flex items-center justify-center gap-2 text-sm text-typography-slate">
          <Loader2 className="h-5 w-5 animate-spin text-brand-royal" />
          <span>Loading platform settings...</span>
        </div>
      ) : settings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-white p-12 text-center">
          <p className="text-sm font-semibold text-typography-navy">
            No platform settings found.
          </p>
          <p className="mt-1 text-xs text-typography-slate">
            Apply migration 20261113000013_admin_center_completion.sql to seed configurable platform settings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((setting) => {
            const draft = draftValues[setting.key] ?? setting.value;
            const boolDraft = isBooleanSetting(draft) ? draft : null;

            return (
              <div
                key={setting.key}
                className="rounded-2xl border border-surface-border bg-surface-white p-5 sm:p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-royal shrink-0">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-typography-navy">
                        {setting.key.replace(/_/g, ' ')}
                      </h2>
                      <p className="text-xs text-typography-slate mt-0.5">
                        {setting.description}
                      </p>
                    </div>
                  </div>

                  {boolDraft && (
                    <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={boolDraft.enabled}
                        onChange={() => handleToggle(setting.key, boolDraft)}
                        className="h-4 w-4 rounded border-surface-border text-brand-royal focus:ring-brand-royal"
                      />
                      <span className="text-xs font-semibold text-typography-navy">
                        {boolDraft.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  )}
                </div>

                {boolDraft && typeof boolDraft.message === 'string' && (
                  <input
                    type="text"
                    value={boolDraft.message}
                    onChange={(e) =>
                      handleMessageChange(setting.key, boolDraft, e.target.value)
                    }
                    placeholder="Maintenance banner message..."
                    className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-white focus:outline-none"
                  />
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                  <input
                    type="text"
                    value={reasons[setting.key] ?? ''}
                    onChange={(e) =>
                      setReasons((prev) => ({
                        ...prev,
                        [setting.key]: e.target.value,
                      }))
                    }
                    placeholder="Optional change reason (logged to audit trail)..."
                    className="flex-1 rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveSetting(setting.key)}
                    disabled={savingKey === setting.key}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors disabled:opacity-60"
                  >
                    {savingKey === setting.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save Setting</span>
                  </button>
                </div>

                <p className="text-[11px] text-typography-muted">
                  Last updated {new Date(setting.updated_at).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

