import Link from 'next/link';
import { Banknote, Clock3, MessageCircle, Users } from 'lucide-react';
import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata = { title: 'About CashTraka | Built for Nigerian businesses that run on trust' };

export default function AboutPage() {
  return (
    <LegalLayout title="About CashTraka">
      <p className="text-lg">
        CashTraka is the payment tracking system built for how Nigerian businesses actually work. On a phone, between WhatsApp messages, sometimes while packing an order.
      </p>

      <h2 className="mt-10 text-xl font-bold text-ink">The problem we saw</h2>
      <p>
        Millions of small businesses and landlords across Nigeria run on trust. A customer says "I sent it." A tenant says "I paid last Tuesday." And you are left scrolling through chats, checking bank apps, and hoping your memory is right.
      </p>
      <p>
        The problem is not that these businesses lack customers. It is that payments slip through the cracks. Debts get forgotten. Regulars drift to the next seller because nobody followed up. Notebooks fill up, spreadsheets get abandoned, and expensive accounting software sits unused because it was never designed for someone selling on WhatsApp.
      </p>

      <h2 className="mt-10 text-xl font-bold text-ink">What we built</h2>
      <p>
        CashTraka is a single system that replaces the notebook, the spreadsheet, and the group of apps that never quite worked together. It is designed for one-handed use on a phone, and every feature is built to take seconds, not minutes.
      </p>
      <ul className="space-y-3">
        <Point icon={<Banknote className="text-brand-600" size={18} />}>
          Record every payment the moment it lands. Cash or transfer, with a clear Paid or Pending status.
        </Point>
        <Point icon={<Clock3 className="text-owed-600" size={18} />}>
          See every outstanding debt in one list, with running totals, due dates, and overdue alerts.
        </Point>
        <Point icon={<MessageCircle className="text-[#128C7E]" size={18} />}>
          Send payment reminders, follow-ups, and payment links through WhatsApp. No integrations, no apps to connect.
        </Point>
        <Point icon={<Users className="text-brand-600" size={18} />}>
          Build your customer book automatically. Every buyer is saved. Every interaction is tracked.
        </Point>
      </ul>

      <h2 className="mt-10 text-xl font-bold text-ink">Who it is for</h2>
      <p>
        CashTraka serves two groups that share the same core challenge: tracking money that moves through trust and conversation.
      </p>
      <p>
        <strong>Small business owners</strong>: beauty sellers, fashion brands, food vendors, thrift shops, phone accessory sellers, tailors, and anyone who sells through WhatsApp, Instagram, or in person.
      </p>
      <p>
        <strong>Landlords and property managers</strong>: from a single building to a portfolio of properties. Track rent, remind tenants, verify payments, and issue receipts automatically.
      </p>

      <h2 className="mt-10 text-xl font-bold text-ink">What we believe</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Simple beats clever. If you need a tutorial, the product has failed.</li>
        <li>The phone is the office. Every feature works one-handed, on any device.</li>
        <li>Your data belongs to you. Always exportable, never locked in.</li>
        <li>A few features done well will always beat a bloated platform that nobody uses.</li>
        <li>Nigerian businesses deserve tools built for the way they actually operate, not tools ported from a different market.</li>
      </ul>

      <h2 className="mt-10 text-xl font-bold text-ink">Get in touch</h2>
      <p>
        We are always listening. Whether you have a feature request, a question, or you just want to tell us what is broken in your current workflow, we want to hear it.{' '}
        <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
          Contact us
        </Link>
        .
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/signup" className="btn-primary">Start free, no card needed</Link>
        <Link href="/" className="btn-secondary">Back to home</Link>
      </div>
    </LegalLayout>
  );
}

function Point({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        {icon}
      </span>
      <span className="text-slate-700">{children}</span>
    </li>
  );
}
