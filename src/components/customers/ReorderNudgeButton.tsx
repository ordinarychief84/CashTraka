'use client';

import { useState, useTransition } from 'react';
import { MessageCircle } from 'lucide-react';

/**
 * "Send re-order nudge" button on the Customer detail page. Hits
 * /api/customers/:id/reorder-nudge to compute a personalised wa.me
 * link (days-since-last-order + last items pre-quoted), then opens
 * WhatsApp. Nothing is sent automatically — the seller still has to
 * tap Send inside WhatsApp.
 */
export function ReorderNudgeButton({ customerId }: { customerId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/customers/${customerId}/reorder-nudge`,
          { method: 'GET' },
        );
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { link?: string };
          error?: string;
        };
        if (!res.ok || body.success === false || !body.data?.link) {
          setError(body.error || 'Could not build nudge link');
          return;
        }
        window.open(body.data.link, '_blank', 'noopener,noreferrer');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
      >
        <MessageCircle size={13} />
        {isPending ? 'Opening WhatsApp…' : 'Send re-order nudge'}
      </button>
      {error ? (
        <span className="text-[11px] text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
