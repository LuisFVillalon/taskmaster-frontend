'use client';

/**
 * Account Settings modal — provider-aware.
 *
 * How provider detection works
 * ────────────────────────────
 * Supabase embeds app_metadata.provider in the JWT and in the User object.
 * We read user.app_metadata?.provider to distinguish:
 *
 *   "email"  → local email/password account  → all controls enabled
 *   "google" → Google OAuth account          → password tab disabled,
 *               email tab shows a note about OAuth identity
 *
 * This matches the backend guard on POST /update-password, which also reads
 * provider from the JWT payload and returns 403 for OAuth accounts.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff, AlertTriangle, ExternalLink, ShieldCheck, User } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { updatePassword, deleteAccount, fetchProfile, saveProfile } from '@/app/lib/backend-api';
import { validatePassword, MIN_LENGTH } from '@/app/lib/passwordValidation';
import PasswordStrengthMeter from '@/app/components/PasswordStrengthMeter';
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
}

type Section = 'profile' | 'password' | 'email' | 'delete';

// Providers that use a federated identity — they have no local password.
const OAUTH_PROVIDERS = new Set(['google', 'github', 'facebook', 'twitter', 'apple']);

export default function SettingsModal({
  isOpen,
  onClose,
  onAccountDeleted,
}: Props) {
  const { user } = useAuth();

  // ── Provider detection ───────────────────────────────────────────────────
  // app_metadata is set by Supabase server-side and cannot be spoofed by users.
  const provider: string = (user?.app_metadata?.provider as string) ?? 'email';
  const isOAuth = OAUTH_PROVIDERS.has(provider);
  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1); // "Google"

  // Start on 'profile' tab by default.
  const [section, setSection] = useState<Section>('profile');

  // ── Profile ──────────────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('tm_profile_name') ?? 'G.O.A.T.' : 'G.O.A.T.')
  );
  const [callItADay, setCallItADay] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('tm_call_it_a_day') ?? '22:00' : '22:00')
  );
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchProfile().then(profile => {
      if (profile) {
        setProfileName(profile.name);
        if (profile.shutoff_time) setCallItADay(profile.shutoff_time);
      }
    }).catch(() => {/* no-op: fall back to localStorage defaults */});
  }, [isOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaving(true);
    try {
      await saveProfile({ name: profileName, shutoff_time: callItADay });
      localStorage.setItem('tm_profile_name', profileName);
      localStorage.setItem('tm_call_it_a_day', callItADay);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Change Password ──────────────────────────────────────────────────────
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]                   = useState(false);
  const [pwStatus, setPwStatus]               = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [pwError, setPwError]                 = useState<string | null>(null);

  // Real-time strength check — passes the user's email so email-based passwords are caught.
  const pwCheck = useMemo(
    () => (newPassword ? validatePassword(newPassword, user?.email ?? undefined) : null),
    [newPassword, user?.email],
  );

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!pwCheck?.ok) {
      setPwError(pwCheck?.errors[0] ?? `Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    setPwStatus('saving');
    try {
      // Routes through the backend, which enforces the OAuth guard + length server-side.
      await updatePassword(newPassword);
      setPwStatus('done');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwStatus('error');
      setPwError(err instanceof Error ? err.message : 'Password update failed.');
    }
  };

  // ── Change Email ─────────────────────────────────────────────────────────
  const [newEmail, setNewEmail]       = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [emailError, setEmailError]   = useState<string | null>(null);

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    if (!newEmail.includes('@')) { setEmailError('Enter a valid email address.'); return; }
    setEmailStatus('saving');
    // supabase.auth.updateUser changes the contact/notification email in Supabase.
    // For OAuth users, this does NOT change their Google identity or login method —
    // they still sign in with Google. Their OAuth link is keyed to their Google UID,
    // not their email, so app data is safe even if this email changes.
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { setEmailStatus('error'); setEmailError(error.message); return; }
    setEmailStatus('done');
    setNewEmail('');
  };

  // ── Delete Account ───────────────────────────────────────────────────────
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStatus, setDeleteStatus]           = useState<'idle' | 'deleting' | 'error'>('idle');
  const [deleteError, setDeleteError]             = useState<string | null>(null);
  const DELETE_PHRASE = 'delete my account';

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleteStatus('deleting');
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      onAccountDeleted();
    } catch (err) {
      setDeleteStatus('error');
      setDeleteError(err instanceof Error ? err.message : 'Deletion failed.');
    }
  };

  if (!isOpen) return null;

  const tabStyle = (s: Section): React.CSSProperties => {
    if (section !== s) return {};
    if (s === 'delete') return { backgroundColor: 'var(--tm-danger)' };
    return { backgroundColor: 'var(--tm-accent)' };
  };

  const tabClass = (s: Section) =>
    `px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
      section === s
        ? 'text-white'
        : s === 'password' && isOAuth
          ? 'opacity-40 cursor-not-allowed text-[var(--tm-text-muted)]'
          : 'text-[var(--tm-text-secondary)] hover:text-[var(--tm-text-primary)]'
    }`;

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-panel w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--tm-surface)', border: '1px solid var(--tm-border)' }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0"
          style={{ borderColor: 'var(--tm-border)' }}
        >
          <div>
            <h2 className="text-lg font-bold text-text-primary">Account Settings</h2>
            {user?.email && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--tm-text-muted)' }}>
                {user.email}, aka {profileName}
                {isOAuth && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: 'var(--tm-accent-subtle)', color: 'var(--tm-accent)' }}
                  >
                    {providerLabel}
                  </span>
                )}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
        <div
          className="flex gap-1 px-6 py-3 border-b overflow-x-auto scrollbar-custom shrink-0"
          style={{ borderColor: 'var(--tm-border)', backgroundColor: 'var(--tm-surface-raised)' }}
        >
          <button
            onClick={() => setSection('profile')}
            className={tabClass('profile')}
            style={tabStyle('profile')}
          >
            Profile
          </button>
          <button
            onClick={() => !isOAuth && setSection('password')}
            className={tabClass('password')}
            style={tabStyle('password')}
            title={isOAuth ? `Password management is handled by ${providerLabel}` : undefined}
          >
            Password
          </button>
          <button
            onClick={() => setSection('email')}
            className={tabClass('email')}
            style={tabStyle('email')}
          >
            Email
          </button>
          <button
            onClick={() => setSection('delete')}
            className={tabClass('delete')}
            style={tabStyle('delete')}
          >
            Delete Account
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 scrollbar-custom">

          {/* ── Profile Tab ──────────────────────────────────────────────── */}
          {section === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--tm-text-secondary)' }}>
                <User className="w-4 h-4" />
                <p className="text-sm">Customize how Task Master knows you.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Your Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="G.O.A.T."
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Call it a day at</label>
                <input
                  type="time"
                  value={callItADay}
                  onChange={e => setCallItADay(e.target.value)}
                  className="input-field w-full text-sm"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--tm-text-muted)' }}>
                  The time you shut off and stop working for the day.
                </p>
              </div>

              {profileSaved && (
                <p className="text-sm" style={{ color: 'var(--tm-success)' }}>Profile saved.</p>
              )}
              {profileError && (
                <p className="text-sm" style={{ color: 'var(--tm-danger)' }}>{profileError}</p>
              )}

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--tm-accent)' }}
              >
                {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Profile
              </button>
            </form>
          )}

          {/* ── Password Tab ─────────────────────────────────────────────── */}
          {section === 'password' && (
            isOAuth ? (
              /* OAuth users: password is managed externally */
              <div className="space-y-4">
                <div
                  className="flex gap-3 p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
                >
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--tm-accent)' }} />
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-1">
                      Signed in with {providerLabel}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--tm-text-secondary)' }}>
                      Your account uses {providerLabel} for authentication. You don&apos;t have a
                      separate Task Master password — {providerLabel} handles your security.
                    </p>
                  </div>
                </div>
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--tm-surface-raised)', color: 'var(--tm-text-primary)', border: '1px solid var(--tm-border)' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Manage security at myaccount.google.com
                </a>
              </div>
            ) : (
              /* Email users: standard password form */
              <form onSubmit={handleChangePassword} className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--tm-text-secondary)' }}>
                  Use at least {MIN_LENGTH} characters. A long passphrase of random words is
                  easier to remember and harder to crack.
                </p>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder={`Min. ${MIN_LENGTH} characters — try a passphrase`}
                      required
                      className="input-field w-full pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={newPassword} check={pwCheck} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Confirm New Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="input-field w-full text-sm"
                  />
                </div>

                {pwError && <p className="text-sm" style={{ color: 'var(--tm-danger)' }}>{pwError}</p>}
                {pwStatus === 'done' && (
                  <p className="text-sm" style={{ color: 'var(--tm-success)' }}>Password updated successfully.</p>
                )}

                <button
                  type="submit"
                  disabled={pwStatus === 'saving' || !pwCheck?.ok}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--tm-accent)' }}
                >
                  {pwStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            )
          )}

          {/* ── Email Tab ────────────────────────────────────────────────── */}
          {section === 'email' && (
            <form onSubmit={handleChangeEmail} className="space-y-4">
              {isOAuth ? (
                /* OAuth users: explain what changing email actually does */
                <div
                  className="flex gap-3 p-3 rounded-xl text-sm"
                  style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
                >
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--tm-accent)' }} />
                  <p style={{ color: 'var(--tm-text-secondary)' }}>
                    This changes your <strong>contact/notification email</strong> in Task Master.
                    Your <strong>{providerLabel} login is not affected</strong> — you&apos;ll still sign
                    in with {providerLabel}, and all your data stays linked to your account.
                  </p>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--tm-text-secondary)' }}>
                  Supabase will send a confirmation link to your new address. Your email won&apos;t
                  change until you click it.
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  {isOAuth ? 'New Contact Email' : 'New Email Address'}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-field w-full text-sm"
                />
              </div>

              {emailError && <p className="text-sm" style={{ color: 'var(--tm-danger)' }}>{emailError}</p>}
              {emailStatus === 'done' && (
                <p className="text-sm" style={{ color: 'var(--tm-success)' }}>
                  {isOAuth
                    ? 'Contact email updated.'
                    : 'Confirmation sent — check your new inbox to complete the change.'}
                </p>
              )}

              <button
                type="submit"
                disabled={emailStatus === 'saving'}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--tm-accent)' }}
              >
                {emailStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {isOAuth ? 'Update Contact Email' : 'Send Confirmation'}
              </button>
            </form>
          )}

          {/* ── Delete Account Tab ───────────────────────────────────────── */}
          {section === 'delete' && (
            <div className="space-y-4">
              <div
                className="flex gap-3 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--tm-danger-subtle, #fef2f2)', border: '1px solid var(--tm-danger)' }}
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--tm-danger)' }} />
                <p className="text-sm" style={{ color: 'var(--tm-danger)' }}>
                  <strong>This is permanent.</strong> All your tasks, notes, tags, and calendar
                  settings will be deleted and cannot be recovered.
                  {isOAuth && ` Your ${providerLabel} account itself is not affected.`}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Type <strong className="text-text-primary">{DELETE_PHRASE}</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={DELETE_PHRASE}
                  className="input-field w-full text-sm"
                />
              </div>

              {deleteError && <p className="text-sm" style={{ color: 'var(--tm-danger)' }}>{deleteError}</p>}

              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== DELETE_PHRASE || deleteStatus === 'deleting'}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--tm-danger)' }}
              >
                {deleteStatus === 'deleting' && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete My Account
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
