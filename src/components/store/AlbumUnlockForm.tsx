'use client';

import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

type Props = {
  slug: string;
  albumSlug: string;
};

export function AlbumUnlockForm({ slug, albumSlug }: Props) {
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/store/${encodeURIComponent(slug)}/album/${encodeURIComponent(albumSlug)}/unlock`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ passcode }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Wrong passcode. Try again.');
        setSubmitting(false);
        return;
      }
      // Cookie was set server-side. Reload to render the unlocked grid.
      window.location.reload();
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 text-left">
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Passcode"
        autoComplete="off"
        autoFocus
        maxLength={64}
        required
        className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
      />

      {error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
        Unlock album
      </button>
    </form>
  );
}
