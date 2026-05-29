import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { HeroMockup } from './HeroMockup';
import { FloatingCard } from './FloatingCard';

/**
 * Post-pivot hero — CashTraka is a single-line "seller" product now
 * (small batch businesses). The old ICP toggle that surfaced a
 * landlord variant has been removed.
 */
const COPY = {
  eyebrow: 'The #1 Payment Tracker for Nigerian Sellers',
  headline: 'Know who paid. Know who owes. Collect what is yours.',
  sub:
    'CashTraka replaces your notebook, your spreadsheet, and your memory. Track every payment, send invoices, chase debts via WhatsApp, and never lose another naira.',
  ctaPrimary: 'Start free, no card needed',
  ctaSecondary: 'See how it works',
  ctaHref: '/signup?type=seller',
};

export function HeroICP() {
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
              {COPY.eyebrow}
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
              {COPY.headline}
            </h1>
            <p className="mt-4 text-lg text-slate-600 md:text-xl">{COPY.sub}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={COPY.ctaHref} className="btn-primary">
                {COPY.ctaPrimary}
                <ArrowRight size={16} />
              </Link>
              <a href="#solutions" className="btn-secondary">
                {COPY.ctaSecondary}
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
