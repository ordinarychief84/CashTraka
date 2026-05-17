'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const NEXT_BY_STATUS: Record<string, { label: string; status: string }[]> = {
  NEW: [{ label: 'Confirm order', status: 'CONFIRMED' }],
  CONFIRMED: [
    { label: 'Start production', status: 'IN_PRODUCTION' },
    { label: 'Mark ready', status: 'READY' },
  ],
  IN_PRODUCTION: [{ label: 'Mark ready', status: 'READY' }],
  READY: [{ label: 'Mark delivered', status: 'DELIVERED' }],
  DELIVERED: [],
  CANCELLED: [],
};

export function CustomerOrderActions({
  orderId,
  status,
  hasProductionOrder,
  hasInvoice,
}: {
  orderId: string;
  status: string;
  hasProductionOrder: boolean;
  hasInvoice: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(newStatus: string) {
    setBusy(newStatus);
    setError(null);
    try {
      const res = await fetch(`/api/customer-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed';
        setError(msg);
        toast.error(msg);
        return;
      }
      const verb =
        newStatus === 'CANCELLED'
          ? 'cancelled'
          : newStatus === 'DELIVERED'
            ? 'marked delivered'
            : newStatus === 'READY'
              ? 'marked ready'
              : newStatus === 'IN_PRODUCTION'
                ? 'moved to production'
                : 'confirmed';
      toast.success(`Order ${verb}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function spawn(kind: 'produce' | 'invoice') {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/customer-orders/${orderId}/${kind}`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed';
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(kind === 'produce' ? 'Production order created' : 'Invoice generated');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    await changeStatus('CANCELLED');
  }

  const nextSteps = NEXT_BY_STATUS[status] ?? [];
  const isTerminal = status === 'DELIVERED' || status === 'CANCELLED';

  return (
    <div className="space-y-3">
      {nextSteps.map((step) => (
        <button
          key={step.status}
          onClick={() => changeStatus(step.status)}
          disabled={busy !== null}
          className="btn-primary inline-flex w-full justify-center"
        >
          {busy === step.status ? 'Working…' : step.label}
        </button>
      ))}

      {!hasProductionOrder && !isTerminal && (
        <button
          onClick={() => spawn('produce')}
          disabled={busy !== null}
          className="btn-secondary inline-flex w-full justify-center"
        >
          {busy === 'produce' ? 'Planning…' : 'Plan production'}
        </button>
      )}

      {!hasInvoice && !isTerminal && (
        <button
          onClick={() => spawn('invoice')}
          disabled={busy !== null}
          className="btn-secondary inline-flex w-full justify-center"
        >
          {busy === 'invoice' ? 'Generating…' : 'Generate invoice'}
        </button>
      )}

      {!isTerminal && (
        <button
          onClick={cancel}
          disabled={busy !== null}
          className="text-sm text-rose-600 hover:underline"
        >
          Cancel this order
        </button>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
