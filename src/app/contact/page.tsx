import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, HeadphonesIcon, Briefcase } from 'lucide-react';
import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata: Metadata = {
  title: 'Contact CashTraka | Book a demo or talk to sales',
  description:
    'Book a demo, talk to sales, or send a support message. CashTraka helps small batch businesses plan production, track materials, and manage orders.',
  alternates: { canonical: 'https://www.cashtraka.co/contact' },
};

type Topic = 'demo' | 'sales' | 'support';

type Variant = {
  badge: string;
  h1: string;
  blurb: string;
  primary: { label: string; href: string };
  /** Pre-filled mailto subject + body so the email arrives with context. */
  emailSubject: string;
  emailBody: string;
  icon: typeof HeadphonesIcon;
};

const VARIANTS: Record<Topic, Variant> = {
  demo: {
    badge: 'Book demo',
    h1: 'See CashTraka with your own production workflow.',
    blurb:
      'Pick a time and we will walk you through customer orders, production planning, shortage alerts, and invoicing using a setup that mirrors your business.',
    primary: { label: 'Email to book a demo', href: '' /* set below */ },
    emailSubject: 'Book a CashTraka demo',
    emailBody:
      "Hi CashTraka team,\n\nI'd like to book a demo. Quick context about my business:\n\n- What I make / sell: \n- Roughly how many orders per month: \n- The biggest operational pain right now: \n\nGood times to chat: \n\nThanks!",
    icon: Calendar,
  },
  sales: {
    badge: 'Talk to sales',
    h1: "Let's scope CashTraka for your team.",
    blurb:
      'Multiple production teams, custom workflows, or onboarding support? Email and a real human will reply with options for the Business plan and beyond.',
    primary: { label: 'Email sales', href: '' },
    emailSubject: 'CashTraka Business plan — sales enquiry',
    emailBody:
      "Hi CashTraka team,\n\nI'm interested in the Business plan. Some context:\n\n- Company name: \n- Team size: \n- What we make: \n- Current tools we use to plan production: \n- What we want to improve: \n\nThanks!",
    icon: Briefcase,
  },
  support: {
    badge: 'Talk to us',
    h1: 'We are listening.',
    blurb:
      "Whether you have a feature request, a question, or you just want to tell us what is broken in your current workflow, we want to hear it. A real person reads every message.",
    primary: { label: 'Email support', href: '' },
    emailSubject: 'CashTraka — question',
    emailBody:
      "Hi CashTraka team,\n\nI have a question / feature request:\n\n\nThanks!",
    icon: HeadphonesIcon,
  },
};

function resolveTopic(raw: string | undefined): Topic {
  if (raw === 'demo' || raw === 'sales') return raw;
  return 'support';
}

export default function ContactPage({
  searchParams,
}: {
  searchParams: { topic?: string };
}) {
  const topic = resolveTopic(searchParams.topic);
  const variant = VARIANTS[topic];
  const mailto =
    'mailto:Support@cashtraka.co' +
    `?subject=${encodeURIComponent(variant.emailSubject)}` +
    `&body=${encodeURIComponent(variant.emailBody)}`;
  const Icon = variant.icon;

  return (
    <LegalLayout>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon size={20} />
        </span>
        <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
          {variant.badge}
        </span>
      </div>

      <h1 className="mt-5 text-3xl font-black tracking-tight text-ink md:text-4xl">
        {variant.h1}
      </h1>
      <p className="mt-3 text-lg text-slate-600">{variant.blurb}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href={mailto} className="btn-primary">
          {variant.primary.label}
        </a>
        <a
          href="mailto:Support@cashtraka.co"
          className="font-semibold text-brand-600 hover:underline"
        >
          Support@cashtraka.co
        </a>
      </div>

      <div className="mt-10 grid gap-3 md:grid-cols-3">
        <TopicLink
          href="/contact?topic=demo"
          active={topic === 'demo'}
          label="Book demo"
          desc="Walk through CashTraka with our team."
        />
        <TopicLink
          href="/contact?topic=sales"
          active={topic === 'sales'}
          label="Talk to sales"
          desc="Pricing & onboarding for teams."
        />
        <TopicLink
          href="/contact"
          active={topic === 'support'}
          label="Get support"
          desc="Questions, feedback, anything else."
        />
      </div>

      <div className="mt-12 rounded-xl border border-border bg-slate-50 p-5">
        <p className="text-sm text-slate-700">
          Not a user yet?{' '}
          <Link
            href="/signup"
            className="font-semibold text-brand-600 hover:underline"
          >
            Start free
          </Link>{' '}
          — it takes under five minutes and you can plan your first order
          before you even hear back from us.
        </p>
      </div>
    </LegalLayout>
  );
}

function TopicLink({
  href,
  active,
  label,
  desc,
}: {
  href: string;
  active: boolean;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition ${
        active
          ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
          : 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/30'
      }`}
    >
      <p className="text-sm font-bold text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-slate-600">{desc}</p>
    </Link>
  );
}
