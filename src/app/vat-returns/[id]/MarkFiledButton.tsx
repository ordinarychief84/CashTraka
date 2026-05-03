'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';

/**
 * "Mark filed" button for the VAT-return detail page. Lets the seller
 * record the FIRS reference number they got from TaxPro Max (or their
 * filing agent) so the row is locked and findable later.
 */
export function MarkFiledButton({ id }: { id: string }) {
  const router = useRouter();
  const [firsReference, setFirsReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vat-returns/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-filed',
          firsReference: firsReference.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Could not mark filed.');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="grow">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          FIRS reference (optional)
        </label>
        <input
          type="text"
          value={firsReference}
          onChange={(e) => setFirsReference(e.target.value)}
          placeholder="Paste the reference FIRS gave you"
          maxLength={120}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        Mark filed
      </button>
      {error ? (
        <div className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </form>
  );
}
