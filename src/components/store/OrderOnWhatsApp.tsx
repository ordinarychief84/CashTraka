'use client';

import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';

type Props = {
  slug: string;
  productId: string;
  disabled?: boolean;
  disabledReason?: string;
};

/**
 * Two-step "Order on WhatsApp" flow.
 *  1. Customer enters optional name + phone + note.
 *  2. We POST /api/store/[slug]/order, the server logs a CatalogEvent and
 *     returns a wa.me link, which we redirect to.
 *
 * No Payment row is created. The seller records payment manually after the
 * chat resolves; that's what triggers the receipt.
 */
export function OrderOnWhatsApp({ slug, productId, disabled, disabledReason }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-500"
      >
        {disabledReason ?? 'Unavailable'}
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/store/${encodeURIComponent(slug)}/order`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId,
          customerName: name.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { waLink?: string; error?: string };
      if (!res.ok || !json.waLink) {
        setError(json.error ?? 'Could not start the WhatsApp chat. Please try again.');
        setSubmitting(false);
        return;
      }
      window.location.href = json.waLink;
    } catch {
      setError('Network error. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        maxLength={64}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Your phone (optional)"
        maxLength={20}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (e.g. size, colour)"
        maxLength={280}
        rows={2}
        className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />

      {error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white hover:bg-[#1fbd5b] disabled:opacity-60"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
        Order on WhatsApp
      </button>
    </form>
  );
}
