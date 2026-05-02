'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pause, Play, Trash2, Loader2 } from 'lucide-react';

type Props = {
  rule: {
    id: string;
    frequency: string;
    customerName: string;
    nextRunAt: string;
    status: string;
    runsCompleted: number;
    autoSend: boolean;
  };
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'bg-success-50 text-success-700',
  PAUSED: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

export function RecurringRuleRow({ rule }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/recurring-invoices/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm('Cancel this recurring rule? This cannot be undone.')) return;
    setBusy(true);
    try {
      await fetch(`/api/recurring-invoices/${rule.id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const statusCls = STATUS_CLASS[rule.status] ?? 'bg-slate-100 text-slate-700';

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2 text-slate-700">{rule.customerName}</td>
      <td className="px-3 py-2 text-xs uppercase tracking-wide text-slate-500">
        {rule.frequency}
      </td>
      <td className="px-3 py-2 text-xs text-slate-600">{rule.nextRunAt}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}
        >
          {rule.status}
        </span>
      </td>
      <td className="px-3 py-2 text-right text-xs text-slate-600">
        {rule.runsCompleted}
      </td>
      <td className="px-3 py-2 text-xs text-slate-600">
        {rule.autoSend ? 'Yes' : 'No'}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          {rule.status === 'ACTIVE' ? (
            <button
              type="button"
              onClick={() => patch({ status: 'PAUSED' })}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
              Pause
            </button>
          ) : null}
          {rule.status === 'PAUSED' ? (
            <button
              type="button"
              onClick={() => patch({ status: 'ACTIVE' })}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Resume
            </button>
          ) : null}
          {rule.status !== 'CANCELLED' ? (
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Cancel
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
