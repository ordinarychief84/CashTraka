import Link from 'next/link';
import {
  ArrowRight,
  Star,
  ClipboardList,
  AlertTriangle,
  Boxes,
  Truck,
  FileText,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DashboardMockup, DashboardSecondaryCards } from './DashboardMockup';
import { PhoneMockup } from './PhoneMockup';
import { BottomValueStrip } from './BottomValueStrip';

const FEATURES: {
  Icon: LucideIcon;
  iconTone: 'brand' | 'owed' | 'success';
  label: string;
}[] = [
  {
    Icon: ClipboardList,
    iconTone: 'brand',
    label: 'Customer Orders & Production Planning',
  },
  {
    Icon: AlertTriangle,
    iconTone: 'owed',
    label: 'Material Shortage Alerts',
  },
  {
    Icon: Boxes,
    iconTone: 'success',
    label: 'Inventory & Stock Management',
  },
  {
    Icon: Truck,
    iconTone: 'owed',
    label: 'Purchase Orders & Supplier Management',
  },
  {
    Icon: FileText,
    iconTone: 'success',
    label: 'Invoices, Payments & Receipts',
  },
  {
    Icon: BarChart3,
    iconTone: 'brand',
    label: 'Reports & Business Insights',
  },
];

const FEATURE_ICON_BG: Record<'brand' | 'owed' | 'success', string> = {
  brand: 'bg-brand-50 text-brand-700',
  owed: 'bg-owed-50 text-owed-700',
  success: 'bg-success-50 text-success-700',
};

/**
 * Top-of-page hero section that replaces the prior compact hero.
 *
 * Two-column on desktop:
 *   Left  · pill badge → headline → subhead → 6-feature list → CTAs → social proof
 *   Right · dashboard mockup overlapping with iPhone mockup, plus two
 *           secondary cards (Recent Orders + Purchase Orders) that peek
 *           out from below the main dashboard frame
 *
 * Single column on mobile: text first, then the dashboard stack.
 * Bottom edge of the section hosts a 4-column value-prop strip.
 */
export function MarketingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-brand-50/30 to-white pt-10 pb-12 md:pt-16">
      <div className="container-app">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* LEFT — copy */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1.5 text-xs font-semibold text-brand-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-success-500 opacity-75" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-success-500" />
              </span>
              Operational Planning System for Small Batch Businesses
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[1.1] tracking-tight text-ink md:text-5xl xl:text-[3.25rem]">
              Plan production,
              <br />
              <span className="text-brand-500">track materials,</span>
              <br />
              avoid costly shortages.
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">
              CashTraka helps small batch businesses manage orders, production,
              inventory, purchases, invoices, and receipts from one simple
              operational system.
            </p>

            {/* Feature checklist */}
            <ul className="mt-6 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${FEATURE_ICON_BG[f.iconTone]}`}
                  >
                    <f.Icon size={16} />
                  </span>
                  <span className="text-sm font-medium text-slate-800">
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400"
              >
                Start Free
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact?topic=demo"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Book a Demo
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white"
                    style={{
                      background: [
                        'linear-gradient(135deg,#fda4af,#fb7185)',
                        'linear-gradient(135deg,#bfdbfe,#60a5fa)',
                        'linear-gradient(135deg,#fde68a,#f59e0b)',
                        'linear-gradient(135deg,#bbf7d0,#22c55e)',
                      ][i],
                    }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-owed-500">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <div className="text-xs text-slate-600">
                  Trusted by <span className="font-bold text-ink">1,000+</span>{' '}
                  business owners across Nigeria
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — mockups */}
          <div className="relative lg:col-span-6 xl:col-span-7">
            {/* Background dashboard mockup */}
            <div className="relative">
              <DashboardMockup />
            </div>

            {/* Floating secondary cards bottom-left */}
            <div className="pointer-events-none absolute -bottom-10 -left-2 hidden w-[280px] sm:block md:w-[340px] lg:-left-6 lg:-bottom-12 xl:w-[420px]">
              <DashboardSecondaryCards />
            </div>

            {/* iPhone mockup bottom-right */}
            <div className="pointer-events-none absolute -bottom-8 right-0 hidden w-[210px] sm:block md:w-[240px] lg:-right-2 lg:-bottom-12 xl:w-[260px]">
              <PhoneMockup />
            </div>
          </div>
        </div>

        {/* Value-prop strip — pulled out so it spans full content width */}
        <div className="mt-24 md:mt-28 lg:mt-32">
          <BottomValueStrip />
        </div>
      </div>
    </section>
  );
}
