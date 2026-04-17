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
import { HeroICP } from '@/components/marketing/HeroICP';
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
        <HeroICP />
        <AudienceMarquee />
        <SocialProof />
        <Problem />
        <Solution />
        <DeepDives />
        <HowItWorks />
        <ValueSection />
        <PropertyManagerSpotlight />
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
    'Fashion sellers',
    'Resellers',
    'Skincare brands',
    'Food vendors',
    'Thrift shops',
    'Perfume sellers',
    'Property managers',
    'Landlords',
    'Rental agents',
    'Small business owners',
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
            Built for real sellers
          </p>
        </Reveal>
      </div>
      <Marquee items={items} speed={35} />
    </section>
  );
}

/* ---------------------- 2b. SOCIAL PROOF (trust stats) --------------------- */

function SocialProof() {
  return (
    <section className="py-14 md:py-16">
      <div className="container-app">
        <Reveal from="up" blur>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-brand-600">
            Built by sellers · for sellers
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-2xl font-black tracking-tight text-ink md:text-3xl">
            The tool Nigerian SMBs lean on to recover real money
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Stagger step={120} from="up">
            <div className="card p-6 text-center transition hover:-translate-y-1 hover:shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Average seller recovers
              </div>
              <div className="mt-3 text-4xl font-black text-brand-700">
                <AnimatedStat prefix="₦" value={150_000} suffix="+" />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                in previously-forgotten debts, within the first 30 days.
              </p>
            </div>
            <div className="card p-6 text-center transition hover:-translate-y-1 hover:shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Setup time
              </div>
              <div className="mt-3 text-4xl font-black text-success-700">
                <AnimatedStat value={5} suffix=" min" />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                from signup to recording your first payment. No tutorials.
              </p>
            </div>
            <div className="card p-6 text-center transition hover:-translate-y-1 hover:shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Collection rate
              </div>
              <div className="mt-3 text-4xl font-black text-brand-700">
                <AnimatedStat value={82} suffix="%" />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                average of what&apos;s owed comes in — vs 54% on spreadsheets.
              </p>
            </div>
          </Stagger>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ 3. PROBLEM ------------------------------ */

function Problem() {
  const pains = [
    {
      icon: AlertTriangle,
      title: 'Customers say they paid — but did they?',
      body: 'Screenshots, vague receipts, half-replied chats. You’re guessing, not confirming.',
    },
    {
      icon: Inbox,
      title: 'Chats get buried and lost',
      body: 'The order from yesterday is already 200 messages up. Something important slipped.',
    },
    {
      icon: Clock3,
      title: 'Debts you forget to follow up on',
      body: '“I’ll pay tomorrow” becomes next month. You carry the loss, not them.',
    },
    {
      icon: SearchX,
      title: 'Repeat customers disappear',
      body: 'You never followed up. They went and bought from someone else.',
    },
  ];
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="If you sell on WhatsApp, you are already losing money"
      subtitle="Customers say they have paid but you are not sure. Some people owe you and you forget to follow up. Old customers disappear because you never check in. Important chats get buried and lost."
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
          You are not running a system. You are reacting to messages.
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
      title: 'Track every payment',
      body: 'Know who paid and when. No confusion.',
    },
    {
      icon: <Clock3 size={22} />,
      title: 'See who owes you instantly',
      body: 'All your debtors in one place with total amount owed.',
    },
    {
      icon: <MessageCircle size={22} />,
      title: 'Follow up in seconds',
      body: 'Send reminders and messages directly through WhatsApp.',
    },
    {
      icon: <Users size={22} />,
      title: 'Build your customer list automatically',
      body: 'Every buyer is saved. No more lost contacts.',
    },
    {
      icon: <RefreshCcw size={22} />,
      title: 'Bring back quiet customers',
      body: 'One tap to restart a conversation with an old buyer.',
    },
    {
      icon: <Shield size={22} />,
      title: 'One source of truth',
      body: 'Your whole business on one screen, not across 200 chats.',
    },
  ];
  return (
    <Section
      id="solutions"
      tone="muted"
      eyebrow="The solution"
      title="CashTraka gives you control over your sales and cash"
      subtitle="Instead of guessing, you know exactly what is happening in your business."
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
      eyebrow: 'Payments',
      title: 'Log a sale the moment money lands',
      body: 'Record cash and transfers with one tap. Filter to see only the payments you’re still waiting on.',
      bullets: [
        'Paid or Pending status on every entry',
        'Search by name or phone in one box',
        'Totals update in real time',
      ],
      visual: <PaymentsCard />,
    },
    {
      eyebrow: 'Debts',
      title: 'See everyone who still owes you — at a glance',
      body: 'One list, one total, and a WhatsApp reminder button beside every name. No more forgotten balances.',
      bullets: [
        'Open and paid debts clearly separated',
        'Optional due dates to flag what’s late',
        'One-tap prefilled reminder in WhatsApp',
      ],
      visual: <DebtsCard />,
    },
    {
      eyebrow: 'Follow-ups',
      title: 'Turn chats into repeat sales',
      body: 'Pick a customer, tap follow-up, tweak the message, and open WhatsApp ready to send. That’s the whole workflow.',
      bullets: [
        'Default templates you can edit',
        'Your customer list is already in there',
        'Nothing to connect — just uses your WhatsApp',
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
      title: 'Add a payment or a debtor',
      body: 'Takes less than 10 seconds.',
    },
    {
      n: 2,
      title: 'CashTraka saves your customer automatically',
      body: 'No manual tracking needed.',
    },
    {
      n: 3,
      title: 'Send reminders or follow-ups through WhatsApp',
      body: 'Recover money and close more sales.',
    },
  ];
  return (
    <Section
      id="how-it-works"
      tone="muted"
      eyebrow="How it works"
      title="Simple. Fast. Works from day one."
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
    { icon: RefreshCcw, label: 'Recover money you forgot' },
    { icon: MessageCircle, label: 'Remind customers who still owe you' },
    { icon: PhoneCall, label: 'Bring back customers who have not bought in a while' },
    { icon: Shield, label: 'Stop missing payments and losing track' },
  ];
  return (
    <Section
      eyebrow="The value"
      title="Make more money without finding new customers"
      subtitle="Most sellers do not need more customers. They need to manage the ones they already have."
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
    { title: 'No spreadsheets', body: 'You won’t touch a formula. Everything is on screen, in plain Naira.' },
    { title: 'No complex setup', body: 'Create an account and you’re taking your first payment in minutes.' },
    { title: 'No technical knowledge', body: 'Tap, type, done. Built for phones first.' },
  ];
  return (
    <Section
      tone="muted"
      eyebrow="We keep it simple"
      title="You do not need another complicated tool"
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
      title="Simple pricing that pays for itself"
      subtitle="If CashTraka helps you recover one payment, it has already paid for itself."
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
                You already did the hard part. You got the customers.
              </h2>
              <p className="mt-3 text-lg text-white/90">Now stop losing money from them.</p>
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
                Set up in minutes. See value the same day.
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
              Collect rent on time. Know who's behind.
            </h2>
            <p className="mt-3 text-slate-600 md:text-lg">
              Stop chasing tenants in group chats. Give every property a clean
              ledger and let CashTraka handle reminders and receipts.
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
