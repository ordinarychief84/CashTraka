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
 * Hero card on /showroom — surfaces the storefront link with one-tap copy
 * and WhatsApp share when ready, or a single "Set up" CTA when not.
 */
export function ShowroomHero({ slug, publicUrl, catalogReady, businessName }: Props) {
  const [copied, setCopied] = useState(false);

  if (!slug || !publicUrl || !catalogReady) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-white to-amber-50 p-6 ring-1 ring-border">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200">
              <Wand2 size={11} />
              Get started
            </div>
            <h2 className="text-lg font-bold text-ink">
              Your showroom isn&apos;t live yet
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Pick a storefront slug, and you&apos;ll have a public link customers can open
              from any WhatsApp message — no app install, no login.
            </p>
          </div>
          <Link
            href="/settings?tab=storefront"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
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
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-5 ring-1 ring-border sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-success-700 ring-1 ring-success-200">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-700" />
            Live
          </div>
          <h2 className="truncate text-lg font-bold text-ink">{businessName}</h2>
          <div className="mt-2 flex items-center gap-2">
            <code className="truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-sm text-brand-700 ring-1 ring-border">
              {publicUrl}
            </code>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <Link
            href={publicUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500"
          >
            <ExternalLink size={13} />
            Open
          </Link>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1fbd5b]"
          >
            <MessageCircle size={13} />
            Share on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
