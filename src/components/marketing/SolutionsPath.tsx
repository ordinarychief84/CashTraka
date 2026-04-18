'use client';

import Link from 'next/link';
import { Store, Home, Check, ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

/**
 * "Pick your path" — the ICP self-select, promoted from inside the hero
 * into its own breathing-room section. Two big cards. Each routes to the
 * dedicated solution landing (/for-business, /for-landlords).
 */
export function SolutionsPath() {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-16 md:py-20">
      <div className="container-app">
        <Reveal from="up">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
              Two solutions · one platform
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
              Built for your kind of business
            </h2>
            <p className="mt-3 text-slate-600">
              Whether you sell products or collect rent, CashTraka adapts to the way
              you work. Pick your path and see what is included.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2 md:gap-6">
          <Reveal from="up" delay={120}>
            <PathCard
              icon={Store}
              accent="brand"
              kicker="For Small Business"
              title="CashTraka for Business"
              desc="For sellers, vendors, tailors, and service providers — verify every transfer, issue invoices and receipts, and chase debts on WhatsApp without the awkwardness."
              features={[
                'Bank-alert payment verification',
                'Professional invoices & auto receipts',
                'Staff, attendance & payroll',
                'Inventory + expenses + real profit',
              ]}
              href="/for-business"
              cta="Explore for Business"
            />
          </Reveal>
          <Reveal from="up" delay={200}>
            <PathCard
              icon={Home}
              accent="success"
              kicker="For Landlords"
              title="CashTraka for Landlords"
              desc="For landlords, property managers, and estate agents — track rent across every unit, send automatic reminders, and know exactly who is behind."
              features={[
                'Rent tracker with collection-rate KPI',
                'Auto WhatsApp rent reminders',
                'Bank-alert rent verification',
                'Per-property expenses & net profit',
              ]}
              href="/for-landlords"
              cta="Explore for Landlords"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PathCard({
  icon: Icon,
  accent,
  kicker,
  title,
  desc,
  features,
  href,
  cta,
}: {
  icon: typeof Store;
  accent: 'brand' | 'success';
  kicker: string;
  title: string;
  desc: string;
  features: string[];
  href: string;
  cta: string;
}) {
  const styles =
    accent === 'brand'
      ? {
          border: 'border-brand-100 hover:border-brand-400',
          gradient: 'from-brand-50 via-white to-white',
          iconBg: 'bg-brand-500',
          iconRing: 'shadow-brand-500/20',
          kickerText: 'text-brand-700',
          check: 'text-brand-600',
          ctaBg: 'bg-ink hover:bg-brand-700',
          glow: 'bg-brand-300/30',
        }
      : {
          border: 'border-success-100 hover:border-success-500',
          gradient: 'from-success-50 via-white to-white',
          iconBg: 'bg-success-600',
          iconRing: 'shadow-success-500/20',
          kickerText: 'text-success-700',
          check: 'text-success-600',
          ctaBg: 'bg-ink hover:bg-success-700',
          glow: 'bg-success-300/30',
        };

  return (
    <Link
      href={href}
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-br ${styles.gradient} ${styles.border} p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-8`}
    >
      {/* Corner glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full ${styles.glow} blur-3xl opacity-0 transition group-hover:opacity-100`}
      />

      <div className="relative flex items-start justify-between">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg ${styles.iconBg} ${styles.iconRing} transition group-hover:scale-105 group-hover:rotate-3`}
        >
          <Icon size={26} />
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.12em] ${styles.kickerText}`}
        >
          {kicker}
        </span>
      </div>

      <h3 className="relative mt-5 text-2xl font-black tracking-tight text-ink md:text-[1.6rem]">
        {title}
      </h3>
      <p className="relative mt-2 text-sm leading-relaxed text-slate-600">
        {desc}
      </p>

      <ul className="relative mt-5 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <Check
              size={15}
              strokeWidth={3}
              className={`mt-0.5 shrink-0 ${styles.check}`}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div
        className={`relative mt-6 inline-flex items-center justify-center gap-2 self-start rounded-full px-5 py-3 text-sm font-bold text-white transition ${styles.ctaBg}`}
      >
        {cta}
        <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
