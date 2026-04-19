import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Home,
  Users,
  Clock3,
  AlertTriangle,
  Shield,
  Receipt,
  MessageCircle,
  BarChart3,
  FileText,
  Building2,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Section } from '@/components/marketing/Section';
import { PricingCards } from '@/components/marketing/PricingCards';
import { HeroMockup } from '@/components/marketing/HeroMockup';
import { Reveal } from '@/components/marketing/Reveal';
import { Stagger } from '@/components/marketing/Stagger';
import { HoverLift } from '@/components/marketing/HoverLift';
import { ScrollProgress } from '@/components/marketing/ScrollProgress';
import { Marquee } from '@/components/marketing/Marquee';
import { FloatingCard } from '@/components/marketing/FloatingCard';

export const metadata: Metadata = {
  title: 'CashTraka for Landlords — Track rent across every tenant',
  description:
    'Built for Nigerian landlords, property managers, and estate agents. Track rent per tenant, verify payments with bank alerts, auto-remind on WhatsApp, issue receipts.',
};

export default function ForLandlordsPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <AudienceStrip />
        <Problem />
        <FeatureGrid />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-success-50 via-white to-white py-14 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-0 h-80 w-[45rem] -translate-x-1/2 rounded-full bg-success-200/40 blur-3xl"
      />
      <div className="container-app relative z-10 grid items-center gap-10 md:grid-cols-2 md:gap-12">
        <Reveal from="up">
          <span className="inline-block rounded-full bg-success-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-success-700">
            CashTraka for Landlords
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
            Collect rent on time. Know who&apos;s behind. Stop chasing.
          </h1>
          <p className="mt-4 text-lg text-slate-600 md:text-xl">
            Built for Nigerian landlords, property managers and estate agents —
            from one-flat landlords to multi-estate portfolios. Track every
            tenant, every unit, every cycle. Auto-remind on WhatsApp. Verify
            payments against your bank alert.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup?type=property_manager" className="btn-primary">
              Start free
              <ArrowRight size={16} />
            </Link>
            <a href="#features" className="btn-secondary">
              See features
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
    </section>
  );
}

function AudienceStrip() {
  const chips = [
    'Landlords',
    'Property managers',
    'Estate agents',
    'Shortlet operators',
    'Boarding houses',
    'Mini-flats',
    'Student housing',
    'Commercial lettings',
    'Serviced apartments',
    'Compound owners',
  ].map((c) => (
    <span
      key={c}
      className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-success-400 hover:text-success-700"
    >
      {c}
    </span>
  ));
  return (
    <section className="border-y border-border bg-slate-50 py-8">
      <div className="container-app mb-4">
        <Reveal from="zoom" distance={10}>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            Built for every kind of Nigerian rental
          </p>
        </Reveal>
      </div>
      <Marquee items={chips} speed={35} />
    </section>
  );
}

function Problem() {
  const pains = [
    {
      icon: AlertTriangle,
      title: 'Tenants send screenshots instead of paying',
      body: 'Fake Alert. You only find out later that the money never entered your account. By then the month is gone.',
    },
    {
      icon: Clock3,
      title: 'You forget who\'s due, who\'s behind',
      body: 'With ten tenants across three properties, rent dates blur. You end up calling around asking "did you pay?" every month.',
    },
    {
      icon: FileText,
      title: 'Receipts and ledgers by hand',
      body: 'Handwritten receipt books, WhatsApp screenshots, scattered notebooks — no clean history when a dispute comes up.',
    },
    {
      icon: BarChart3,
      title: 'No idea what your real collection rate is',
      body: 'Is this month a good month or bad? You don\'t actually know. You just feel it in your bank account.',
    },
  ];
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="Managing rent on paper and WhatsApp quietly costs you money"
      subtitle="It's not that you can't track rent. It's that calls, chats and notebooks can't show you what's really happening across your properties."
    >
      <Stagger step={100} from="up" className="grid gap-4 md:grid-cols-2">
        {pains.map((p) => (
          <HoverLift key={p.title}>
            <div className="card flex h-full gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-owed-50 text-owed-600">
                <p.icon size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-ink">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{p.body}</p>
              </div>
            </div>
          </HoverLift>
        ))}
      </Stagger>
    </Section>
  );
}

function FeatureGrid() {
  const features = [
    {
      icon: Building2,
      title: 'Every property, every tenant',
      body: 'Unlimited properties and tenants. Each has its own ledger — who lives there, what they pay, when rent is due.',
    },
    {
      icon: BarChart3,
      title: 'Rent tracker with collection-rate KPI',
      body: 'One page: expected collection, actual collection, outstanding — across every property you manage.',
    },
    {
      icon: MessageCircle,
      title: 'Auto WhatsApp rent reminders',
      body: 'Set an auto-reminder per tenant. CashTraka surfaces it when due — one tap opens WhatsApp with a polite prefilled reminder.',
    },
    {
      icon: Shield,
      title: 'Bank-alert rent verification',
      body: 'Paste your bank credit alert. If amount and sender match, rent is auto-confirmed, receipt generated, ledger updated. Fake alerts don\'t get past.',
    },
    {
      icon: Receipt,
      title: 'Auto receipts for every rent payment',
      body: 'Tenant gets a shareable receipt link and a downloadable PDF the moment their rent is confirmed.',
    },
    {
      icon: Users,
      title: 'Team, tasks & inspections',
      body: 'Add caretakers and agents. Assign inspection checklists, maintenance tasks. Everyone sees what\'s theirs to do.',
    },
    {
      icon: Home,
      title: 'Expenses & net profit per property',
      body: 'Log repairs, agency fees, service charge. See net profit per property — not just gross rent.',
    },
    {
      icon: FileText,
      title: 'CSV export, ledger history',
      body: 'Full rent payment history per tenant. Export anytime for your records or accountant.',
    },
  ];

  return (
    <Section
      id="features"
      tone="muted"
      eyebrow="What's inside"
      title="Everything you need to run rent like a real operation"
      subtitle="Whether you manage one flat or a portfolio of estates."
    >
      <Stagger step={80} from="up" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <HoverLift key={f.title}>
            <div className="card flex h-full flex-col p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-700">
                <f.icon size={20} />
              </div>
              <h3 className="font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.body}</p>
            </div>
          </HoverLift>
        ))}
      </Stagger>
    </Section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, title: 'Add properties + tenants', body: 'Each tenant lives in one flat with a rent cycle. Takes a minute.' },
    { n: 2, title: 'Set auto-reminders once', body: 'CashTraka nudges every tenant before due date via WhatsApp.' },
    { n: 3, title: 'Verify payments, issue receipts', body: 'Paste bank alert → confirmed → receipt sent → ledger updated.' },
  ];
  return (
    <Section eyebrow="How it works" title="Three steps. Same result every month.">
      <div className="relative grid gap-6 md:grid-cols-3 md:gap-8">
        <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-0.5 overflow-hidden bg-success-100 md:block">
          <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-success-500 to-transparent" />
        </div>
        <Stagger step={140} from="up" className="contents">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-600 text-lg font-black text-white shadow-md">
                <span className="absolute inset-0 rounded-full bg-success-600 opacity-40 blur-lg" />
                <span className="relative">{s.n}</span>
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.body}</p>
              </div>
            </div>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}

function Pricing() {
  return (
    <Section
      id="pricing"
      tone="muted"
      eyebrow="Pricing"
      title="Simple pricing that pays for itself"
      subtitle="One verified rent payment or one overdue tenant you catch saves you more than a year of CashTraka."
    >
      <Reveal>
        <div className="mx-auto max-w-3xl">
          <PricingCards />
        </div>
      </Reveal>
    </Section>
  );
}

function FAQ() {
  const items = [
    {
      q: 'How does CashTraka help me track rent across multiple properties?',
      a: "Each property has its own tenant roster and rent ledger. A single 'Rent Tracker' page shows expected collection, actual collection, and who's behind — across every property.",
    },
    {
      q: 'How do the rent reminders work?',
      a: 'Set an auto-reminder once per tenant. CashTraka surfaces it on your reminders page when it comes due. One tap opens WhatsApp with a prefilled polite reminder mentioning the property, amount and due date.',
    },
    {
      q: 'Can I verify rent payments against my bank?',
      a: "Yes. When a tenant says they paid, paste your bank credit alert into CashTraka. If amount and sender match, the rent is auto-confirmed, a receipt generates, and the tenant's ledger is updated.",
    },
    {
      q: "Do tenants need to install anything?",
      a: 'No. Tenants receive everything on WhatsApp — reminders, payment links, receipts — with no app, no account, no friction.',
    },
    {
      q: 'Can I add caretakers or agents to help manage?',
      a: 'Yes. Add your team, assign roles, assign inspection and maintenance tasks. Everyone sees what they need — nothing more.',
    },
  ];
  return (
    <Section id="faq" eyebrow="FAQ" title="Frequently asked questions">
      <div className="mx-auto max-w-2xl space-y-3">
        {items.map((it) => (
          <details key={it.q} className="card group overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left">
              <span className="font-semibold text-slate-900">{it.q}</span>
              <span className="text-slate-400 transition group-open:rotate-180">▾</span>
            </summary>
            <div className="border-t border-border px-5 py-4 text-sm text-slate-700">{it.a}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}

function FinalCTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-app">
        <Reveal from="zoom" distance={20} blur>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-success-700 via-success-600 to-brand-500 px-6 py-12 text-center text-white md:px-12 md:py-16">
            <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-slow-spin" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-brand-300/30 blur-3xl animate-slow-spin" style={{ animationDuration: '32s', animationDirection: 'reverse' }} />
            <div className="relative">
              <h2 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">
                Stop chasing. Start collecting on time.
              </h2>
              <p className="mt-3 text-lg text-white/90">Free to start. Landlord plan at ₦8,500/month.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/signup?type=property_manager" className="btn inline-flex bg-white text-success-700 shadow-lg hover:bg-success-50">
                  <span className="font-bold">Start free</span>
                </Link>
                <Link href="/login" className="btn inline-flex border border-white/40 bg-transparent text-white hover:bg-white/10">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
