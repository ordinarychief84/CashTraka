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
            Used by Nigerian businesses every day
          </p>
        </Reveal>
      </div>
      <Marquee items={items} speed={35} />
    </section>
  );
}

/* ---------------------- 2b. SOCIAL PROOF (trust stats) --------------------- */

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

/* ------------------------------ 3. PROBLEM ------------------------------ */

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

/* ----------------- 4. SOLUTIONS (feature carousel, fyle-style) ---------------- */

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

/* -------------------- 5. DEEP DIVES (alternating sections) -------------------- */

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

/* ----------------------------- 6. HOW IT WORKS -------------------------- */

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
        {/* Desktop connector line, animated gradient sweep */}
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

/* ---------------------------- 8. OBJECTIONS ----------------------------- */

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

/* ------------------------------ 9. PRICING ------------------------------ */

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

/* ------------------------------- 10. FAQ -------------------------------- */

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

/* ----------------------------- 11. FINAL CTA ---------------------------- */

function FinalCTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-app">
        <Reveal from="zoom" distance={20} blur>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-success-500 px-6 py-12 text-center text-white md:px-12 md:py-16">
            {/* Ambient glows, slow-spin gives the background faint motion */}
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
                No card. No trial expiry on the free plan. Upgrade only when you need invoices and FIRS.
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

/* ─────────────────────  Property Manager Spotlight  ───────────────────── */

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
