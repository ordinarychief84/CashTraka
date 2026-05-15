'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * "Draft POs from low stock" button. Calls /api/auto-po/run and shows
 * an inline result. Free users see an upgrade chip instead.
 *
 * Renders next to "New Purchase Order" on the materials page so the
 * decision lives where the operational pain lives.
 */
export function AutoPoButton({ canUse }: { canUse: boolean }) {
  const router = useRouter();
  const [result, setResult] = useState<
    | { kind: 'idle' }
    | { kind: 'success'; draftsCreated: number; materialsCovered: number; firstPoNumber?: string }
    | { kind: 'empty' }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const [pending, startTransition] = useTransition();

  if (!canUse) {
    return (
      <Link
        href="/billing?feature=autoPurchaseOrders"
        className="btn-pill-ghost"
        title="Auto-drafted POs are on the Pro plan"
      >
        <Lock size={12} />
        Auto-draft POs
      </Link>
    );
  }

  function onClick() {
    startTransition(async () => {
      setResult({ kind: 'idle' });
      try {
        const res = await fetch('/api/auto-po/run', { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setResult({ kind: 'error', message: data?.error || 'Could not draft POs.' });
          return;
        }
        const drafts = data?.data?.draftsCreated ?? 0;
        if (drafts === 0) {
          setResult({ kind: 'empty' });
        } else {
          setResult({
            kind: 'success',
            draftsCreated: drafts,
            materialsCovered: data?.data?.materialsCovered ?? 0,
            firstPoNumber: data?.data?.pos?.[0]?.poNumber,
          });
          router.refresh();
        }
      } catch (e) {
        setResult({
          kind: 'error',
          message: e instanceof Error ? e.message : 'Network error.',
        });
      }
    });
  }

  return (
    <div className="relative inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="btn-pill-success disabled:opacity-60"
        title="Group low-stock materials by supplier and create draft POs"
      >
        <Zap size={12} />
        {pending ? 'Drafting…' : 'Auto-draft POs'}
      </button>

      {result.kind === 'success' && (
        <Link
          href="/purchase-orders?status=DRAFT"
          className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold text-success-700 hover:bg-success-200"
        >
          <CheckCircle2 size={11} />
          {result.draftsCreated} draft{result.draftsCreated === 1 ? '' : 's'} ready · review
        </Link>
      )}
      {result.kind === 'empty' && (
        <span className="text-[10px] font-semibold text-slate-500">
          Nothing to draft — stock is healthy.
        </span>
      )}
      {result.kind === 'error' && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700">
          <AlertCircle size={11} />
          {result.message}
        </span>
      )}
    </div>
  );
}
