'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle } from 'lucide-react';
import { waLink } from '@/lib/whatsapp';

type Props = { url: string; businessName: string };

export function ShareCatalogActions({ url, businessName }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof window === 'undefined') return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => null);
  }

  function shareWhatsApp() {
    const message = `Check out the ${businessName} shop:\n${url}`;
    // No phone target — just opens WhatsApp's share sheet via web link.
    const href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(href, '_blank');
  }

  // Quick QR code via a public endpoint — keeps the bundle small.
  // Falls back gracefully if the customer is offline; the URL itself is still copy-paste-able.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

  return (
    <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-500"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1fbd5b]"
        >
          <MessageCircle size={14} />
          Share on WhatsApp
        </button>
      </div>

      <div className="rounded-lg bg-white p-2 ring-1 ring-border">
        <img src={qrSrc} alt="Storefront QR code" className="h-40 w-40 rounded" />
      </div>
    </div>
  );
}

// Re-export for convenience.
export { waLink };
