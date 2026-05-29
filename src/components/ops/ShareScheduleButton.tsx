'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';

/**
 * "Share this week" button on the production schedule page. Hits
 * /api/production/schedule-share to build a wa.me link that summarises
 * the next 7 days, opens WhatsApp's recipient picker. Nothing is sent
 * automatically; the seller still picks the chat and taps Send.
 *
 * The summary rolls items up across runs so "120 × Shea body butter"
 * appears once rather than per run.
 */
export function ShareScheduleButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/production/schedule-share', { method: 'GET' });
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { link?: string; runCount?: number };
          error?: string;
        };
        if (!res.ok || body.success === false || !body.data?.link) {
          setError(body.error || 'Could not build share link');
          return;
        }
        if ((body.data.runCount ?? 0) === 0) {
          setError('Nothing scheduled this week to share.');
          return;
        }
        window.open(body.data.link, '_blank', 'noopener,noreferrer');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-success-300 bg-success-50 px-2.5 py-1.5 text-xs font-semibold text-success-800 transition hover:bg-success-100 disabled:opacity-60"
      >
        <Send size={13} />
        {isPending ? 'Building share…' : 'Share this week'}
      </button>
      {error ? (
        <span className="text-[11px] text-rose-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
