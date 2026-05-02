'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Wand2,
} from 'lucide-react';

type Props = {
  slug: string | null;
  publicUrl: string | null;
  catalogReady: boolean;
  businessName: string;
};

/**
 * Mobile-first hero card for the Showroom landing page. When the storefront
 * is ready, surfaces a copy-able link plus three sized-for-thumb action
 * buttons. When not ready, a single large CTA to the setup screen.
 */
export function ShowroomHero({ slug, publicUrl, catalogReady, businessName }: Props) {
  const [copied, setCopied] = useState(false);

  if (!slug || !publicUrl || !catalogReady) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-white to-amber-50 p-5 ring-1 ring-border sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200">
              <Wand2 size={11} />
              Get started
            </div>
            <h2 className="text-lg font-bold text-ink">
              Your showroom is not live yet
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Pick a storefront slug, then customers can open your catalog from any
              WhatsApp message. No app install, no login.
            </p>
          </div>
          <Link
            href="/settings?tab=storefront"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 sm:w-auto"
          >
            Set up storefront
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  function copy() {
    if (typeof window === 'undefined') return;
    navigator.clipboard
      .writeText(publicUrl!)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => null);
  }

  function shareWhatsApp() {
    const message = `Check out the ${businessName} catalog:\n${publicUrl}`;
    const href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(href, '_blank');
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-4 ring-1 ring-border sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-success-700 ring-1 ring-success-200">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-700" />
          Live
        </span>
        <span className="truncate text-sm font-semibold text-ink">{businessName}</span>
      </div>

      <code className="mt-2 block break-all rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs text-brand-700 ring-1 ring-border sm:text-sm">
        {publicUrl}
      </code>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-brand-500"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <Link
          href={publicUrl}
          target="_blank"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-brand-500"
        >
          <ExternalLink size={13} />
          Open
        </Link>
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#1fbd5b]"
        >
          <MessageCircle size={13} />
          Share
        </button>
      </div>
    </div>
  );
}
