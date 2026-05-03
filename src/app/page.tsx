import Link from 'next/link';
import {
  Banknote,
  Clock3,
  MessageCircle,
  Users,
  AlertTriangle,
  Inbox,
  SearchX,
  RefreshCcw,
  Shield,
  Sparkles,
  PhoneCall,
  Check,
  CreditCard,
  HandCoins,
  Repeat,
  ListChecks,
  Receipt,
  BarChart3,
  ArrowRight,
  Star,
  BadgeCheck,
  Smartphone,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Section } from '@/components/marketing/Section';
import { PricingCards } from '@/components/marketing/PricingCards';
import { FAQ } from '@/components/marketing/FAQ';
import { HeroMockup } from '@/components/marketing/HeroMockup';
import { HeroSolutions } from '@/components/marketing/HeroSolutions';
import { SolutionsPath } from '@/components/marketing/SolutionsPath';
import { Reveal } from '@/components/marketing/Reveal';
import { Stagger } from '@/components/marketing/Stagger';
import { AnimatedStat } from '@/components/marketing/AnimatedStat';
import { HoverLift } from '@/components/marketing/HoverLift';
import { ScrollProgress } from '@/components/marketing/ScrollProgress';
import { Marquee } from '@/components/marketing/Marquee';
import { FeatureCarousel } from '@/components/marketing/FeatureCarousel';
import { FeatureDeepDive } from '@/components/marketing/FeatureDeepDive';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <ScrollProgress />
      <Navbar />
      <main>
        {/* Trust + storytelling base, the register that fits Nigerian SMB
            buyers. Light, bright, scannable. */}
        <HeroSolutions />
        <SolutionsPath />
        <AudienceMarquee />
        <Problem />
        <Solution />

        {/* Single dark "feature spotlight" interlude. Stripe / Apple
            alternation pattern. One strong dark moment makes the rest
            of the page feel deliberate. */}
        <FeatureSpotlightDark />

        <HowItWorks />

        {/* Replaces the old flat testimonial row with the animated bento
            grid, ported to the light theme. */}
        <BentoTestimonialsLight />

        <ValueSection />
        <Objections />
        <Pricing />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* =============================== 1. HERO ================================ */

function HeroDark() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft brand glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 h-[520px] w-[520px] rounded-full bg-brand-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-20 h-[600px] w-[600px] rounded-full bg-indigo-500/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-slate-950"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 md:grid-cols-2 md:py-32 lg:gap-16 lg:py-40">
        {/* Left: copy */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
            <Sparkles size={12} />
            Built for Nigerian businesses
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
            Send invoices, take payments, chase debts in one place.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300 md:text-xl">
            Send a proper invoice on WhatsApp, take payment via Paystack, and let CashTraka handle the receipt, the follow-up, and the FIRS paperwork.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
            >
              Start free
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:text-white"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate-400">
            Set up in under 5 minutes. No card required.
          </p>
        </div>

        {/* Right: floating cards */}
        <div className="relative z-10 mx-auto h-[460px] w-full max-w-md md:h-[520px]">
          {/* Background brand glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-[3rem] bg-brand-500/30 blur-3xl"
          />

          {/* Rating pill */}
          <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-900">
                <BadgeCheck size={16} />
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-white">
                <Star size={12} className="fill-owed-300 text-owed-300" />
                4.9
              </span>
              <span className="text-xs text-white/70">·</span>
              <span className="text-xs font-medium text-white/80">
                Trusted by Nigerian businesses
              </span>
            </div>
          </div>

          {/* Card B (back, receipt) */}
          <div
            className="absolute right-2 top-24 z-10 w-[78%] rounded-2xl bg-gradient-to-br from-amber-200 to-amber-500 p-5 shadow-2xl shadow-amber-900/30 ring-1 ring-amber-100/40 transition-transform"
            style={{ transform: 'rotate(6deg)', aspectRatio: '1.6 / 1' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-900/80">
                Receipt
              </span>
              <span className="text-[10px] font-semibold text-amber-900/70">
                15 Apr 2026
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-amber-950">
                <span>Hair extension · 14&quot;</span>
                <span>₦ 18,000</span>
              </div>
              <div className="flex justify-between text-[11px] font-medium text-amber-950">
                <span>Frontal lace</span>
                <span>₦ 22,500</span>
              </div>
              <div className="flex justify-between text-[11px] font-medium text-amber-950">
                <span>Styling fee</span>
                <span>₦ 5,000</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-amber-900/20 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80">
                Total
              </span>
              <span className="text-base font-black text-amber-950">
                ₦ 45,500
              </span>
            </div>
          </div>

          {/* Card A (front, invoice) */}
          <div
            className="absolute left-2 top-44 z-20 w-[80%] rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 p-6 shadow-2xl shadow-brand-900/40 ring-1 ring-brand-300/40 transition-transform"
            style={{ transform: 'rotate(-8deg)', aspectRatio: '1.6 / 1' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                Invoice · INV-0142
              </span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-white">
                CashTraka
              </span>
            </div>
            <div className="mt-4 text-[11px] font-medium text-white/70">
              Billed to
            </div>
            <div className="mt-0.5 text-sm font-semibold text-white">
              Amaka Nwosu
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Total due
                </div>
                <div className="mt-0.5 text-2xl font-black tracking-tight text-white md:text-3xl">
                  ₦ 248,500
                </div>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brand-700">
                Paid
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================== 2. AUDIENCE MARQUEE ========================= */

function AudienceMarqueeDark() {
  const chips = [
    'Beauty sellers',
    'Fashion brands',
    'Phone accessory shops',
    'Skincare brands',
    'Food vendors',
    'Thrift stores',
    'Perfume sellers',
    'Landlords',
    'Property managers',
    'Hair & wig sellers',
    'Tailors & designers',
    'Electronics resellers',
  ];
  const items = chips.map((c, i) => (
    <span
      key={`${c}-${i}`}
      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-brand-400/40 hover:text-white"
    >
      {c}
    </span>
  ));
  return (
    <section className="border-y border-white/5 bg-slate-950 py-10">
      <div className="mx-auto mb-5 max-w-6xl px-5">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Used by Nigerian businesses every day
        </p>
      </div>
      <Marquee items={items} speed={35} />
    </section>
  );
}

/* ====================== 3. TWO BIG FEATURE CARDS ========================= */

function FeatureCardsBig() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl space-y-4 px-5">
        {/* Card 1: phone left, copy right */}
        <article className="grid overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-sm md:grid-cols-2">
          <div className="relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-brand-900/40 p-8 md:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,184,232,0.15),transparent_60%)]"
            />
            <PhoneInvoiceMock />
          </div>
          <div className="flex flex-col justify-center p-8 md:p-12">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-400">
              Invoices &amp; payments
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
              One link your customer pays in seconds.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300 md:text-lg">
              Build an invoice with line items, tax, and your logo. Share it on WhatsApp. The customer opens the public pay link, pays via Paystack, and the invoice marks itself as paid. The receipt sends itself.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Check size={12} className="text-brand-400" />
                Public pay link, no signup for your customer
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Check size={12} className="text-brand-400" />
                Auto receipt by email and WhatsApp
              </span>
            </div>
            <div className="mt-7">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Send your first invoice
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </article>

        {/* Card 2: copy left, dashboard right */}
        <article className="grid overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-sm md:grid-cols-2">
          <div className="order-2 flex flex-col justify-center p-8 md:order-1 md:p-12">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-400">
              Tax &amp; compliance
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
              Tax invoices that meet FIRS rules.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300 md:text-lg">
              TIN, buyer details, item codes, and the right tax breakdown. CashTraka prints the IRN and a QR code on the receipt and gives you the XML to download when FIRS asks. Six years of document archive included.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Check size={12} className="text-brand-400" />
                IRN and QR on every receipt
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Check size={12} className="text-brand-400" />
                XML download for FIRS submission
              </span>
            </div>
            <div className="mt-7">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Set up tax invoices
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="relative order-1 flex items-center justify-center bg-gradient-to-bl from-slate-900 via-slate-900 to-brand-900/40 p-8 md:order-2 md:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,184,232,0.15),transparent_60%)]"
            />
            <FirsDashboardMock />
          </div>
        </article>
      </div>
    </section>
  );
}

function PhoneInvoiceMock() {
  return (
    <div
      className="relative aspect-[9/19] w-full max-w-[260px] overflow-hidden rounded-[2.5rem] bg-slate-800 p-4 ring-8 ring-slate-900"
      style={{ transform: 'rotate(-3deg)' }}
    >
      <div className="flex h-full flex-col rounded-[1.75rem] bg-slate-950 p-4">
        <div className="flex items-center justify-between text-[9px] font-medium text-slate-500">
          <span>9:41</span>
          <span>CashTraka</span>
        </div>
        <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          This month
        </div>
        <div className="mt-1 text-2xl font-black tracking-tight text-white">
          ₦ 12,975
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-brand-500 to-brand-300" />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-slate-500">
          <span>Collected</span>
          <span className="text-brand-400">68%</span>
        </div>

        <div className="mt-5 space-y-2">
          <div className="rounded-lg border border-white/5 bg-slate-900/80 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white">
                Amaka N.
              </span>
              <span className="rounded-full bg-success-500/20 px-1.5 py-0.5 text-[8px] font-bold text-success-400">
                PAID
              </span>
            </div>
            <div className="mt-0.5 text-[9px] text-slate-500">
              INV-0142 · ₦ 8,500
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/80 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white">
                Chidi O.
              </span>
              <span className="rounded-full bg-success-500/20 px-1.5 py-0.5 text-[8px] font-bold text-success-400">
                PAID
              </span>
            </div>
            <div className="mt-0.5 text-[9px] text-slate-500">
              INV-0141 · ₦ 12,000
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/80 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white">
                Tolu B.
              </span>
              <span className="rounded-full bg-owed-500/20 px-1.5 py-0.5 text-[8px] font-bold text-owed-400">
                DUE
              </span>
            </div>
            <div className="mt-0.5 text-[9px] text-slate-500">
              INV-0140 · ₦ 3,000
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-brand-500/10 py-2 text-[9px] font-bold text-brand-300">
          <MessageCircle size={10} />
          Send reminder via WhatsApp
        </div>
      </div>
    </div>
  );
}

function FirsDashboardMock() {
  return (
    <div className="relative w-full max-w-[320px]">
      {/* Back card */}
      <div
        className="absolute right-2 top-2 w-[85%] rounded-2xl bg-slate-800/80 p-4 ring-1 ring-white/10"
        style={{ transform: 'rotate(4deg)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
          FIRS · Last submission
        </div>
        <div className="mt-2 text-base font-black text-white">
          ₦ 1.4M
        </div>
        <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-success-400">
          <Check size={10} />
          Accepted · 02 Apr 2026
        </div>
      </div>
      {/* Front card */}
      <div
        className="relative w-full rounded-2xl bg-slate-900 p-5 shadow-xl ring-1 ring-white/10"
        style={{ transform: 'rotate(-2deg) translateY(36px)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Tax invoice
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              TIN · 21945601-0001
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
            <div className="grid h-7 w-7 grid-cols-3 grid-rows-3 gap-px">
              {Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    'rounded-[1px] ' +
                    ([0, 2, 3, 5, 6, 8].includes(i) ? 'bg-white' : 'bg-white/30')
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[10px] text-slate-300">
            <span>Sub-total</span>
            <span>₦ 230,000</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-300">
            <span>VAT 7.5%</span>
            <span>₦ 17,250</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-1.5 text-[11px] font-bold text-white">
            <span>Total</span>
            <span>₦ 247,250</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-brand-500/10 px-2.5 py-2 text-[10px] font-semibold text-brand-300">
          <span className="flex items-center gap-1">
            <Shield size={10} />
            IRN attached
          </span>
          <span>XML ready</span>
        </div>
      </div>
    </div>
  );
}

/* ====================== 4. EXPLORE FEATURES =============================== */

function ExploreFeatures() {
  const cards = [
    {
      label: 'Invoice engine',
      headline: 'Invoices.',
      body: 'Build a proper invoice with line items, tax, and your logo. Share on WhatsApp. The customer pays via Paystack and the invoice marks itself as paid.',
      mock: <ExploreInvoiceMock />,
    },
    {
      label: 'Receipts',
      headline: 'Receipts.',
      body: 'The receipt sends itself the moment money lands. PDF, email, and WhatsApp. With FIRS IRN and QR code printed where they need to be.',
      mock: <ExploreReceiptMock />,
    },
    {
      label: 'Recurring billing',
      headline: 'Recurring billing.',
      body: 'Set the schedule once. CashTraka issues the invoice every month, sends it on WhatsApp, and tracks each cycle. You confirm the money came in.',
      mock: <ExploreRecurringMock />,
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-400">
            Explore all features
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
            Everything you need to get paid.
          </h2>
          <p className="mt-4 text-base text-slate-400 md:text-lg">
            Make an invoice. Take the payment. Send the receipt. Chase the debt. Set up the next one to run on autopilot.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="flex flex-col rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 p-6 ring-1 ring-white/10 transition hover:ring-white/20 md:p-8"
            >
              <div className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-2xl bg-slate-900/60 ring-1 ring-white/5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,184,232,0.18),transparent_70%)]"
                />
                {c.mock}
              </div>
              <div className="mt-6 flex-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">
                  {c.label}
                </span>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                  {c.headline}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {c.body}
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Try it free
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExploreInvoiceMock() {
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute left-6 top-6 w-44 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 p-3 shadow-2xl"
        style={{ transform: 'rotate(-6deg)' }}
      >
        <div className="text-[8px] font-bold uppercase tracking-wider text-white/80">
          Invoice
        </div>
        <div className="mt-2 text-xs font-semibold text-white">Amaka N.</div>
        <div className="mt-3 text-base font-black text-white">₦ 248,500</div>
        <div className="mt-2 inline-flex rounded-full bg-brand-50 px-1.5 py-0.5 text-[8px] font-bold text-brand-700">
          PAID
        </div>
      </div>
      <div
        className="absolute bottom-6 right-6 w-40 rounded-xl bg-slate-800 p-3 shadow-2xl ring-1 ring-white/10"
        style={{ transform: 'rotate(8deg)' }}
      >
        <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
          Pay link
        </div>
        <div className="mt-2 truncate text-[10px] font-medium text-brand-300">
          paystack.cashtraka.com/i/0142
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-slate-700">
          <div className="h-full w-3/4 rounded-full bg-brand-500" />
        </div>
      </div>
    </div>
  );
}

function ExploreReceiptMock() {
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute left-1/2 top-4 w-40 -translate-x-1/2 rounded-xl bg-white p-3 shadow-2xl"
        style={{ transform: 'translateX(-50%) rotate(-4deg)' }}
      >
        <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
          Receipt
        </div>
        <div className="mt-1.5 space-y-0.5">
          <div className="flex justify-between text-[8px] text-slate-700">
            <span>Item</span>
            <span>₦ 8,500</span>
          </div>
          <div className="flex justify-between text-[8px] text-slate-700">
            <span>VAT</span>
            <span>₦ 638</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-0.5 text-[9px] font-bold text-slate-900">
            <span>Total</span>
            <span>₦ 9,138</span>
          </div>
        </div>
        <div className="mt-2 grid h-8 w-8 grid-cols-3 grid-rows-3 gap-px">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className={
                'rounded-[1px] ' +
                ([0, 2, 3, 5, 6, 8].includes(i) ? 'bg-slate-900' : 'bg-slate-300')
              }
            />
          ))}
        </div>
      </div>
      <div
        className="absolute bottom-6 left-6 right-6 rounded-xl bg-success-500/15 p-2.5 ring-1 ring-success-500/30"
        style={{ transform: 'rotate(2deg)' }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-500 text-white">
            <Check size={12} strokeWidth={3} />
          </span>
          <div>
            <div className="text-[10px] font-bold text-success-300">
              Sent on WhatsApp
            </div>
            <div className="text-[8px] text-slate-400">
              Just now · Amaka Nwosu
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExploreRecurringMock() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-6 top-6 rounded-xl bg-slate-800 p-3 shadow-xl ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Monthly retainer
          </span>
          <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[8px] font-bold text-brand-300">
            ACTIVE
          </span>
        </div>
        <div className="mt-2 text-sm font-black text-white">₦ 75,000 / mo</div>
        <div className="mt-2 grid grid-cols-6 gap-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={
                'h-1.5 rounded-full ' +
                (i <= 4 ? 'bg-brand-500' : 'bg-slate-700')
              }
            />
          ))}
        </div>
        <div className="mt-1 text-[8px] text-slate-500">
          4 of 12 cycles billed
        </div>
      </div>
      <div
        className="absolute bottom-6 left-6 flex w-32 items-center gap-2 rounded-xl bg-slate-900 p-2.5 ring-1 ring-white/10"
        style={{ transform: 'rotate(-4deg)' }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/20 text-brand-300">
          <Repeat size={14} />
        </span>
        <div>
          <div className="text-[9px] font-semibold text-white">
            Next: 1 May
          </div>
          <div className="text-[7px] text-slate-500">Auto-send</div>
        </div>
      </div>
      <div
        className="absolute bottom-10 right-6 flex w-32 items-center gap-2 rounded-xl bg-success-500/10 p-2.5 ring-1 ring-success-500/30"
        style={{ transform: 'rotate(5deg)' }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-success-500/20 text-success-300">
          <Check size={14} strokeWidth={3} />
        </span>
        <div>
          <div className="text-[9px] font-semibold text-white">Apr · Paid</div>
          <div className="text-[7px] text-slate-400">2h ago</div>
        </div>
      </div>
    </div>
  );
}

/* ====================== 5. BENTO TESTIMONIALS ============================ */

type BentoCell =
  | { kind: 'quote'; span?: 1 | 2; quote: string; who: string }
  | { kind: 'logo'; span?: 1 | 2; label: string };

const BENTO: BentoCell[] = [
  {
    kind: 'quote',
    span: 2,
    quote:
      'Customers used to ask for receipts weeks later. Now I just send a WhatsApp link and the receipt is done.',
    who: 'Tope A · Boutique owner, Lagos',
  },
  { kind: 'logo', label: 'AYO STORES' },
  {
    kind: 'quote',
    quote:
      'We sent the same monthly invoice to 14 clients by hand. Now it runs on its own.',
    who: 'Ifeoma O · Cleaning service',
  },
  {
    kind: 'quote',
    quote:
      'I see who paid in real time on the dashboard. The end of month stress is gone.',
    who: 'Bashir M · Phone accessory shop, Kano',
  },
  { kind: 'logo', label: 'LAGOS THREADS' },
  {
    kind: 'quote',
    span: 2,
    quote:
      "Bank alert verification means I don't have to refresh Paystack every five minutes. Paste the SMS, and the payment is logged.",
    who: 'Chiamaka N · Skincare brand',
  },
  {
    kind: 'quote',
    quote:
      'Setup took us one afternoon. By the next morning we had received our first online payment.',
    who: 'Femi A · Tailor, Ibadan',
  },
  {
    kind: 'quote',
    quote:
      'Switching from a paper book to CashTraka saved my accountant a full week.',
    who: 'Kelechi U · Landlord, Abuja',
  },
  { kind: 'logo', label: 'NAIJA MART' },
  {
    kind: 'quote',
    span: 2,
    quote:
      'Rent reminders go out on their own. Tenants pay through the link. I do not chase anyone in a group chat anymore.',
    who: 'Mrs Adeniyi · Property manager, Lekki',
  },
];

function BentoCard({ cell }: { cell: BentoCell }) {
  const span = cell.span === 2 ? 'md:col-span-2' : '';
  const base =
    'group relative overflow-hidden rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 ' +
    'backdrop-blur-sm transition-[transform,box-shadow,background-color] duration-300 ease-out ' +
    'hover:-translate-y-1 hover:bg-white/[0.07] hover:ring-brand-400/40 ' +
    'hover:shadow-[0_18px_40px_-12px_rgba(0,184,232,0.35)] md:p-6';
  if (cell.kind === 'logo') {
    return (
      <div className={base + ' flex items-center justify-center ' + span}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-inset ring-brand-400/30 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span className="text-2xl font-black tracking-[0.2em] text-white/30 transition-colors duration-300 group-hover:text-white/55 md:text-3xl">
          {cell.label}
        </span>
      </div>
    );
  }
  return (
    <div className={base + ' ' + span}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/0 blur-2xl transition duration-500 group-hover:bg-brand-500/25"
      />
      <p
        className={
          (cell.span === 2 ? 'text-base md:text-lg ' : 'text-sm md:text-base ') +
          'relative leading-relaxed text-white'
        }
      >
        {cell.quote}
      </p>
      <p className="relative mt-4 text-xs text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
        {cell.who}
      </p>
    </div>
  );
}

function BentoTestimonials() {
  return (
    <section className="relative py-24">
      {/* Soft brand glow drifting behind the grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal from="up">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-400">
              From real businesses
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
              Built for Nigerian businesses.
            </h2>
            <p className="mt-4 text-base text-slate-400 md:text-lg">
              Tested by sellers, landlords, and service operators.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {BENTO.map((cell, i) => (
            <Reveal key={i} from="up" delay={80 + i * 60} duration={650}>
              <BentoCard cell={cell} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ====================== 6. PRICING (DARK WRAPPER) ======================== */

function PricingDark() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-400">
            Pricing
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
            Free to start. Upgrade when you need it.
          </h2>
          <p className="mt-4 text-base text-slate-400 md:text-lg">
            The free plan covers the basics. Switch to Starter for invoices, FIRS, recurring billing, and the rest.
          </p>
        </div>
        <div className="mt-12 rounded-3xl bg-white/95 p-6 ring-1 ring-white/10 md:p-10">
          <PricingCards />
        </div>
        <p className="mt-8 text-center text-sm text-slate-400">
          See the full breakdown on the{' '}
          <Link
            href="/pricing"
            className="font-semibold text-brand-400 underline underline-offset-2 hover:text-brand-300"
          >
            pricing page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

/* ====================== 7. FAQ (LIGHT WRAPPER) =========================== */

function FAQDark() {
  return (
    <section id="faq" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">
            FAQ
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-ink md:text-4xl lg:text-5xl">
            Questions people ask before they sign up
          </h2>
        </div>
        <div className="mt-12">
          <FAQ />
        </div>
      </div>
    </section>
  );
}

/* ====================== 8. FINAL CTA ===================================== */

function FinalCTADark() {
  return (
    <section className="relative overflow-hidden py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
          Ready to get paid faster?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base text-slate-300 md:text-lg">
          Free to start. Five minutes to set up. Your first invoice goes out today.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            Start free
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:text-white"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-5 text-sm text-slate-500">
          No card. No trial expiry on the free plan.
        </p>
      </div>
    </section>
  );
}

/* ============== HYBRID ADDITIONS: dark interlude + light bento =========== */

/**
 * Dark feature spotlight. Sits between Solution and HowItWorks on the
 * light page as a single high-contrast moment. Self-contained: brings
 * its own slate background and brand glows so the surrounding light
 * sections are unaffected.
 */
function FeatureSpotlightDark() {
  return (
    <section className="relative overflow-hidden bg-[#0a1730] py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-brand-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-indigo-500/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal from="up">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-300">
              Built for the way you actually work
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
              Less admin, more time on the shop floor.
            </h2>
            <p className="mt-4 text-base text-slate-300 md:text-lg">
              Two things you do every week, taken off your hands.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-6">
          <Reveal from="up" delay={80}>
            <article className="group relative h-full overflow-hidden rounded-3xl bg-white/[0.04] p-7 ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/[0.07] hover:ring-brand-400/40 md:p-9">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand-500/0 blur-3xl transition duration-500 group-hover:bg-brand-500/30"
              />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                Invoices &amp; payments
              </span>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">
                One link your customer pays in seconds.
              </h3>
              <p className="mt-3 text-sm text-slate-300 md:text-base">
                Make the invoice, send it on WhatsApp, the customer pays via
                Paystack. The receipt sends itself. The dashboard shows the
                payment in real time.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-200">
                <li className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-300" />
                  Public pay link, no login for the customer
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-300" />
                  Bank alert verification when they pay by transfer
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-300" />
                  Automatic receipt with your business header
                </li>
              </ul>
            </article>
          </Reveal>

          <Reveal from="up" delay={160}>
            <article className="group relative h-full overflow-hidden rounded-3xl bg-white/[0.04] p-7 ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/[0.07] hover:ring-brand-400/40 md:p-9">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-indigo-500/0 blur-3xl transition duration-500 group-hover:bg-indigo-500/30"
              />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                Tax &amp; compliance
              </span>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">
                Tax invoices that match FIRS rules.
              </h3>
              <p className="mt-3 text-sm text-slate-300 md:text-base">
                TIN, buyer details, VAT line, and HS codes already in the
                template. When FIRS e-invoicing turns on, the data is in the
                right shape and the IRN prints on the PDF.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-200">
                <li className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-300" />
                  TIN and buyer fields built in
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-300" />
                  VAT 7.5% applied or exempt per line
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-300" />
                  Six-year archive that meets retention rules
                </li>
              </ul>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/**
 * Light-theme version of the bento testimonials. Keeps the staggered
 * scroll-reveal + hover lift + brand-cyan glow from the dark version,
 * but on a white surface so it sits naturally between Solution-style
 * sections on the light page.
 */
function BentoTestimonialsLight() {
  return (
    <section className="relative overflow-hidden bg-white py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-100/60 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal from="up">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">
              From real businesses
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl lg:text-5xl">
              Built for Nigerian businesses.
            </h2>
            <p className="mt-4 text-base text-slate-600 md:text-lg">
              Tested by sellers, landlords, and service operators.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {BENTO.map((cell, i) => (
            <Reveal key={i} from="up" delay={80 + i * 60} duration={650}>
              <BentoCardLight cell={cell} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoCardLight({ cell }: { cell: BentoCell }) {
  const span = cell.span === 2 ? 'md:col-span-2' : '';
  const base =
    'group relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-slate-200 ' +
    'transition-[transform,box-shadow,border-color] duration-300 ease-out ' +
    'hover:-translate-y-1 hover:ring-brand-300 ' +
    'hover:shadow-[0_18px_38px_-12px_rgba(0,184,232,0.35)] md:p-6';
  if (cell.kind === 'logo') {
    return (
      <div className={base + ' flex items-center justify-center ' + span}>
        <span className="text-2xl font-black tracking-[0.2em] text-slate-300 transition-colors duration-300 group-hover:text-brand-500/70 md:text-3xl">
          {cell.label}
        </span>
      </div>
    );
  }
  return (
    <div className={base + ' ' + span}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-100/0 blur-2xl transition duration-500 group-hover:bg-brand-200/70"
      />
      <p
        className={
          (cell.span === 2 ? 'text-base md:text-lg ' : 'text-sm md:text-base ') +
          'relative leading-relaxed text-ink'
        }
      >
        {cell.quote}
      </p>
      <p className="relative mt-4 text-xs text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
        {cell.who}
      </p>
    </div>
  );
}

/* ===== Legacy section helpers (kept defined, no longer rendered) ========= */

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
            Invoices, payments and debts in one place
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
            Send invoices, take payments, and chase debts in one place
          </h1>
          <p className="mt-4 text-lg text-slate-600 md:text-xl">
            Built for Nigerian businesses. Send a proper invoice on WhatsApp,
            take payment via Paystack, and let CashTraka handle the receipt,
            the follow-up, and the FIRS paperwork.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">Start free</Link>
            <a href="#solutions" className="btn-secondary">See how it works</a>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Set up in under 5 minutes. No card required.
          </p>
        </Reveal>
        <Reveal from="right" delay={150} className="order-first md:order-last">
          <HeroMockup />
        </Reveal>
      </div>
    </section>
  );
}

function AudienceMarquee() {
  const chips = [
    'Beauty sellers',
    'Fashion brands',
    'Phone accessory shops',
    'Skincare brands',
    'Food vendors',
    'Thrift stores',
    'Perfume sellers',
    'Landlords',
    'Property managers',
    'Hair & wig sellers',
    'Tailors & designers',
    'Electronics resellers',
  ];
  const items = chips.map((c, i) => (
    <span
      key={`${c}-${i}`}
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
            Used by Nigerian businesses every day
          </p>
        </Reveal>
      </div>
      <Marquee items={items} speed={35} />
    </section>
  );
}

function SocialProof() {
  const cards = [
    {
      label: 'Average seller recovers',
      number: (
        <AnimatedStat
          prefix="₦"
          value={150_000}
          suffix="+"
          className="text-brand-600"
        />
      ),
      body: 'in old debts within the first 30 days of using CashTraka.',
      accent: 'brand',
    },
    {
      label: 'Setup time',
      number: (
        <AnimatedStat value={5} suffix=" min" className="text-success-700" />
      ),
      body: 'from signup to your first invoice or recorded payment.',
      accent: 'success',
    },
    {
      label: 'Collection rate',
      number: <AnimatedStat value={82} suffix="%" className="text-brand-600" />,
      body: 'of money owed comes in vs 54% on a notebook or spreadsheet.',
      accent: 'brand',
    },
  ] as const;

  return (
    <section className="py-14 md:py-20">
      <div className="container-app">
        <Reveal from="up" blur>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-brand-600">
            Real businesses. Real money in the account.
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-2xl font-black tracking-tight text-ink md:text-3xl">
            Built to put money in your account
          </h2>
        </Reveal>
        <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <Stagger step={110} from="up" className="contents">
            {cards.map((c, i) => (
              <li
                key={c.label}
                className={
                  'group relative flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-white p-5 text-center shadow-xs transition hover:-translate-y-1 hover:shadow-md md:p-6' +
                  (i === 0 ? ' sm:col-span-2 lg:col-span-1' : '')
                }
              >
                <span
                  aria-hidden
                  className={
                    'pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition group-hover:opacity-100 ' +
                    (c.accent === 'brand'
                      ? 'bg-gradient-to-br from-brand-500/0 via-brand-500/5 to-brand-500/0'
                      : 'bg-gradient-to-br from-success-500/0 via-success-500/10 to-success-500/0')
                  }
                />
                <span className="relative text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {c.label}
                </span>
                <span
                  className="relative mt-3 block text-3xl font-black leading-none tracking-tight md:text-4xl"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {c.number}
                </span>
                <p className="relative mt-3 max-w-[22ch] text-xs leading-relaxed text-slate-600">
                  {c.body}
                </p>
              </li>
            ))}
          </Stagger>
        </ul>
      </div>
    </section>
  );
}

function Problem() {
  const pains = [
    {
      icon: Receipt,
      title: 'Receipts on receipt paper that fade in two months',
      body: 'Your customer comes back asking for proof of payment. The thermal print is now a blank strip. You apologise and write a new one by hand.',
    },
    {
      icon: Inbox,
      title: '"Boss, can you send me a proper invoice?"',
      body: 'A WhatsApp message with the amount is not enough for a corporate client. They want a TIN, a buyer address, line items, the full thing.',
    },
    {
      icon: Clock3,
      title: 'You forgot to chase Chidi. Again.',
      body: 'He owes ₦80,000 from last month. He went quiet. Your reminder is sitting in your head, not on a list, and you only remember at 2am.',
    },
    {
      icon: RefreshCcw,
      title: 'Same monthly invoice, retyped from scratch',
      body: 'Your retainer client. Same line items every month. You open Word, copy last month, change the date, save as PDF, send. Every. Single. Month.',
    },
  ];
  return (
    <Section
      id="problem"
      eyebrow="You know this story"
      title="The boring stuff is the part that loses you money"
      subtitle="Faded receipts. Customers asking for invoices you do not have. Debts that go quiet. FIRS rules you have not had time to read. None of it is the work you signed up for."
    >
      <Stagger step={100} from="up" className="grid gap-4 md:grid-cols-2">
        {pains.map((p) => (
          <HoverLift key={p.title}>
            <div className="card flex h-full gap-4 p-5 transition">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-owed-50 text-owed-600 transition group-hover:scale-110 group-hover:bg-owed-100">
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
      <Reveal delay={400} from="zoom" distance={14}>
        <p className="mx-auto mt-8 max-w-2xl text-center text-base font-semibold text-slate-700 md:text-lg">
          You do not need to work harder. You need a system that does the boring parts for you.
        </p>
      </Reveal>
    </Section>
  );
}

function Solution() {
  const features = [
    {
      icon: <Receipt size={22} />,
      title: 'Make an invoice in 30 seconds',
      body: 'Pick the customer, add line items, send. The link goes to WhatsApp. The customer can view it, download a PDF, or pay it online.',
    },
    {
      icon: <CreditCard size={22} />,
      title: 'Customer pays via the public pay link',
      body: 'They tap the link, choose card or transfer, and Paystack handles the rest. Your invoice marks itself as paid the moment the money lands.',
    },
    {
      icon: <Repeat size={22} />,
      title: 'Recurring invoices for retainer clients',
      body: 'Set it up once. CashTraka issues the same invoice every month, sends it on WhatsApp, and reminds the client when it is due.',
    },
    {
      icon: <Shield size={22} />,
      title: 'Tax invoices ready for FIRS',
      body: 'TIN, buyer address, item codes, IRN and QR code on the receipt. Download the XML and submit when FIRS asks for it.',
    },
    {
      icon: <RefreshCcw size={22} />,
      title: 'Credit notes when you cancel a sale',
      body: 'Customer returned the goods? Issue a credit note in two taps. The invoice updates, the receipt updates, your books stay clean.',
    },
    {
      icon: <Banknote size={22} />,
      title: 'Record a payment, the receipt sends itself',
      body: 'Cash, transfer, or POS. Log the amount and CashTraka emails the receipt and shares the link on WhatsApp without you typing a word.',
    },
    {
      icon: <Shield size={22} />,
      title: 'Bank alert verification',
      body: 'Got the bank SMS but Paystack has not confirmed yet? Paste the alert. CashTraka reads the amount, sender, and reference. No fake screenshots.',
    },
    {
      icon: <HandCoins size={22} />,
      title: 'Promise to Pay',
      body: 'Customer cannot pay today? Send them a Promise link. They pick a date and amount. If they miss it, the system flags it for you.',
    },
    {
      icon: <ListChecks size={22} />,
      title: 'Smart Collection Queue',
      body: 'Every overdue invoice, broken promise, and failed installment ranked by priority. Tap to open WhatsApp with the message ready to send.',
    },
    {
      icon: <MessageCircle size={22} />,
      title: 'Chase debts on WhatsApp',
      body: 'One tap drafts a polite reminder in your own WhatsApp. No tone-deaf templates. Send it, close the chat, move on.',
    },
    {
      icon: <Users size={22} />,
      title: 'Your customer book builds itself',
      body: 'Every buyer is saved with their phone, email, payment history, and what they bought. Phone-only customers welcome.',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Daily business pulse',
      body: 'Wake up to an email of yesterday. Who paid, who is overdue, what came in, what went out. Five seconds to read.',
    },
  ];
  return (
    <Section
      id="solutions"
      tone="muted"
      eyebrow="What you do in CashTraka"
      title="The whole back office, on your phone"
      subtitle="Make an invoice. Take the payment. Send the receipt. Chase the debt. Set up the next one to run on autopilot. Everything happens in one app."
    >
      <Reveal>
        <FeatureCarousel items={features} />
      </Reveal>
    </Section>
  );
}

function DeepDives() {
  const items = [
    {
      eyebrow: 'Invoice engine',
      title: 'Send a proper invoice. Get paid by tapping a link.',
      body: 'Build an invoice with line items, tax, discounts, and your logo. Share it on WhatsApp. The customer opens the public pay link, pays via Paystack, and the invoice marks itself as paid. No follow-up email needed.',
      bullets: [
        'Public pay link, no account or app needed for the customer',
        'Auto confirmed via Paystack webhook the second they pay',
        'Receipt with QR and PDF emails the customer right away',
      ],
      visual: <PaymentsCard />,
    },
    {
      eyebrow: 'Recurring invoices',
      title: 'Set it once. Send it every month. Forever.',
      body: 'For retainers, rent, subscriptions, anything that bills on a schedule. Pick the day of the month, the customer, and the line items. CashTraka issues, sends, and tracks each one. You just check that the money came in.',
      bullets: [
        'Monthly, weekly, or custom intervals',
        'Auto sends on WhatsApp on the issue date',
        'Pause, edit, or cancel from one screen',
      ],
      visual: <DebtsCard />,
    },
    {
      eyebrow: 'FIRS-ready tax invoices',
      title: 'Tax invoices that pass FIRS the first time',
      body: 'Your TIN, the buyer TIN, item codes, the right tax breakdown, and an IRN with a QR code on the receipt. Download the XML and submit when FIRS asks. Six years of document archive included.',
      bullets: [
        'TIN, buyer details, line-level tax codes, all in one form',
        'IRN and QR printed on the receipt',
        'XML download for FIRS submission',
      ],
      visual: <InstallmentCard />,
    },
    {
      eyebrow: 'Collection Queue',
      title: 'Always know who to chase next',
      body: 'Every overdue invoice, broken promise, expired pay link, and failed auto-debit ranked by priority. Each one comes with a suggested action. No more wondering which customer to call today.',
      bullets: [
        'Priority ranked by amount, days overdue, and history',
        'Suggested actions like "Call now", "Resend link", "Follow up"',
        'One tap opens WhatsApp with the message already written',
      ],
      visual: <FollowUpCard />,
    },
  ];
  return (
    <Section>
      <FeatureDeepDive items={items} />
    </Section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: 'Add the work',
      body: 'Make an invoice, log a sale, or record a debt. Takes 30 seconds. Share it on WhatsApp from the same screen.',
    },
    {
      n: 2,
      title: 'CashTraka collects',
      body: 'Pay link confirms via Paystack. Recurring invoices send themselves. Bank alerts verify transfers. Receipts go out automatically.',
    },
    {
      n: 3,
      title: 'You handle the rest',
      body: 'Open the Collection Queue, pick the top name, send the WhatsApp reminder. Done in two taps.',
    },
  ];
  return (
    <Section
      id="how-it-works"
      tone="muted"
      eyebrow="3 steps"
      title="Set up today. See money in your account this week."
    >
      <div className="relative grid gap-6 md:grid-cols-3 md:gap-8">
        <div
          aria-hidden
          className="absolute left-0 right-0 top-6 hidden h-0.5 overflow-hidden bg-brand-100 md:block"
        >
          <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
        </div>
        <Stagger step={140} from="up" className="contents">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="group/step relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-lg font-black text-white shadow-md transition hover:scale-110 hover:shadow-lg">
                <span className="absolute inset-0 rounded-full bg-brand-500 opacity-40 blur-lg transition group-hover/step:opacity-70" />
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

function ValueSection() {
  const wins = [
    { icon: MessageCircle, label: 'WhatsApp first. Send invoices, receipts, and reminders the way your customers actually read messages.' },
    { icon: PhoneCall, label: 'Phone-only customers welcome. No email? No problem. Save them by phone and send via WhatsApp.' },
    { icon: Shield, label: 'Took payment by bank transfer? Paste the SMS alert. We verify it, no Paystack confirmation needed.' },
    { icon: Sparkles, label: 'Mobile first. Built for the phone in your hand, not a laptop in an office.' },
    { icon: Users, label: 'Multiple staff, one business. Add your team with the right access.' },
    { icon: Receipt, label: 'Your branding on every invoice and receipt. Looks professional from day one.' },
  ];
  return (
    <Section
      eyebrow="Built around how you actually work"
      title="No new habits. Just less typing."
      subtitle="You already run your business on WhatsApp and bank alerts. CashTraka fits into that, it does not fight it."
    >
      <Stagger step={90} from="left" className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
        {wins.map((w) => (
          <HoverLift key={w.label}>
            <div className="card flex items-center gap-3 p-4 transition">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-100 group-hover:scale-110">
                <w.icon size={18} />
              </div>
              <span className="font-medium text-slate-800">{w.label}</span>
            </div>
          </HoverLift>
        ))}
      </Stagger>
    </Section>
  );
}

function Objections() {
  const items = [
    {
      title: 'New: full invoice engine',
      body: 'Make an invoice with line items, tax, discounts, and your logo. Share via the public pay link or WhatsApp. Customer pays online or marks as paid offline.',
    },
    {
      title: 'New: recurring invoices',
      body: 'Set up once for retainer clients, monthly rent, or subscriptions. CashTraka sends and tracks each cycle. You just confirm payment.',
    },
    {
      title: 'New: credit notes and delivery notes',
      body: 'Cancel a sale, refund a customer, or document goods delivered. The full set of business documents, not just receipts.',
    },
    {
      title: 'New: FIRS-ready tax invoices',
      body: 'TIN, buyer details, item codes, IRN, QR on the receipt, and XML for FIRS submission. Six-year document archive built in.',
    },
    {
      title: 'New: document audit log',
      body: 'See who edited what, and when. Every invoice, credit note, and receipt has a full history. Useful for staff, accountants, and FIRS.',
    },
  ];
  return (
    <Section
      tone="muted"
      eyebrow="What is new this season"
      title="A full invoice engine, FIRS-ready, on your phone"
    >
      <Stagger step={100} from="zoom" distance={18} className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <HoverLift key={it.title}>
            <div className="card p-6 transition">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-100 group-hover:rotate-6">
                <Sparkles size={20} />
              </div>
              <h3 className="font-semibold text-ink">{it.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{it.body}</p>
            </div>
          </HoverLift>
        ))}
      </Stagger>
      <Reveal delay={400} from="zoom" distance={14}>
        <p className="mx-auto mt-8 max-w-2xl text-center text-base font-semibold text-slate-700 md:text-lg">
          If you can send a WhatsApp message, you can run your business on CashTraka.
        </p>
      </Reveal>
    </Section>
  );
}

function Pricing() {
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title="Free for small operations. ₦3,000/month for the full toolkit."
      subtitle="Start free, no card. When you need invoices, FIRS, recurring billing, and the rest, switch to Starter for as little as ₦3,000 a month."
    >
      <Reveal>
        <div className="mx-auto max-w-3xl">
          <PricingCards />
        </div>
      </Reveal>
      <Reveal delay={200}>
        <p className="mt-6 text-center text-sm text-slate-600">
          See the full breakdown on the{' '}
          <Link href="/pricing" className="font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2">
            pricing page
          </Link>
          .
        </p>
      </Reveal>
    </Section>
  );
}

function FAQSection() {
  return (
    <Section
      id="faq"
      tone="muted"
      eyebrow="FAQ"
      title="Questions people ask before they sign up"
    >
      <Reveal>
        <FAQ />
      </Reveal>
    </Section>
  );
}

function FinalCTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-app">
        <Reveal from="zoom" distance={20} blur>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-success-500 px-6 py-12 text-center text-white md:px-12 md:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-slow-spin"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-success-300/30 blur-3xl animate-slow-spin"
              style={{ animationDuration: '32s', animationDirection: 'reverse' }}
            />
            <div className="relative">
              <h2 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">
                Stop running around for receipts. Start the day with money in.
              </h2>
              <p className="mt-3 text-lg text-white/90">Free to start. Five minutes to set up. Your first invoice goes out today.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/signup"
                  className="btn group/cta relative inline-flex overflow-hidden bg-white text-brand-700 shadow-lg hover:bg-brand-50"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-brand-200/60 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full" />
                  <span className="relative font-bold">Start free</span>
                </Link>
                <Link
                  href="/login"
                  className="btn inline-flex border border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-4 text-sm text-white/80">
                No card. No trial expiry on the free plan. Upgrade only when you need invoices and FIRS.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PaymentsCard() {
  return (
    <div className="card relative p-5 shadow-sm md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500">Payments · today</div>
          <div className="num mt-1 text-2xl text-success-700">₦28,500</div>
        </div>
        <div className="flex gap-1">
          <span className="rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700">
            Paid
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Pending
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <PayRow name="Amaka Nwosu" meta="Just now" amount="₦8,500" paid />
        <PayRow name="Chidi Okafor" meta="2h ago" amount="₦12,000" paid />
        <PayRow name="Tolu Bello" meta="Yesterday" amount="₦3,000" />
        <PayRow name="Kemi Adewale" meta="3 days ago" amount="₦15,000" paid />
      </div>
    </div>
  );
}

function PayRow({
  name,
  meta,
  amount,
  paid,
}: {
  name: string;
  meta: string;
  amount: string;
  paid?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{name}</div>
        <div className="text-[11px] text-slate-500">{meta}</div>
      </div>
      <div className="text-right">
        <div className={'num text-sm ' + (paid ? 'text-success-700' : 'text-ink')}>
          {amount}
        </div>
        <div className="text-[10px] font-semibold text-slate-500">
          {paid ? 'Paid' : 'Pending'}
        </div>
      </div>
    </div>
  );
}

function DebtsCard() {
  return (
    <div className="card p-5 shadow-sm md:p-6">
      <div className="text-xs font-medium text-slate-500">Money owed to you</div>
      <div className="num mt-1 text-3xl text-owed-600">₦27,500</div>
      <div className="mt-4 space-y-2">
        <DebtRow name="Chidi Okafor" meta="Due in 3 days" amount="₦7,500" />
        <DebtRow name="Tolu Bello" meta="No due date" amount="₦20,000" />
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <MessageCircle size={16} className="text-[#128C7E]" />
          Send reminder to Chidi
        </div>
        <span className="rounded-full bg-[#25D366] px-2.5 py-1 text-[10px] font-semibold text-white">
          WhatsApp
        </span>
      </div>
    </div>
  );
}

function DebtRow({ name, meta, amount }: { name: string; meta: string; amount: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{name}</div>
        <div className="text-[11px] text-slate-500">{meta}</div>
      </div>
      <div className="text-right">
        <div className="num text-sm text-owed-600">{amount}</div>
        <span className="text-[10px] font-semibold text-owed-700">Open</span>
      </div>
    </div>
  );
}

function InstallmentCard() {
  return (
    <div className="card p-5 shadow-sm md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500">Installment plan</div>
          <div className="mt-0.5 text-sm font-semibold text-ink">Amaka Nwosu · Hair order</div>
        </div>
        <span className="rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700">
          Active
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
        <div className="text-center">
          <div className="num text-lg font-bold text-ink">₦45,000</div>
          <div className="text-[10px] text-slate-500">Total</div>
        </div>
        <div className="text-center">
          <div className="num text-lg font-bold text-success-700">₦30,000</div>
          <div className="text-[10px] text-slate-500">Collected</div>
        </div>
        <div className="text-center">
          <div className="num text-lg font-bold text-owed-600">₦15,000</div>
          <div className="text-[10px] text-slate-500">Remaining</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <ChargeRow date="Apr 1" amount="₦15,000" status="paid" />
        <ChargeRow date="Apr 8" amount="₦15,000" status="paid" />
        <ChargeRow date="Apr 15" amount="₦15,000" status="upcoming" />
      </div>
      <div className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-brand-50 py-2 text-[11px] font-semibold text-brand-700">
        <Repeat size={12} />
        Next auto-charge: Apr 15
      </div>
    </div>
  );
}

function ChargeRow({ date, amount, status }: { date: string; amount: string; status: 'paid' | 'upcoming' }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-1.5">
      <div className="text-[11px] text-slate-500">{date}</div>
      <div className={'num text-sm font-semibold ' + (status === 'paid' ? 'text-success-700' : 'text-slate-400')}>{amount}</div>
      <span className={'rounded-full px-2 py-0.5 text-[9px] font-bold ' + (status === 'paid' ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500')}>
        {status === 'paid' ? 'Paid' : 'Upcoming'}
      </span>
    </div>
  );
}

function FollowUpCard() {
  return (
    <div className="card p-5 shadow-sm md:p-6">
      <div className="text-xs font-medium text-slate-500">Recipient</div>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
          A
        </span>
        <div className="text-sm font-semibold text-ink">Amaka Nwosu</div>
        <div className="ml-auto text-xs text-slate-500">+234 801 111 2222</div>
      </div>
      <div className="mt-4 text-xs font-medium text-slate-500">Message</div>
      <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700">
        Hi Amaka, your invoice INV-0142 is due tomorrow. Pay link inside if it helps.
      </div>
      <button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white hover:bg-[#1fbd5b]">
        <MessageCircle size={16} />
        Open in WhatsApp
      </button>
      <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
        <Check size={12} className="text-brand-600" />
        Goes through your own WhatsApp. Nothing to connect.
      </div>
    </div>
  );
}

function PropertyManagerSpotlight() {
  const features = [
    {
      title: 'Every tenant, every unit',
      body: 'See who lives where, how much they pay, and when rent is due, all on one screen.',
    },
    {
      title: 'Rent tracker with collection rate',
      body: 'Each month: how much you expected, how much came in, and who is still owing.',
    },
    {
      title: 'Auto reminders on WhatsApp',
      body: 'Nudge tenants a few days before rent is due, and again when it is overdue.',
    },
    {
      title: 'Verified payments, auto receipts',
      body: 'Paste the bank alert, confirm the tenant paid, and the receipt sends itself.',
    },
  ];
  return (
    <section id="property-manager" className="py-16 md:py-24">
      <div className="container-app">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              Also for landlords and property managers
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
              Every tenant. Every unit. Every naira accounted for.
            </h2>
            <p className="mt-3 text-slate-600 md:text-lg">
              No more chasing tenants in group chats. CashTraka gives every property a clean
              ledger, sends rent reminders automatically, and issues receipts the moment payment lands.
            </p>
          </div>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="card flex h-full items-start gap-3 p-5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Check size={16} strokeWidth={3} />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{f.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-8 flex justify-center">
          <Link href="/signup?type=property_manager" className="btn-primary">
            Start managing property
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
