'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Undo2 } from 'lucide-react';

type Props = {
  invoiceId: string;
  currentStatus: string;
};

type Action = 'force-paid' | 'force-cancelled' | 'force-credited';

const LABELS: Record<Action, string> = {
  'force-paid': 'Force PAID',
  'force-cancelled': 'Force CANCELLED',
  'force-credited': 'Force CREDITED',
};

/**
 * Admin-only invoice override buttons. Posts to /api/admin/invoices/[id]
 * with a required reason. Mirrors the simple confirm-prompt + alert pattern
 * used by the existing /admin/users detail page actions.
 */
export function AdminInvoiceActions({ invoiceId, currentStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);

  async function run(action: Action) {
    const reason = window.prompt(
      `${LABELS[action]} — please provide a reason (logged in audit trail):`,
      '',
    );
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      alert('Reason is required.');
      return;
    }

    setBusy(action);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Override failed');
      }
      alert(`${LABELS[action]} applied.`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Override failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy !== null || currentStatus === 'PAID'}
        onClick={() => run('force-paid')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-success-300 bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-700 hover:bg-success-100 disabled:opacity-50"
      >
        <CheckCircle2 size={14} />
        {busy === 'force-paid' ? 'Working…' : 'Force PAID'}
      </button>
      <button
        type="button"
        disabled={busy !== null || currentStatus === 'CANCELLED'}
        onClick={() => run('force-cancelled')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        <XCircle size={14} />
        {busy === 'force-cancelled' ? 'Working…' : 'Force CANCELLED'}
      </button>
      <button
        type="button"
        disabled={busy !== null || currentStatus === 'CREDITED'}
        onClick={() => run('force-credited')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
      >
        <Undo2 size={14} />
        {busy === 'force-credited' ? 'Working…' : 'Force CREDITED'}
      </button>
    </div>
  );
}
