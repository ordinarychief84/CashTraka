'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';

/**
 * One-click "draft me a PO for this shortage" button. Lives on each
 * row of the /inventory shortages list. POSTs to
 * /api/purchase-orders/from-shortage, redirects to the new draft on
 * success, surfaces the server's validation error inline on failure
 * (the most common one: "material has no supplier assigned").
 */
export function DraftPOFromShortageButton({
  materialId,
  label = 'Draft PO',
}: {
  materialId: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/purchase-orders/from-shortage', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ materialId }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { id?: string };
          error?: string;
        };
        if (!res.ok || body.success === false) {
          setError(body.error || 'Could not draft PO');
          return;
        }
        if (body.data?.id) {
          router.push(`/purchase-orders/${body.data.id}`);
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
      >
        <Truck size={11} />
        {isPending ? 'Drafting…' : label}
      </button>
      {error ? (
        <span className="max-w-[200px] text-[10px] text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
