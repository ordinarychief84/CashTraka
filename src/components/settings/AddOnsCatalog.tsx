'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Barcode,
  Layers,
  MessageCircle,
  FileCheck2,
  Wallet,
  Repeat,
  Store,
  Home,
  Check,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type AddOnStatus = 'INSTALLED' | 'AVAILABLE' | 'COMING_SOON';

interface AddOn {
  slug: string;
  name: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  description: string;
  /** Where the user lands when they click Install / Open. */
  href?: string;
  status: AddOnStatus;
}

const ADD_ONS: AddOn[] = [
  // Always-on CashTraka modules
  {
    slug: 'whatsapp',
    name: 'WhatsApp Hub',
    icon: MessageCircle,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-700',
    description:
      'Send receipts, invoices and reminders to customers on WhatsApp. wa.me deep links so you stay on the free tier.',
    href: '/dashboard',
    status: 'INSTALLED',
  },
  {
    slug: 'firs-einvoice',
    name: 'FIRS e-Invoicing',
    icon: FileCheck2,
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-700',
    description:
      'Generate the FIRS-compliant XML and QR code on every invoice. Auto-submit to the MBS sandbox when enabled.',
    href: '/settings/edit',
    status: 'INSTALLED',
  },
  {
    slug: 'paystack',
    name: 'Paystack auto-confirm',
    icon: Wallet,
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-700',
    description:
      'Customers pay via Paystack and the matching invoice is auto-confirmed when the webhook lands.',
    href: '/billing',
    status: 'INSTALLED',
  },
  {
    slug: 'recurring-invoices',
    name: 'Recurring invoices',
    icon: Repeat,
    iconBg: 'bg-owed-50',
    iconColor: 'text-owed-700',
    description:
      'Schedule monthly / weekly invoices on autopilot. Customers get the same wa.me + Paystack flow.',
    href: '/recurring-invoices',
    status: 'INSTALLED',
  },
  {
    slug: 'catalog',
    name: 'Public storefront',
    icon: Store,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-700',
    description:
      'Publish your product catalog on a public CashTraka URL. Customers browse, add to cart, and request a quote.',
    href: '/dashboard',
    status: 'INSTALLED',
  },
  {
    slug: 'property',
    name: 'Property management',
    icon: Home,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    description:
      'Switch the workspace into landlord mode — rent rolls, tenant invoices, lease renewals.',
    href: '/tenants',
    status: 'AVAILABLE',
  },

  // Rackbeat-style add-ons surfaced for parity with the screenshot
  {
    slug: 'b2b-shop',
    name: 'B2B Shop',
    icon: Package,
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-700',
    description:
      'Give your customers their own login so they can place new orders directly. You avoid manual processing and your customers always have access to correct stock figures and the latest products.',
    status: 'COMING_SOON',
  },
  {
    slug: 'serial-numbers',
    name: 'Serial numbers',
    icon: Barcode,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    description:
      'Track unique items using serial numbers. Required for warranty-sensitive electronics, machinery, and high-value SKUs.',
    status: 'COMING_SOON',
  },
  {
    slug: 'batch',
    name: 'Batch',
    icon: Layers,
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-700',
    description:
      'Manage shelf life of items with expiration, giving you an overview of which batches should be sold first, based on the items you have in stock and their last sell-by date.',
    status: 'COMING_SOON',
  },
];

function StatusBadge({ status }: { status: AddOnStatus }) {
  if (status === 'INSTALLED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700">
        <Check size={10} />
        Installed
      </span>
    );
  }
  if (status === 'AVAILABLE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
        <Package size={10} />
        Included
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
      <Lock size={10} />
      Coming soon
    </span>
  );
}

export function AddOnsCatalog() {
  // Local-only "installed" state for COMING_SOON cards — flips the
  // button label so the user gets feedback even before we wire real
  // installation logic. Resets on page reload.
  const [waitlisted, setWaitlisted] = useState<Set<string>>(new Set());

  function joinWaitlist(slug: string) {
    setWaitlisted((prev) => new Set(prev).add(slug));
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {ADD_ONS.map((a) => {
        const Icon = a.icon;
        const onWaitlist = waitlisted.has(a.slug);
        return (
          <div
            key={a.slug}
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Visual header */}
            <div className="flex h-40 items-center justify-center border-b border-slate-100 bg-slate-50/60">
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-2xl ${a.iconBg} ${a.iconColor}`}
              >
                <Icon size={36} />
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-[15px] font-bold text-slate-900">{a.name}</h3>
                <StatusBadge status={a.status} />
              </div>
              <p className="mb-4 flex-1 text-[13px] leading-relaxed text-slate-600">
                {a.description}
              </p>

              {a.status === 'INSTALLED' && a.href ? (
                <Link
                  href={a.href}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open
                </Link>
              ) : a.status === 'AVAILABLE' && a.href ? (
                <Link
                  href={a.href}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
                >
                  Install
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => joinWaitlist(a.slug)}
                  disabled={onWaitlist}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {onWaitlist ? 'On the waitlist' : 'Notify me'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
