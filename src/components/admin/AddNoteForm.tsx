'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export function AddNoteForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (note.trim().length < 2) {
      setError('Note is too short');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Could not save');
        return;
      }
      setNote('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        className="input min-h-[60px]"
        placeholder="Add an admin note (visible to other admins)…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
      <button type="submit" disabled={busy} className="btn-secondary">
        <Plus size={14} />
        {busy ? 'Saving…' : 'Add note'}
      </button>
    </form>
  );
}
