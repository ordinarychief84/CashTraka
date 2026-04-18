'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';

type ChangePasswordFormProps = {
  adminEmail: string;
};

export function ChangePasswordForm({ adminEmail }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-side validation
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setBusy(true);

    try {
      const res = await fetch('/api/admin/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Failed to change password');
        return;
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
        <Lock size={18} className="text-slate-400" />
        Change Password
      </h2>

      <p className="mb-4 text-sm text-slate-600">
        Update your admin password. Make sure to use a strong password with a mix of uppercase, lowercase, numbers, and symbols.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="label">Current Password</span>
          <input
            type="password"
            className="input"
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={busy}
          />
        </label>

        <label className="block">
          <span className="label">New Password</span>
          <input
            type="password"
            className="input"
            placeholder="Enter new password (min. 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={busy}
          />
        </label>

        <label className="block">
          <span className="label">Confirm New Password</span>
          <input
            type="password"
            className="input"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={busy}
          />
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Password changed successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary"
        >
          {busy ? 'Saving...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
