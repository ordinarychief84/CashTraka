'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play, X, Zap } from 'lucide-react';

type Props = {
  ruleId: string;
  status: string;
};

/**
 * Inline admin action buttons for a recurring invoice rule:
 * Pause / Resume / Cancel / Run Now. Mirrors the simple confirm-prompt
 * pattern used by other admin detail-page actions.
 */
export function AdminRecurringActions({ ruleId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(nextStatus: 'ACTIVE' | 'PAUSED' | 'CANCELLED', label: string) {
    if (!window.confirm(`${label}?`)) return;
    setBusy(label);
    try {
      const res = await fetch(`/api/admin/recurring-invoices/${ruleId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Update failed');
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  async function runNow() {
    if (!window.confirm('Force-run this rule and generate an invoice now?')) return;
    setBusy('Run');
    try {
      const res = await fetch(`/api/admin/recurring-invoices/${ruleId}/run-now`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Run failed');
      alert(`Generated invoice ${data.invoiceNumber || ''}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === 'ACTIVE' && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => patch('PAUSED', 'Pause')}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <Pause size={12} /> Pause
        </button>
      )}
      {status === 'PAUSED' && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => patch('ACTIVE', 'Resume')}
          className="inline-flex items-center gap-1 rounded-md border border-success-300 bg-success-50 px-2 py-1 text-[11px] font-semibold text-success-700 hover:bg-success-100 disabled:opacity-50"
        >
          <Play size={12} /> Resume
        </button>
      )}
      {status !== 'CANCELLED' && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => patch('CANCELLED', 'Cancel rule')}
          className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          <X size={12} /> Cancel
        </button>
      )}
      <button
        type="button"
        disabled={busy !== null}
        onClick={runNow}
        className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
      >
        <Zap size={12} /> {busy === 'Run' ? 'Running…' : 'Run now'}
      </button>
    </div>
  );
}
