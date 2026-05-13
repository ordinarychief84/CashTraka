'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProductionOrderActions({
  orderId,
  status,
  hasShortages,
}: {
  orderId: string;
  status: string;
  hasShortages: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: 'start' | 'complete' | 'cancel') {
    if (action === 'cancel' && !confirm('Cancel this production order?')) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/production-orders/${orderId}/${action}`, {
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

  const canStart = status === 'PLANNED' || (status === 'MATERIALS_NEEDED' && !hasShortages);
  const canComplete = status === 'IN_PRODUCTION';
  const isTerminal = status === 'COMPLETED' || status === 'CANCELLED';

  return (
    <div className="space-y-3">
      {status === 'MATERIALS_NEEDED' && hasShortages && (
        <p className="rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Resolve material shortages before starting.
        </p>
      )}
      {canStart && (
        <button
          onClick={() => call('start')}
          disabled={busy !== null}
          className="btn-primary inline-flex w-full justify-center"
        >
          {busy === 'start' ? 'Starting…' : 'Start production'}
        </button>
      )}
      {canComplete && (
        <button
          onClick={() => call('complete')}
          disabled={busy !== null}
          className="btn-primary inline-flex w-full justify-center"
        >
          {busy === 'complete' ? 'Completing…' : 'Mark complete'}
        </button>
      )}
      {!isTerminal && (
        <button
          onClick={() => call('cancel')}
          disabled={busy !== null}
          className="text-sm text-rose-600 hover:underline"
        >
          Cancel production
        </button>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
