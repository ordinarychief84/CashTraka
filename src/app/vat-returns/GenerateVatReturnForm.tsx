'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FileSpreadsheet } from 'lucide-react';

type Period = 'MONTHLY' | 'QUARTERLY';

/**
 * Period + reference-date picker for the VAT-returns page. POSTs to
 * /api/vat-returns and on success redirects to the detail view of the
 * generated (or refreshed) return.
 */
export function GenerateVatReturnForm() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [period, setPeriod] = useState<Period>('QUARTERLY');
  const [referenceDate, setReferenceDate] = useState<string>(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vat-returns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ period, referenceDate }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { id: string };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data?.id) {
        setError(json.error ?? 'Could not generate the return.');
        setLoading(false);
        return;
      }
      router.push(`/vat-returns/${json.data.id}`);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-3 md:items-end">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Period
        </label>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setPeriod('MONTHLY')}
            className={
              'px-3 py-2 text-sm font-semibold transition ' +
              (period === 'MONTHLY'
                ? 'bg-brand-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50')
            }
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod('QUARTERLY')}
            className={
              'px-3 py-2 text-sm font-semibold transition ' +
              (period === 'QUARTERLY'
                ? 'bg-brand-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50')
            }
          >
            Quarterly
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reference date
        </label>
        <input
          type="date"
          value={referenceDate}
          onChange={(e) => setReferenceDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          We use this to find the period bounds.
        </p>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={14} />
          )}
          Generate
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-3">
          {error}
        </div>
      ) : null}
    </form>
  );
}
