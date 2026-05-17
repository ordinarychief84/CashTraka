'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function AdjustStockButton({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) {
      setError('Enter a non-zero number (use - for stock out).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/raw-materials/${materialId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: n, notes: notes || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed to adjust stock';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success(n > 0 ? `Added ${n} to stock` : `Removed ${Math.abs(n)} from stock`);
      setOpen(false);
      setDelta('');
      setNotes('');
      router.refresh();
    } catch (e: any) {
      const msg = e?.message ?? 'Network error';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary inline-flex w-full justify-center">
        Adjust stock
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Quantity change
        </label>
        <input
          autoFocus
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          type="number"
          className="input"
          placeholder="e.g. -5 to remove, +10 to add"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reason
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="e.g. damaged, found extras during stocktake"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : 'Save adjustment'}
        </button>
      </div>
    </form>
  );
}
