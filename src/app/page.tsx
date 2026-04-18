import Link from 'next/link';
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
  PhoneCall,
  Check,
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
        <HeroSolutions />
        <SolutionsPath />
        <AudienceMarquee />
        <SocialProof />
        <Problem />
        <Solution />
        <DeepDives />
        <HowItWorks />
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

/* ------------------------------- 1. HERO ------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white py-14 md:py-20">
      {/* Soft blur glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-0 h-80 w-[45rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div className="container-app relative z-10 grid items-center gap-10 md:grid-cols-2 md:gap-12">
        <Reveal from="up">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            WhatsApp Sales & Cash Tracker
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
            Stop losing money from customers who haven’t paid
          </h1>
          <p className="mt-4 text-lg text-slate-600 md:text-xl">
            CashTraka helps you track payments, know who owes you, and follow up in
            seconds from one simple system.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">Start free</Link>
            <a href="#solutions" className="btn-secondary">See how it works</a>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Set up in under 5 minutes. No complicated tools.
          </p>
        </Reveal>
        <Reveal from="right" delay={150} className="order-first md:order-last">
          <HeroMockup />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------- 2. AUDIENCE MARQUEE (like fyle) ---------------------- */

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
            Trusted by businesses across Nigeria
          </p>
        </Reveal>
      </div>
      <Marquee items={items} speed={35} />
    </section>
  );
}

/* ---------------------- 2b. SOCIAL PROOF (trust stats) --------------------- */

function SocialProof() {
  /*
   * Rebuilt layout. Previously each stat card was text-4xl on every
   * viewport which made mobile feel bloated (the user screenshot showed
   * the ₦ glyph nearly touching the card border). New shape:
   *
   *   mobile   : 3 cards stacked, tighter padding, text-3xl number
   *   tablet   : 2 + 1 layout so the primary "₦150k+" card stays wide
   *   desktop  : 3 equal columns with a subtle lift-on-hover
   *
   * Labels stay small, descriptions a single line, numbers scaled via
   * a responsive clamp so they don't squash the card on narrow screens.
   */
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
      body: 'in previously-forgotten debts, within the first 30 days.',
      accent: 'brand',
    },
    {
      label: 'Setup time',
      number: (
        <AnimatedStat value={5} suffix=" min" className="text-success-700" />
      ),
      body: 'from signup to recording your first payment. No tutorials.',
      accent: 'success',
    },
    {
      label: 'Collection rate',
      number: <AnimatedStat value={82} suffix="%" className="text-brand-600" />,
      body: 'average of what is owed comes in — vs 54% on spreadsheets.',
      accent: 'brand',
    },
  ] as const;

  return (
    <section className="py-14 md:py-20">
      <div className="container-app">
        <Reveal from="up" blur>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-brand-600">
            Real results · Real businesses
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-2xl font-black tracking-tight text-ink md:text-3xl">
            Numbers that speak for themselves
          </h2>
        </Reveal>
        <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <Stagger step={110} from="up" className="contents">
            {cards.map((c, i) => (
              <li
                key={c.label}
                className={
                  'group relative flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-white p-5 text-center shadow-xs transition hover:-translate-y-1 hover:shadow-md md:p-6' +
                  // Make the middle (primary) card pop slightly on tablet+
                  (i === 0 ? ' sm:col-span-2 lg:col-span-1' : '')
                }
              >
                {/* Soft accent glow on hover */}
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

/* ------------------------------ 3. PROBLEM ------------------------------ */

function Problem() {
  const pains = [
    {
      icon: AlertTriangle,
      title: ‘”I sent it” — but nothing hit your account’,
      body: ‘Fake screenshots. Forgotten transfers. You end up delivering goods on a promise, not a payment.’,
    },
    {
      icon: Inbox,
      title: ‘Yesterday’s order is buried under 300 messages’,
      body: ‘WhatsApp was never built to run a business. Important details vanish in the scroll.’,
    },
    {
      icon: Clock3,
      title: ‘”I’ll pay you tomorrow” — 3 weeks ago’,
      body: ‘Without a system, debts slip through the cracks. You absorb the loss quietly.’,
    },
    {
      icon: SearchX,
      title: ‘Your best customer just bought from someone else’,
      body: ‘No follow-up means no loyalty. The sellers who check in are the ones who keep the sale.’,
    },
  ];
  return (
    <Section
      id=”problem”
      eyebrow=”Sound familiar?”
      title=”Running your business on WhatsApp alone is costing you real money”
      subtitle=”Unconfirmed payments. Forgotten debts. Customers who drift to the next seller because nobody followed up. It’s not a people problem — it’s a systems problem.”
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
          You are not lazy. You just do not have a system yet.
        </p>
      </Reveal>
    </Section>
  );
}

/* ----------------- 4. SOLUTIONS (feature carousel, fyle-style) ---------------- */

function Solution() {
  const features = [
    {
      icon: <Wallet size={22} />,
      title: 'Record payments in seconds',
      body: 'Cash or transfer — log it the moment money lands. Always know who paid and who did not.',
    },
    {
      icon: <Clock3 size={22} />,
      title: 'See every outstanding debt',
      body: 'One screen shows everyone who owes you, how much, and how long it has been.',
    },
    {
      icon: <MessageCircle size={22} />,
      title: 'Chase debts via WhatsApp',
      body: 'One tap sends a polite reminder straight to the customer — no typing, no awkwardness.',
    },
    {
      icon: <Users size={22} />,
      title: 'Auto-build your customer book',
      body: 'Every buyer gets saved automatically. Search by name or phone in one box.',
    },
    {
      icon: <RefreshCcw size={22} />,
      title: 'Win back quiet customers',
      body: 'See who has not bought in a while and re-engage them with one tap.',
    },
    {
      icon: <Shield size={22} />,
      title: 'Your whole business, one screen',
      body: 'Payments, debts, customers, invoices, receipts — no more hunting across 200 chats.',
    },
  ];
  return (
    <Section
      id="solutions"
      tone="muted"
      eyebrow="Meet CashTraka"
      title="The system your business has been missing"
      subtitle="Stop guessing. Start knowing exactly who paid, who owes, and what to do next."
    >
      <Reveal>
        <FeatureCarousel items={features} />
      </Reveal>
    </Section>
  );
}

/* -------------------- 5. DEEP DIVES (alternating sections) -------------------- */

function DeepDives() {
  const items = [
    {
      eyebrow: ‘Payments’,
      title: ‘Every naira, accounted for’,
      body: ‘Record cash and transfers the moment they land. Filter by status, search by name — and watch your daily total climb in real time.’,
      bullets: [
        ‘Paid or Pending status on every entry’,
        ‘Instant search by name or phone’,
        ‘Daily, weekly, and monthly totals at a glance’,
      ],
      visual: <PaymentsCard />,
    },
    {
      eyebrow: ‘Debts’,
      title: ‘Never forget who owes you again’,
      body: ‘One list. One total. A WhatsApp reminder button beside every name. Outstanding debts stop being a guessing game.’,
      bullets: [
        ‘Open and settled debts clearly separated’,
        ‘Due dates flag what is overdue’,
        ‘One-tap WhatsApp reminder — pre-written for you’,
      ],
      visual: <DebtsCard />,
    },
    {
      eyebrow: ‘Follow-ups’,
      title: ‘The easiest way to bring customers back’,
      body: ‘Pick a customer, tap follow-up, tweak the message, and WhatsApp opens ready to send. Three seconds, done.’,
      bullets: [
        ‘Ready-made templates you can customise’,
        ‘Your full customer list, already loaded’,
        ‘No integrations — just your own WhatsApp’,
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

/* ----------------------------- 6. HOW IT WORKS -------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: 'Record a payment or add a debtor',
      body: 'Takes 10 seconds. Customer is saved automatically.',
    },
    {
      n: 2,
      title: 'See your dashboard light up',
      body: 'Totals, debts, overdue alerts — all in one place.',
    },
    {
      n: 3,
      title: 'Follow up and collect via WhatsApp',
      body: 'Send payment links, reminders, and re-engagement messages with one tap.',
    },
  ];
  return (
    <Section
      id="how-it-works"
      tone="muted"
      eyebrow="3 steps"
      title="Set up in minutes. See results the same day."
    >
      <div className="relative grid gap-6 md:grid-cols-3 md:gap-8">
        {/* Desktop connector line — animated gradient sweep */}
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

/* ------------------------------ 7. VALUE -------------------------------- */

function ValueSection() {
  const wins = [
    { icon: RefreshCcw, label: 'Recover debts you thought were lost' },
    { icon: MessageCircle, label: 'Send payment reminders without the awkwardness' },
    { icon: PhoneCall, label: 'Re-engage customers before they forget you' },
    { icon: Shield, label: 'Know your exact cash position at any moment' },
  ];
  return (
    <Section
      eyebrow="The real value"
      title="You do not need more customers — you need to keep the ones you have"
      subtitle="The money is already in your business. CashTraka helps you collect it, track it, and grow it."
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

/* ---------------------------- 8. OBJECTIONS ----------------------------- */

function Objections() {
  const items = [
    { title: ‘Zero spreadsheets’, body: ‘No formulas, no columns, no confusion. Just your money, in plain Naira, on one screen.’ },
    { title: ‘Zero setup headaches’, body: ‘Sign up, log your first sale, and you are already ahead of 90% of sellers still using notebooks.’ },
    { title: ‘Zero tech skills needed’, body: ‘If you can send a WhatsApp message, you can use CashTraka. It was built for phones first.’ },
  ];
  return (
    <Section
      tone="muted"
      eyebrow="Built for real life"
      title="No learning curve. No complicated software. Just results."
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
          If you can use WhatsApp, you can use CashTraka.
        </p>
      </Reveal>
    </Section>
  );
}

/* ------------------------------ 9. PRICING ------------------------------ */

function Pricing() {
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title="One recovered debt pays for a whole year"
      subtitle="Start free. Upgrade when your business is ready. No contracts, cancel anytime."
    >
      <Reveal>
        <div className="mx-auto max-w-3xl">
          <PricingCards />
        </div>
      </Reveal>
    </Section>
  );
}

/* ------------------------------- 10. FAQ -------------------------------- */

function FAQSection() {
  return (
    <Section
      id="faq"
      tone="muted"
      eyebrow="FAQ"
      title="Frequently asked questions"
    >
      <Reveal>
        <FAQ />
      </Reveal>
    </Section>
  );
}

/* ----------------------------- 11. FINAL CTA ---------------------------- */

function FinalCTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-app">
        <Reveal from="zoom" distance={20} blur>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-success-500 px-6 py-12 text-center text-white md:px-12 md:py-16">
            {/* Ambient glows — slow-spin gives the background faint motion */}
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
                Your customers are already there. Your money should be too.
              </h2>
              <p className="mt-3 text-lg text-white/90">Join thousands of Nigerian businesses that stopped guessing and started collecting.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/signup"
                  className="btn group/cta relative inline-flex overflow-hidden bg-white text-brand-700 shadow-lg hover:bg-brand-50"
                >
                  {/* Shimmer sweep on hover */}
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
                Free plan available. Set up in under 5 minutes. No card required.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------- Deep-dive visuals --------------------------- */

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
        Hi Amaka, we have new stock available. Let me know if you’d like to order.
      </div>
      <button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white hover:bg-[#1fbd5b]">
        <MessageCircle size={16} />
        Open in WhatsApp
      </button>
      <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
        <Check size={12} className="text-brand-600" />
        Uses your own WhatsApp — nothing to connect
      </div>
    </div>
  );
}

/* ─────────────────────  Property Manager Spotlight  ───────────────────── */

function PropertyManagerSpotlight() {
  const features = [
    {
      title: 'Every tenant, every unit',
      body: 'See who lives where, how much they pay, and when rent is due — all in one view.',
    },
    {
      title: 'Rent tracker with collection rate',
      body: 'Monthly KPI: how much was expected, collected, and still outstanding.',
    },
    {
      title: 'Auto reminders on WhatsApp',
      body: 'Nudge tenants a few days before rent is due, and again when it\'s overdue.',
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
              Also built for property managers
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
              Every tenant. Every unit. Every naira collected.
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
