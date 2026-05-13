import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Section } from '@/components/marketing/Section';
import { PricingCards } from '@/components/marketing/PricingCards';
import { FAQ } from '@/components/marketing/FAQ';
import { Reveal } from '@/components/marketing/Reveal';
import { Stagger } from '@/components/marketing/Stagger';
import { ScrollProgress } from '@/components/marketing/ScrollProgress';
import {
  HERO,
  PROBLEM,
  SOLUTION,
  HOW_IT_WORKS,
  FEATURES,
  SHORTAGE,
  INDUSTRIES,
  INVOICES_RECEIPTS,
  DASHBOARD,
  PRICING_HEADING,
  PRICING_SUB,
  FAQ_ITEMS,
  FINAL_CTA,
} from '@/lib/marketing-content';

export const metadata: Metadata = {
  // Use absolute so the layout's "%s | CashTraka" template does not
  // append another suffix on the homepage. Other pages let the template
  // handle the suffix automatically.
  title: {
    absolute: 'CashTraka | Production Planning Software for Small Batch Businesses',
  },
  description:
    'CashTraka helps small batch businesses plan production, track raw materials, avoid shortages, manage orders, and generate invoices and receipts from one simple system.',
  alternates: { canonical: 'https://www.cashtraka.co/' },
  openGraph: {
    title: 'CashTraka | Production Planning Software for Small Batch Businesses',
    description:
      'Plan production, track materials, and avoid costly shortages. CashTraka brings customer orders, production, raw materials, inventory, invoices, and receipts into one simple workflow.',
    url: 'https://www.cashtraka.co/',
    siteName: 'CashTraka',
    type: 'website',
    images: [
      { url: 'https://www.cashtraka.co/icon-512.png', width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CashTraka | Production Planning for Small Batch Businesses',
    description:
      'Plan production, track materials, and avoid costly shortages. Built for small factories, skincare, food, fashion, furniture, agro-processing, and printing.',
    images: ['https://www.cashtraka.co/icon-512.png'],
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <FeatureGrid />
        <ShortageHighlight />
        <IndustriesPreview />
        <InvoicesReceiptsSection />
        <DashboardSection />
        <PricingPreview />
        <FAQPreview />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ============== HERO ============== */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(60% 80% at 50% 0%, rgba(31,193,238,0.18), transparent 70%),' +
            'radial-gradient(40% 60% at 80% 20%, rgba(139,217,30,0.10), transparent 70%)',
        }}
      />
      <div className="container-app pt-14 pb-16 md:pt-20 md:pb-24">
        <Reveal from="up">
          <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            {HERO.eyebrow}
          </span>
        </Reveal>
        <Reveal from="up" delay={80}>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-ink md:text-6xl md:leading-[1.05]">
            {HERO.h1}
          </h1>
        </Reveal>
        <Reveal from="up" delay={160}>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
            {HERO.sub}
          </p>
        </Reveal>
        <Reveal from="up" delay={240}>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={HERO.primaryCta.href} className="btn-primary text-sm md:text-base">
              {HERO.primaryCta.label}
              <ArrowRight size={16} />
            </Link>
            <Link href={HERO.secondaryCta.href} className="btn-secondary text-sm md:text-base">
              {HERO.secondaryCta.label}
            </Link>
          </div>
        </Reveal>
        <Reveal from="up" delay={320}>
          <p className="mt-6 max-w-3xl text-sm text-slate-500">{HERO.support}</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============== PROBLEM ============== */

function ProblemSection() {
  return (
    <Section
      id="problem"
      tone="muted"
      eyebrow="The reality"
      title={PROBLEM.heading}
      subtitle={PROBLEM.body}
    >
      <Stagger from="up" step={70}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PROBLEM.pains.map((p) => (
            <div key={p} className="card flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <X size={14} strokeWidth={3} />
              </span>
              <p className="text-sm font-medium text-slate-800">{p}</p>
            </div>
          ))}
        </div>
      </Stagger>
      <Reveal from="up" delay={200}>
        <p className="mt-10 max-w-3xl text-base font-medium text-slate-700 md:text-lg">
          {PROBLEM.closing}
        </p>
      </Reveal>
    </Section>
  );
}

/* ============== SOLUTION ============== */

function SolutionSection() {
  return (
    <Section
      id="solution"
      eyebrow="The answer"
      title={SOLUTION.heading}
      subtitle={SOLUTION.body}
    >
      <Stagger from="up" step={60}>
        <div className="grid gap-3 md:grid-cols-2">
          {SOLUTION.bullets.map((b) => (
            <div key={b} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Check size={14} strokeWidth={3} />
              </span>
              <p className="text-sm font-medium text-slate-800">{b}</p>
            </div>
          ))}
        </div>
      </Stagger>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/signup" className="btn-primary text-sm">
          Start free
          <ArrowRight size={16} />
        </Link>
        <Link href="/solutions" className="btn-secondary text-sm">
          See how it works
        </Link>
      </div>
    </Section>
  );
}

/* ============== HOW IT WORKS ============== */

function HowItWorksSection() {
  return (
    <Section
      id="how-it-works"
      tone="muted"
      eyebrow="How it works"
      title={HOW_IT_WORKS.heading}
      subtitle="Five steps. One workflow. No spreadsheets."
    >
      <ol className="grid gap-4 md:grid-cols-5">
        {HOW_IT_WORKS.steps.map((step, i) => (
          <Reveal key={step.title} from="up" delay={i * 80}>
            <li className="card relative h-full p-5">
              <span className="absolute -top-3 left-5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-black text-white shadow-md">
                {i + 1}
              </span>
              <h3 className="mt-3 text-base font-bold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

/* ============== FEATURE GRID ============== */

function FeatureGrid() {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title="Everything small production businesses need to stay organized."
      subtitle="Each feature is built for the way small batch teams actually work — fast, mobile, WhatsApp-friendly."
    >
      <Stagger from="up" step={50}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card group h-full p-5 transition hover:-translate-y-0.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                <f.icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </Stagger>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/signup" className="btn-primary text-sm">
          Start free
          <ArrowRight size={16} />
        </Link>
        <Link href="/solutions" className="btn-secondary text-sm">
          View all features
        </Link>
      </div>
    </Section>
  );
}

/* ============== SHORTAGE HIGHLIGHT ============== */

function ShortageHighlight() {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-24"
      style={{
        backgroundImage:
          'radial-gradient(circle at 18% 0%, rgba(31,193,238,0.40), transparent 55%),' +
          'radial-gradient(circle at 88% 100%, rgba(69,203,242,0.25), transparent 55%),' +
          'linear-gradient(135deg, #003A52 0%, #00577A 45%, #0076A0 100%)',
      }}
    >
      <div className="container-app">
        <Reveal from="up">
          <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            Shortage alerts
          </span>
        </Reveal>
        <Reveal from="up" delay={80}>
          <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl md:leading-[1.1]">
            {SHORTAGE.heading}
          </h2>
        </Reveal>
        <Reveal from="up" delay={160}>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cyan-100 md:text-lg">
            {SHORTAGE.body}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Reveal from="up" delay={200}>
            <div className="rounded-2xl bg-white/95 p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                You need
              </h3>
              <ul className="mt-3 space-y-2 text-sm font-medium text-slate-800">
                {SHORTAGE.required.map((r) => (
                  <li key={r.unit} className="flex items-center justify-between">
                    <span>{r.unit}</span>
                    <span className="font-mono font-bold">{r.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal from="up" delay={280}>
            <div className="rounded-2xl bg-white/95 p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                You have
              </h3>
              <ul className="mt-3 space-y-2 text-sm font-medium text-slate-800">
                {SHORTAGE.onHand.map((r) => (
                  <li key={r.unit} className="flex items-center justify-between">
                    <span>{r.unit}</span>
                    <span className="font-mono font-bold">{r.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal from="up" delay={360}>
            <div className="flex h-full flex-col justify-between rounded-2xl border border-rose-300 bg-rose-50 p-5 shadow-xl">
              <div>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700">
                  <AlertTriangle size={12} /> CashTraka shows
                </h3>
                <p className="mt-3 text-sm text-rose-800">Shortage</p>
                <p className="mt-1 text-3xl font-black text-rose-900">{SHORTAGE.shortage.qty}</p>
                <p className="text-sm font-semibold text-rose-800">{SHORTAGE.shortage.unit}</p>
              </div>
              <p className="mt-4 text-xs text-rose-700">
                Buy or substitute before you start the run.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={SHORTAGE.cta.href}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-cyan-50"
          >
            {SHORTAGE.cta.label}
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/solutions"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============== INDUSTRIES PREVIEW ============== */

function IndustriesPreview() {
  return (
    <Section
      id="industries"
      tone="muted"
      eyebrow="Industries"
      title="Built for small batch businesses across many industries."
      subtitle="Each one looks different from the outside, but the daily problem is the same: keep orders, materials, production, and receipts in sync."
    >
      <Stagger from="up" step={60}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <Link
              key={ind.slug}
              href={`/industries#${ind.slug}`}
              className="card group h-full p-5 transition hover:-translate-y-0.5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-700 transition group-hover:bg-success-500 group-hover:text-white">
                <ind.icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink">{ind.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{ind.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                See how
                <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </Stagger>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/industries" className="btn-primary text-sm">
          Explore industries
          <ArrowRight size={16} />
        </Link>
        <Link href="/signup" className="btn-secondary text-sm">
          Start free
        </Link>
      </div>
    </Section>
  );
}

/* ============== INVOICES & RECEIPTS ============== */

function InvoicesReceiptsSection() {
  return (
    <Section
      id="invoices"
      eyebrow="Invoices & receipts"
      title={INVOICES_RECEIPTS.heading}
      subtitle={INVOICES_RECEIPTS.body}
    >
      <div className="grid gap-8 md:grid-cols-2">
        <Stagger from="up" step={60}>
          <ul className="space-y-3">
            {INVOICES_RECEIPTS.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="text-sm font-medium text-slate-800">{b}</span>
              </li>
            ))}
          </ul>
        </Stagger>
        <Reveal from="up" delay={200}>
          <div className="card overflow-hidden p-0">
            <div className="border-b border-border bg-slate-50 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Invoice
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">INV-00042</p>
            </div>
            <div className="space-y-2 p-5 text-sm">
              <Row label="Body cream, 250ml × 100" value="₦150,000" />
              <Row label="Custom labels × 100" value="₦12,000" />
              <Row label="Delivery" value="₦5,000" />
              <div className="my-3 border-t border-border" />
              <Row label="Total" value="₦167,000" bold />
              <p className="text-xs text-slate-500">Pay via card or transfer · Receipt sent automatically</p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? 'font-bold text-slate-900' : 'text-slate-700'}>{label}</span>
      <span className={bold ? 'font-bold text-slate-900' : 'text-slate-900'}>{value}</span>
    </div>
  );
}

/* ============== DASHBOARD ============== */

function DashboardSection() {
  return (
    <Section
      id="dashboard"
      tone="muted"
      eyebrow="Dashboard"
      title={DASHBOARD.heading}
      subtitle={DASHBOARD.body}
    >
      <Stagger from="up" step={50}>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {DASHBOARD.signals.map((s, i) => (
            <div key={s} className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s}</p>
              <p className="mt-2 text-2xl font-black text-ink">
                {[3, 2, 4, 1, 5, 7, 2, 6][i] ?? 0}
              </p>
            </div>
          ))}
        </div>
      </Stagger>
      <p className="mt-5 text-xs text-slate-500">
        Sample numbers for illustration. Your real dashboard reflects your own orders, production, materials, and payments.
      </p>
    </Section>
  );
}

/* ============== PRICING PREVIEW ============== */

function PricingPreview() {
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title={PRICING_HEADING}
      subtitle={PRICING_SUB}
    >
      <PricingCards />
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/pricing" className="btn-primary text-sm">
          View full pricing
          <ArrowRight size={16} />
        </Link>
      </div>
    </Section>
  );
}

/* ============== FAQ PREVIEW ============== */

function FAQPreview() {
  return (
    <Section
      id="faq"
      tone="muted"
      eyebrow="FAQs"
      title="Quick answers."
      subtitle="The questions small batch businesses ask before signing up."
    >
      <FAQ items={FAQ_ITEMS.slice(0, 6)} />
      <div className="mt-10 flex justify-center">
        <Link href="/faqs" className="btn-secondary text-sm">
          Read all FAQs
          <ArrowRight size={16} />
        </Link>
      </div>
    </Section>
  );
}

/* ============== FINAL CTA ============== */

function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-24"
      style={{
        backgroundImage:
          'linear-gradient(135deg, #003A52 0%, #0076A0 60%, #1FC1EE 100%)',
      }}
    >
      <div className="container-app text-center">
        <Reveal from="up">
          <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl md:leading-[1.1]">
            {FINAL_CTA.heading}
          </h2>
        </Reveal>
        <Reveal from="up" delay={120}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-cyan-50 md:text-lg">
            {FINAL_CTA.body}
          </p>
        </Reveal>
        <Reveal from="up" delay={200}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={FINAL_CTA.primaryCta.href}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-50 md:text-base"
            >
              {FINAL_CTA.primaryCta.label}
              <ArrowRight size={16} />
            </Link>
            <Link
              href={FINAL_CTA.secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 md:text-base"
            >
              {FINAL_CTA.secondaryCta.label}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
