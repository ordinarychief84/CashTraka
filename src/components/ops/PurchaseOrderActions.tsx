'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExternalLink, Send } from 'lucide-react';

type Item = {
  id: string;
  materialName: string;
  unit: string;
  quantity: number;
  quantityReceived: number;
};

export function PurchaseOrderActions({
  orderId,
  status,
  items,
}: {
  orderId: string;
  status: string;
  items: Item[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const [showReceive, setShowReceive] = useState(false);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>(
    Object.fromEntries(items.map((it) => [it.id, Math.max(0, it.quantity - it.quantityReceived)])),
  );

  async function send() {
    setBusy('send');
    setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}/send`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed';
        setError(msg);
        toast.error(msg);
        return;
      }
      setWhatsappLink(body.data.whatsappLink ?? null);
      setEmailResult(body.data.emailResult ?? null);
      toast.success('PO sent to supplier');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function receive() {
    const lines = items
      .map((it) => ({ itemId: it.id, quantity: receiveQty[it.id] ?? 0 }))
      .filter((l) => l.quantity > 0);
    if (lines.length === 0) {
      setError('Enter at least one received quantity.');
      return;
    }
    setBusy('receive');
    setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed';
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success('Goods received — stock updated');
      setShowReceive(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!confirm('Cancel this PO?')) return;
    setBusy('cancel');
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed';
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success('PO cancelled');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const isTerminal = status === 'RECEIVED' || status === 'CANCELLED';
  const canSend = status === 'DRAFT';
  const canReceive = ['SENT', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(status);

  return (
    <div className="space-y-3">
      {canSend && (
        <button
          onClick={send}
          disabled={busy !== null}
          className="btn-primary inline-flex w-full items-center justify-center gap-2"
        >
          <Send size={14} />
          {busy === 'send' ? 'Sending…' : 'Send to supplier'}
        </button>
      )}
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-success inline-flex w-full items-center justify-center gap-2"
        >
          Open WhatsApp <ExternalLink size={12} />
        </a>
      )}
      {emailResult && (
        <p className={emailResult.ok ? 'text-xs text-success-700' : 'text-xs text-owed-700'}>
          Email: {emailResult.ok ? 'sent' : emailResult.error ?? 'failed'}
        </p>
      )}

      {canReceive && !showReceive && (
        <button
          onClick={() => setShowReceive(true)}
          disabled={busy !== null}
          className="btn-secondary inline-flex w-full justify-center"
        >
          Receive goods
        </button>
      )}
      {canReceive && showReceive && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            How much did you receive today?
          </p>
          {items.map((it) => {
            const remaining = it.quantity - it.quantityReceived;
            return (
              <div key={it.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{it.materialName}</span>
                <input
                  type="number"
                  min={0}
                  max={remaining}
                  value={receiveQty[it.id] ?? 0}
                  onChange={(e) =>
                    setReceiveQty((prev) => ({
                      ...prev,
                      [it.id]: Math.max(0, Math.min(remaining, Number(e.target.value))),
                    }))
                  }
                  className="input !w-20"
                />
                <span className="w-14 shrink-0 text-xs text-slate-500">/ {remaining} {it.unit}</span>
              </div>
            );
          })}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowReceive(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={receive} disabled={busy !== null} className="btn-primary text-xs">
              {busy === 'receive' ? 'Saving…' : 'Confirm receipt'}
            </button>
          </div>
        </div>
      )}

      {!isTerminal && (
        <button onClick={cancel} disabled={busy !== null} className="text-sm text-rose-600 hover:underline">
          Cancel PO
        </button>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
