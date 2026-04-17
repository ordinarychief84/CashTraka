'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store, Home, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';
import { HeroMockup } from './HeroMockup';
import { FloatingCard } from './FloatingCard';

type IC = 'seller' | 'property_manager';

const COPY = {
  seller: {
    eyebrow: 'WhatsApp Sales & Cash Tracker',
    headline: 'Stop losing money from customers who haven’t paid',
    sub:
      'Track payments, verify transfers with your bank alert, send professional invoices and auto receipts, chase debts over WhatsApp — all in one place.',
    ctaPrimary: 'Start free',
    ctaSecondary: 'See how it works',
    ctaHref: '/signup?type=seller',
  },
  property_manager: {
    eyebrow: 'Rent & Property Tracker',
    headline: 'Collect rent on time. Know who’s behind.',
    sub:
      'Track every tenant, every unit, every rent cycle. Send WhatsApp rent reminders, verify payments with your bank alert, and issue receipts automatically.',
    ctaPrimary: 'Start free',
    ctaSecondary: 'See how it works',
    ctaHref: '/signup?type=property_manager',
  },
};

export function HeroICP() {
  const [ic, setIc] = useState<IC>('seller');
  const copy = COPY[ic];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white py-14 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-0 h-80 w-[45rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div className="container-app relative z-10">
        {/* ICP toggle */}
        <Reveal from="up" className="mb-8 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-white p-1 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setIc('seller')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition',
                ic === 'seller' ? 'bg-brand-500 text-white' : 'text-slate-600 hover:text-ink',
              )}
            >
              <Store size={13} />
              I'm a seller
            </button>
            <button
              type="button"
              onClick={() => setIc('property_manager')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition',
                ic === 'property_manager' ? 'bg-brand-500 text-white' : 'text-slate-600 hover:text-ink',
              )}
            >
              <Home size={13} />
              I manage property
            </button>
          </div>
        </Reveal>

        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <Reveal from="up" key={`${ic}-content`}>
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              {copy.eyebrow}
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
              {copy.headline}
            </h1>
            <p className="mt-4 text-lg text-slate-600 md:text-xl">{copy.sub}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={copy.ctaHref} className="btn-primary">
                {copy.ctaPrimary}
                <ArrowRight size={16} />
              </Link>
              <a href="#solutions" className="btn-secondary">
                {copy.ctaSecondary}
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">
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
