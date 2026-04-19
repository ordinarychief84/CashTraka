'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not accept invite');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div>
        <label className="label">Email</label>
        <input className="input" value={email} disabled readOnly />
      </div>
      <div>
        <label htmlFor="pw" className="label">Set a password</label>
        <input
          id="pw"
          type="password"
          className="input"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          You&apos;ll log in with this password from now on.
        </p>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Setting up…' : 'Set password & sign in'}
      </button>

      {/* What-happens-next hint — removes the dead-reckoning feeling after */}
      {/* staff set their password for the first time. */}
      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
        After you sign in you&apos;ll land on your dashboard. You&apos;ll see a{' '}
        <strong className="text-ink">&ldquo;My tasks&rdquo;</strong> card showing
        the work your employer has assigned you. Tap each task to update its
        status when you finish.
      </p>
    </form>
  );
}
