import React, { useEffect, useState, useCallback } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Bell,
  ShieldCheck,
  LogOut,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  KeyRound,
  ExternalLink,
  Calendar,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase/client';
import {
  updateCurrentProfile,
  updateUserPassword,
  requestPasswordReset,
  fetchUserSettings,
  updateUserSettings,
  uploadUserAvatar,
  fetchPendingDeletionRequest,
  requestAccountDeletion,
  cancelAccountDeletionRequest,
} from '@/services/api';
import { CustomSelect } from '@/components/common';
import type {
  AccountDeletionRequest,
  SkillCategory,
  UserRole,
} from '@/types';
import { cn } from '@/utils/cn';

const SKILL_OPTIONS: Array<{ label: string; value: SkillCategory }> = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Fullstack', value: 'fullstack' },
  { label: 'UI/UX Design', value: 'design' },
  { label: 'Product', value: 'product' },
  { label: 'AI / ML', value: 'ai' },
  { label: 'Marketing / Growth', value: 'marketing' },
];

const ROLE_OPTIONS = [
  { label: 'Idea Founder', value: 'founder' },
  { label: 'Collaborator / Builder', value: 'collaborator' },
];

export const SettingsPage: React.FC = () => {
  const { profile, loading: authLoading, isAuthenticated, refreshProfile, signOut } =
    useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Auth user metadata (email, providers, created_at)
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authProviders, setAuthProviders] = useState<string[]>([]);
  const [authCreatedAt, setAuthCreatedAt] = useState<string>('');

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [roleFocus, setRoleFocus] = useState<'founder' | 'collaborator'>('collaborator');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Notification preferences state
  const [notifyCollab, setNotifyCollab] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyIdeaActivity, setNotifyIdeaActivity] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsErr, setSettingsErr] = useState<string | null>(null);

  // Security / Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  // Account deletion request state
  const [pendingDeletion, setPendingDeletion] =
    useState<AccountDeletionRequest | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [processingDeletion, setProcessingDeletion] = useState(false);
  const [deletionMsg, setDeletionMsg] = useState<string | null>(null);
  const [deletionErr, setDeletionErr] = useState<string | null>(null);

  const loadAccountData = useCallback(async () => {
    setLoadingSettings(true);
    const [{ data: userData }, settingsRes, deletionRes] = await Promise.all([
      supabase.auth.getUser(),
      fetchUserSettings(),
      fetchPendingDeletionRequest(),
    ]);

    if (userData.user) {
      setAuthEmail(userData.user.email ?? '');
      setAuthCreatedAt(userData.user.created_at ?? '');
      const providers = Array.isArray(userData.user.app_metadata?.providers)
        ? (userData.user.app_metadata.providers as string[])
        : userData.user.app_metadata?.provider
          ? [String(userData.user.app_metadata.provider)]
          : ['email'];
      setAuthProviders(providers);
    }

    if (settingsRes.data) {
      setNotifyCollab(settingsRes.data.notify_collaboration_requests);
      setNotifyMessages(settingsRes.data.notify_messages);
      setNotifyIdeaActivity(settingsRes.data.notify_idea_activity);
      setNotifyAnnouncements(settingsRes.data.notify_platform_announcements);
    } else if (settingsRes.error) {
      setSettingsErr(
        settingsRes.error.message || 'Could not load notification preferences.'
      );
    }

    if (deletionRes.data) {
      setPendingDeletion(deletionRes.data);
    }

    setLoadingSettings(false);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setSkills(profile.skills ?? []);
    setRoleFocus(profile.role === 'founder' ? 'founder' : 'collaborator');
    setGithubUrl(profile.github_url ?? '');
    setLinkedinUrl(profile.linkedin_url ?? '');
    setWebsiteUrl(profile.website_url ?? '');
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadAccountData();
    }
  }, [isAuthenticated, loadAccountData]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl py-16 flex flex-col items-center justify-center text-typography-slate">
        <Loader2 className="h-7 w-7 animate-spin text-brand-royal mb-3" />
        <p className="text-sm font-medium">Loading your settings...</p>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  const toggleSkill = (value: string) => {
    setSkills((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setProfileErr(null);
    setProfileMsg(null);

    const { publicUrl, error: uploadErr } = await uploadUserAvatar(file);
    if (uploadErr || !publicUrl) {
      setProfileErr(uploadErr?.message || 'Failed to upload avatar image.');
      setUploadingAvatar(false);
      return;
    }

    const { error: updateErr } = await updateCurrentProfile({
      avatar_url: publicUrl,
    });
    setUploadingAvatar(false);

    if (updateErr) {
      setProfileErr(updateErr.message || 'Failed to save new avatar.');
      return;
    }

    setAvatarUrl(publicUrl);
    await refreshProfile();
    setProfileMsg('Profile avatar updated.');
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;

    setProfileErr(null);
    setProfileMsg(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      setProfileErr('Username must be at least 3 characters (letters, numbers, underscores).');
      return;
    }
    if (!fullName.trim()) {
      setProfileErr('Full name is required.');
      return;
    }

    setSavingProfile(true);
    const { error } = await updateCurrentProfile({
      full_name: fullName.trim(),
      username: cleanUsername,
      bio: bio.trim() || null,
      skills,
      github_url: githubUrl.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      ...(profile.role !== 'admin' ? { role: roleFocus as UserRole } : {}),
    });
    setSavingProfile(false);

    if (error) {
      setProfileErr(error.message || 'Could not update profile.');
      return;
    }

    await refreshProfile();
    setProfileMsg('Account profile saved.');
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingSettings) return;

    setSavingSettings(true);
    setSettingsErr(null);
    setSettingsMsg(null);

    const { error } = await updateUserSettings({
      notify_collaboration_requests: notifyCollab,
      notify_messages: notifyMessages,
      notify_idea_activity: notifyIdeaActivity,
      notify_platform_announcements: notifyAnnouncements,
    });

    setSavingSettings(false);
    if (error) {
      setSettingsErr(error.message || 'Failed to save notification preferences.');
      return;
    }

    setSettingsMsg('Notification preferences saved to your account.');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updatingPassword) return;

    setPasswordErr(null);
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordErr('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    const { error } = await updateUserPassword(newPassword);
    setUpdatingPassword(false);

    if (error) {
      setPasswordErr(error.message || 'Could not update password.');
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordMsg('Password updated successfully.');
  };

  const handleSendRecoveryEmail = async () => {
    if (!authEmail) return;
    setPasswordErr(null);
    setPasswordMsg(null);
    const { error } = await requestPasswordReset(authEmail);
    if (error) {
      setPasswordErr(error.message || 'Could not send recovery email.');
    } else {
      setPasswordMsg(`Password recovery email sent to ${authEmail}.`);
    }
  };

  const handleRequestDeletion = async () => {
    if (processingDeletion) return;
    setProcessingDeletion(true);
    setDeletionErr(null);
    setDeletionMsg(null);

    const { data, error } = await requestAccountDeletion(deletionReason);
    setProcessingDeletion(false);

    if (error || !data) {
      setDeletionErr(
        error?.message || 'Could not submit account deletion request.'
      );
      return;
    }

    setPendingDeletion(data);
    setConfirmDeleteOpen(false);
    setDeletionReason('');
    setDeletionMsg(
      'Your account deletion request has been recorded for authorized processing.'
    );
  };

  const handleCancelDeletion = async () => {
    if (processingDeletion) return;
    setProcessingDeletion(true);
    setDeletionErr(null);
    setDeletionMsg(null);

    const { error } = await cancelAccountDeletionRequest();
    setProcessingDeletion(false);

    if (error) {
      setDeletionErr(
        error.message || 'Could not cancel account deletion request.'
      );
      return;
    }

    setPendingDeletion(null);
    setDeletionMsg('Pending account deletion request cancelled.');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const joinedDate = authCreatedAt || profile.created_at;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <section className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-typography-navy font-heading">
          Account &amp; Workspace Settings
        </h1>
        <p className="mt-1.5 text-sm text-typography-slate">
          Manage your profile identity, notification preferences, security, and
          account controls.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-typography-slate">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-brand-royal" />
            <strong className="text-typography-navy">{authEmail || 'No email'}</strong>
          </span>
          {joinedDate && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand-royal" />
              Joined {new Date(joinedDate).toLocaleDateString()}
            </span>
          )}
          <span className="rounded-full bg-brand-ice px-2.5 py-0.5 text-[11px] font-semibold text-brand-royal capitalize">
            Role: {profile.role}
          </span>
        </div>
      </section>

      {/* 1. Account & Profile Settings */}
      <section className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
            <UserIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-typography-navy font-heading">
              Account Profile
            </h2>
            <p className="text-xs text-typography-slate">
              Update your public builder identity and avatar.
            </p>
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-surface-border bg-surface-soft p-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile.full_name}
              className="h-14 w-14 rounded-2xl object-cover border border-surface-border"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal font-bold text-lg">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-bold text-typography-navy">
              Profile Avatar
            </p>
            <p className="text-[11px] text-typography-slate">
              PNG, JPEG, or WebP up to 2 MB.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-3.5 py-2 text-xs font-semibold text-typography-navy hover:border-brand-royal hover:text-brand-royal transition-colors">
            {uploadingAvatar ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                <span>Change Avatar</span>
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
              className="hidden"
            />
          </label>
        </div>

        {profileErr && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-3 text-xs font-semibold text-functional-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{profileErr}</span>
          </div>
        )}
        {profileMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{profileMsg}</span>
          </div>
        )}

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>
          </div>

          {profile.role !== 'admin' && (
            <div className="max-w-xs">
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                Primary Focus
              </label>
              <CustomSelect
                options={ROLE_OPTIONS}
                value={roleFocus}
                onChange={(val) =>
                  setRoleFocus(val === 'founder' ? 'founder' : 'collaborator')
                }
                triggerClassName="bg-surface-soft py-2.5 px-3.5 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-typography-navy mb-1.5">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell builders what you are working on..."
              className="w-full rounded-xl border border-surface-border bg-surface-soft p-3 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-typography-navy mb-1.5">
              Core Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((sk) => {
                const active = skills.includes(sk.value);
                return (
                  <button
                    key={sk.value}
                    type="button"
                    onClick={() => toggleSkill(sk.value)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all',
                      active
                        ? 'bg-brand-royal text-white border-brand-royal'
                        : 'bg-surface-soft text-typography-slate border-surface-border hover:border-brand-light'
                    )}
                  >
                    {sk.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                GitHub URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-typography-navy mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2 text-xs text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors disabled:opacity-60"
            >
              {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. Notification Preferences */}
      <section className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-typography-navy font-heading">
              Notification Preferences
            </h2>
            <p className="text-xs text-typography-slate">
              Control which notifications are delivered to your account.
            </p>
          </div>
        </div>

        {loadingSettings ? (
          <div className="py-6 flex items-center gap-2 text-xs text-typography-slate">
            <Loader2 className="h-4 w-4 animate-spin text-brand-royal" />
            <span>Loading preferences...</span>
          </div>
        ) : (
          <form onSubmit={handleSettingsSave} className="space-y-4">
            {settingsErr && (
              <div className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-3 text-xs font-semibold text-functional-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{settingsErr}</span>
              </div>
            )}
            {settingsMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{settingsMsg}</span>
              </div>
            )}

            {[
              {
                label: 'Collaboration Requests',
                description:
                  'Receive notifications when builders apply to join your idea or respond to your request.',
                checked: notifyCollab,
                onChange: setNotifyCollab,
              },
              {
                label: 'Direct Messages',
                description:
                  'Receive notifications for new direct messages from collaborators.',
                checked: notifyMessages,
                onChange: setNotifyMessages,
              },
              {
                label: 'Idea Activity',
                description:
                  'Receive notifications when someone comments on or upvotes your ideas.',
                checked: notifyIdeaActivity,
                onChange: setNotifyIdeaActivity,
              },
              {
                label: 'Platform Announcements',
                description:
                  'Receive important product updates and platform notices from IDEORA.',
                checked: notifyAnnouncements,
                onChange: setNotifyAnnouncements,
              },
            ].map((pref) => (
              <label
                key={pref.label}
                className="flex items-start justify-between gap-4 rounded-xl border border-surface-border bg-surface-soft/60 p-4 cursor-pointer"
              >
                <div>
                  <span className="block text-sm font-semibold text-typography-navy">
                    {pref.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-typography-slate">
                    {pref.description}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={pref.checked}
                  onChange={(e) => pref.onChange(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-surface-border text-brand-royal focus:ring-brand-royal"
                />
              </label>
            ))}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-royal px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors disabled:opacity-60"
              >
                {savingSettings && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>
                  {savingSettings ? 'Saving...' : 'Save Preferences'}
                </span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 3. Privacy & Security */}
      <section className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-royal">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-typography-navy font-heading">
              Privacy &amp; Security
            </h2>
            <p className="text-xs text-typography-slate">
              Manage your password, OAuth providers, and legal policies.
            </p>
          </div>
        </div>

        {/* Connected Auth Providers */}
        <div className="rounded-xl border border-surface-border bg-surface-soft p-4 text-xs text-typography-slate">
          <p className="font-bold text-typography-navy">
            Connected Sign-In Methods
          </p>
          <p className="mt-1 capitalize">
            Active providers: {authProviders.join(', ')}
          </p>
          {authProviders.includes('google') && (
            <p className="mt-1 text-[11px]">
              Google Sign-In is used solely for authentication (name, email, and
              profile avatar). IDEORA does not access Gmail or Google Drive.
            </p>
          )}
        </div>

        {/* Password Change */}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-typography-navy flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand-royal" />
              Change Password
            </h3>
            <button
              type="button"
              onClick={handleSendRecoveryEmail}
              className="text-xs font-semibold text-brand-royal hover:underline"
            >
              Send password reset email instead
            </button>
          </div>

          {passwordErr && (
            <div className="flex items-center gap-2 rounded-xl border border-functional-error/30 bg-functional-error-light p-3 text-xs font-semibold text-functional-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordErr}</span>
            </div>
          )}
          {passwordMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{passwordMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
            />
            <input
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-surface-border bg-surface-soft px-3.5 py-2.5 text-sm text-typography-navy focus:border-brand-royal focus:bg-surface-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updatingPassword || !newPassword}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-royal bg-white px-4 py-2 text-xs font-semibold text-brand-royal hover:bg-brand-ice/60 transition-colors disabled:opacity-50"
            >
              {updatingPassword && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Update Password</span>
            </button>
          </div>
        </form>

        {/* Policy Links */}
        <div className="border-t border-surface-border pt-4 flex flex-wrap items-center gap-5 text-xs font-semibold text-brand-royal">
          <Link to="/privacy" className="inline-flex items-center gap-1 hover:underline">
            <span>Privacy Policy</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link to="/terms" className="inline-flex items-center gap-1 hover:underline">
            <span>Terms of Service</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* 4. Account Management */}
      <section className="rounded-2xl border border-surface-border bg-surface-white p-6 sm:p-8 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-typography-navy font-heading">
          Account Management
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-border bg-surface-soft p-4">
          <div>
            <p className="text-sm font-semibold text-typography-navy">
              Sign Out
            </p>
            <p className="text-xs text-typography-slate">
              End your active session on this device.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-white px-4 py-2 text-xs font-semibold text-typography-navy hover:bg-surface-light transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Account Deletion Request */}
        <div className="rounded-xl border border-functional-error/25 bg-functional-error-light/40 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-functional-error flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Request Account Deletion
              </p>
              <p className="mt-1 text-xs text-typography-slate leading-relaxed">
                Submit an authorized deletion request for your IDEORA account
                and personal profile data.
              </p>
            </div>
          </div>

          {deletionErr && (
            <p className="text-xs font-semibold text-functional-error">
              {deletionErr}
            </p>
          )}
          {deletionMsg && (
            <p className="text-xs font-semibold text-emerald-700">
              {deletionMsg}
            </p>
          )}

          {pendingDeletion ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  Deletion request pending (submitted{' '}
                  {new Date(pendingDeletion.requested_at).toLocaleDateString()})
                </p>
                {pendingDeletion.reason && (
                  <p className="mt-0.5 text-[11px]">
                    Reason: {pendingDeletion.reason}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCancelDeletion}
                disabled={processingDeletion}
                className="rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                Cancel Request
              </button>
            </div>
          ) : confirmDeleteOpen ? (
            <div className="space-y-3 pt-1">
              <textarea
                rows={2}
                maxLength={1000}
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Optional: tell us why you are leaving..."
                className="w-full rounded-xl border border-surface-border bg-white p-3 text-xs text-typography-navy focus:border-functional-error focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRequestDeletion}
                  disabled={processingDeletion}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-functional-error px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {processingDeletion && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Confirm Deletion Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="rounded-xl border border-surface-border bg-white px-4 py-2 text-xs font-semibold text-typography-slate hover:bg-surface-soft"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-functional-error/40 bg-white px-4 py-2 text-xs font-semibold text-functional-error hover:bg-functional-error hover:text-white transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Request Account Deletion</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

