'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Play, X } from 'lucide-react';

export function ProductionOrderActions({
  orderId,
  status,
  hasShortages,
  plannedQuantity,
}: {
  orderId: string;
  status: string;
  hasShortages: boolean;
  plannedQuantity: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [produced, setProduced] = useState<string>(String(plannedQuantity));
  const [damaged, setDamaged] = useState<string>('0');

  async function call(action: 'start' | 'cancel' | 'markReady') {
    if (action === 'cancel' && !confirm('Cancel this production order?')) return;
    setBusy(action);
    setError(null);
    try {
      const route =
        action === 'markReady' ? 'mark-ready' : action;
      const res = await fetch(`/api/production-orders/${orderId}/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'cancel' ? JSON.stringify({}) : undefined,
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body?.error || 'Failed');
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function complete() {
    const producedNum = Math.max(0, Math.floor(Number(produced) || 0));
    const damagedNum = Math.max(0, Math.floor(Number(damaged) || 0));
    const acceptedNum = Math.max(0, producedNum - damagedNum);
    setBusy('complete');
    setError(null);
    try {
      const res = await fetch(`/api/production-orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityProduced: producedNum,
          quantityDamaged: damagedNum,
          quantityAccepted: acceptedNum,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body?.error || 'Failed');
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const canStart =
    status === 'PLANNED' ||
    status === 'READY_TO_PRODUCE' ||
    (status === 'MATERIALS_NEEDED' && !hasShortages);
  const canMarkReady = status === 'MATERIALS_NEEDED' && !hasShortages;
  const canComplete = status === 'IN_PRODUCTION';
  const isTerminal = status === 'COMPLETED' || status === 'CANCELLED';

  const damagedNum = Math.max(0, Math.floor(Number(damaged) || 0));
  const producedNum = Math.max(0, Math.floor(Number(produced) || 0));
  const acceptedNum = Math.max(0, producedNum - damagedNum);

  return (
    <div className="space-y-3">
      {status === 'MATERIALS_NEEDED' && hasShortages && (
        <p className="rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Resolve material shortages before starting.
        </p>
      )}

      {canMarkReady && (
        <button
          onClick={() => call('markReady')}
          disabled={busy !== null}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
        >
          {busy === 'markReady' ? 'Marking…' : 'Mark ready to produce'}
        </button>
      )}

      {canStart && (
        <button
          onClick={() => call('start')}
          disabled={busy !== null}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Play size={14} />
          {busy === 'start' ? 'Starting…' : 'Start production'}
        </button>
      )}

      {canComplete && !showCompleteForm && (
        <button
          onClick={() => setShowCompleteForm(true)}
          disabled={busy !== null}
          className="btn-pill-success w-full !py-2"
        >
          <CheckCircle2 size={14} />
          Mark complete
        </button>
      )}

      {canComplete && showCompleteForm && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Quality check
          </div>
          <label className="block text-xs font-semibold text-slate-700">
            Quantity produced
            <input
              type="number"
              min={0}
              value={produced}
              onChange={(e) => setProduced(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Damaged / rejected
            <input
              type="number"
              min={0}
              max={producedNum}
              value={damaged}
              onChange={(e) => setDamaged(e.target.value)}
              className="input mt-1"
            />
          </label>
          <div className="rounded-md bg-white p-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span>Goes to finished-goods stock</span>
              <span className="num font-bold text-emerald-700">{acceptedNum}</span>
            </div>
            {damagedNum > 0 && (
              <div className="mt-0.5 text-[10px] text-slate-500">
                {damagedNum} unit{damagedNum === 1 ? '' : 's'} won't be added to stock.
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={complete}
              disabled={busy !== null}
              className="btn-pill-success flex-1"
            >
              <CheckCircle2 size={14} />
              {busy === 'complete' ? 'Completing…' : 'Confirm complete'}
            </button>
            <button
              type="button"
              onClick={() => setShowCompleteForm(false)}
              disabled={busy !== null}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isTerminal && !showCompleteForm && (
        <button
          onClick={() => call('cancel')}
          disabled={busy !== null}
          className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-rose-600 hover:underline"
        >
          <X size={14} />
          Cancel production
        </button>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
