import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Wallet,
  Clock3,
  MessageCircle,
  Users,
  AlertTriangle,
  Inbox,
  SearchX,
  RefreshCcw,
  Shield,
  Sparkles,
  FileText,
  Package,
  Receipt,
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
  title: 'CashTraka for Business — Track sales, debts & customers',
  description:
    'Built for Nigerian small businesses: shops, food vendors, services, tailors. Verify payments with your bank alert, issue invoices & receipts, chase debts on WhatsApp.',
};

export default function ForBusinessPage() {
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
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white py-14 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-0 h-80 w-[45rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div className="container-app relative z-10 grid items-center gap-10 md:grid-cols-2 md:gap-12">
        <Reveal from="up">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            CashTraka for Business
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
            Every sale tracked. Every debt chased. Every receipt sent.
          </h1>
          <p className="mt-4 text-lg text-slate-600 md:text-xl">
            Built for small businesses in Nigeria — shops, food vendors, tailors,
            salons, services. Log sales in seconds, verify transfers with your
            bank alert, issue professional invoices, and chase debt on WhatsApp.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup?type=seller" className="btn-primary">
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
    'Beauty sellers',
    'Fashion stores',
    'Resellers',
    'Skincare brands',
    'Food vendors',
    'Thrift shops',
    'Perfume sellers',
    'Tailors',
    'Delivery services',
    'Phone repair shops',
    'Small business owners',
  ].map((c) => (
    <span
      key={c}
      className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
    >
      {c}
    </span>
  ));
  return (
    <section className="border-y border-border bg-slate-50 py-8">
      <div className="container-app mb-4">
        <Reveal from="zoom" distance={10}>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            Trusted by Nigerian businesses selling every day
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
      title: '"I have paid" screenshots that aren\'t real',
      body: 'You deliver the goods, then the bank alert never comes. Fake screenshots have cost Nigerian sellers millions.',
    },
    {
      icon: Inbox,
      title: 'Orders buried in 200 WhatsApp chats',
      body: 'By 3pm today you\'ve already forgotten what yesterday\'s customer ordered. Stuff slips. Money slips.',
    },
    {
      icon: Clock3,
      title: '"I\'ll pay tomorrow" — for three weeks',
      body: 'Small debts pile up because you forget to follow up. You carry the loss, not them.',
    },
    {
      icon: SearchX,
      title: 'Repeat customers quietly leave',
      body: 'You never reached back out. They found someone who did.',
    },
  ];
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="Running a small business on WhatsApp alone leaks money"
      subtitle="It's not that you don't work hard. It's that messages, screenshots, and scattered notes can't tell you what's really happening in your business."
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
      icon: Shield,
      title: 'Bank-alert verification',
      body: 'Paste your real bank SMS or email. CashTraka reads the amount, sender and reference from YOUR bank — not a screenshot. Fake receipts don\'t pass.',
    },
    {
      icon: FileText,
      title: 'Invoices & receipts',
      body: 'Create a professional invoice on WhatsApp in 20 seconds. Every payment auto-generates a shareable receipt and downloadable PDF.',
    },
    {
      icon: Wallet,
      title: 'Track every sale',
      body: 'Cash or transfer, paid or pending — logged in seconds. Totals update live. Filter by what you\'re still waiting on.',
    },
    {
      icon: Clock3,
      title: 'Debt tracker with WhatsApp chase',
      body: 'One list of everyone who owes you, with a one-tap prefilled WhatsApp reminder next to every name.',
    },
    {
      icon: Package,
      title: 'Product catalog + live inventory',
      body: 'Add your products once. Stock updates automatically on every sale. Low-stock alerts before you run out.',
    },
    {
      icon: Users,
      title: 'Staff, attendance & payroll',
      body: 'Add your team with their pay type (salary, daily, per-task). Mark attendance, log advances, and CashTraka tracks what you still owe each staff.',
    },
    {
      icon: Receipt,
      title: 'Expenses & real profit',
      body: 'Log business and personal expenses separately. See real monthly profit — not just revenue.',
    },
    {
      icon: RefreshCcw,
      title: 'Re-engage quiet customers',
      body: 'One tap to restart a conversation with someone who hasn\'t bought in a while. Your customer list builds itself.',
    },
  ];

  return (
    <Section
      id="features"
      tone="muted"
      eyebrow="What's inside"
      title="The full operating system for a Nigerian small business"
      subtitle="Built mobile-first, in plain Naira, for the way you actually work."
    >
      <Stagger step={80} from="up" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <HoverLift key={f.title}>
            <div className="card flex h-full flex-col p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
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
    { n: 1, title: 'Log a sale or debt', body: 'Takes under 10 seconds. Customer saved automatically.' },
    { n: 2, title: 'Verify with your bank alert', body: 'Paste the SMS. CashTraka confirms. No more fake screenshots.' },
    { n: 3, title: 'Send receipts, chase debts', body: 'Auto-generated receipts. One-tap WhatsApp reminders.' },
  ];
  return (
    <Section eyebrow="How it works" title="Simple. Fast. Works from day one.">
      <div className="relative grid gap-6 md:grid-cols-3 md:gap-8">
        <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-0.5 overflow-hidden bg-brand-100 md:block">
          <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
        </div>
        <Stagger step={140} from="up" className="contents">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="group/step relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-lg font-black text-white shadow-md">
                <span className="absolute inset-0 rounded-full bg-brand-500 opacity-40 blur-lg" />
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
      subtitle="If CashTraka helps you stop one fake-screenshot fraud or recover one forgotten debt, it has already paid for itself."
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
      q: 'How does bank-alert verification actually work?',
      a: 'When a customer claims they paid, you paste your real bank SMS or email into CashTraka. The system reads the amount, sender and reference from YOUR bank — not a screenshot. Fakes cannot pass.',
    },
    {
      q: 'Do I need to change how I sell on WhatsApp?',
      a: 'No. Keep selling exactly how you do today. CashTraka sits on top of your workflow to give you structure, receipts, and records.',
    },
    {
      q: 'Does this work on my phone?',
      a: 'Yes. Built mobile-first. Works on any Android or iPhone in your browser — no app store install needed.',
    },
    {
      q: 'Can my staff use it too?',
      a: 'Yes. Add your team, assign roles (cashier, manager, viewer), mark attendance and track salary and advances. Staff get a limited view of only what they need.',
    },
    {
      q: 'Can I export my data?',
      a: 'Yes. Payments, debts, customers, expenses — all exportable to CSV with one tap.',
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-success-500 px-6 py-12 text-center text-white md:px-12 md:py-16">
            <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-slow-spin" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-success-300/30 blur-3xl animate-slow-spin" style={{ animationDuration: '32s', animationDirection: 'reverse' }} />
            <div className="relative">
              <h2 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">
                You already have the customers. Now stop losing money from them.
              </h2>
              <p className="mt-3 text-lg text-white/90">Free to start. Paid plans start at ₦4,500/month.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/signup?type=seller" className="btn inline-flex bg-white text-brand-700 shadow-lg hover:bg-brand-50">
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
