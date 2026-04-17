'use client';

import Link from 'next/link';
import { Store, Home, ArrowRight, Check } from 'lucide-react';
import { Reveal } from './Reveal';
import { HeroMockup } from './HeroMockup';
import { FloatingCard } from './FloatingCard';

/**
 * Solutions-first hero.
 *
 * Replaces the old "I'm a seller / I manage property" toggle with a
 * solution-picker: one neutral hero headline plus two clear product cards
 * that route to the ICP-specific landing pages (/for-business,
 * /for-landlords). Visitors self-select by *what they need* rather than
 * *who they are* — matches how Connecteam, Linear, and Pipedrive organise
 * their top-of-funnel.
 */
export function HeroSolutions() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white py-14 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-0 h-80 w-[45rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div className="container-app relative z-10">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <Reveal from="up">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              Money tracker for Nigerian businesses
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
              Get paid. Get paid on time. Get paid the right amount.
            </h1>
            <p className="mt-4 text-lg text-slate-600 md:text-xl">
              CashTraka verifies payments against your real bank alert, chases
              who owes you, and keeps a clean record of every Naira — whether
              you&apos;re running a business or renting out property.
            </p>

            {/* Solution picker */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <SolutionCard
                icon={Store}
                accent="brand"
                title="For Small Business"
                sub="Shops, food, services, tailors — track sales, debts and receipts."
                href="/for-business"
                bullets={['Bank-alert verification', 'Invoices & receipts', 'Staff & payroll']}
              />
              <SolutionCard
                icon={Home}
                accent="success"
                title="For Landlords"
                sub="Track rent across properties, auto-remind tenants, issue receipts."
                href="/for-landlords"
                bullets={['Rent tracker + KPI', 'Tenant reminders', 'Per-property reports']}
              />
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Set up in under 5 minutes · No card required · Works on any phone
            </p>
          </Reveal>
          <Reveal from="right" delay={150} distance={36} blur className="order-first md:order-last">
            <FloatingCard distance={10} speed={5}>
              <HeroMockup />
            </FloatingCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function SolutionCard({
  icon: Icon,
  accent,
  title,
  sub,
  href,
  bullets,
}: {
  icon: typeof Store;
  accent: 'brand' | 'success';
  title: string;
  sub: string;
  href: string;
  bullets: string[];
}) {
  const accentClasses =
    accent === 'brand'
      ? {
          border: 'border-brand-100 hover:border-brand-400',
          bg: 'bg-gradient-to-br from-brand-50/60 to-white',
          iconBg: 'bg-brand-500',
          link: 'text-brand-700',
          check: 'text-brand-600',
        }
      : {
          border: 'border-success-100 hover:border-success-500',
          bg: 'bg-gradient-to-br from-success-50/60 to-white',
          iconBg: 'bg-success-600',
          link: 'text-success-700',
          check: 'text-success-600',
        };

  return (
    <Link
      href={href}
      className={`group relative flex h-full flex-col gap-3 rounded-2xl border ${accentClasses.border} ${accentClasses.bg} p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${accentClasses.iconBg}`}
        >
          <Icon size={18} />
        </span>
        <span className="text-sm font-bold text-ink">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-600">{sub}</p>
      <ul className="space-y-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
            <Check size={11} strokeWidth={3} className={accentClasses.check} />
            {b}
          </li>
        ))}
      </ul>
      <span
        className={`mt-auto inline-flex items-center gap-1 text-xs font-semibold ${accentClasses.link}`}
      >
        Explore
        <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
