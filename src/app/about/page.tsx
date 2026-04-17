import Link from 'next/link';
import { Wallet, Clock3, MessageCircle, Users } from 'lucide-react';
import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata = { title: 'About us — CashTraka' };

export default function AboutPage() {
  return (
    <LegalLayout title="About CashTraka">
      <p className="text-lg">
        CashTraka is a simple tool that helps small businesses and landlords in Nigeria
        know who paid, know who owes, and follow up quickly.
      </p>

      <h2 className="mt-10 text-xl font-bold text-ink">Why we built it</h2>
      <p>
        Most sellers on WhatsApp are not losing money because they don’t have
        customers — they’re losing it because orders get buried in chats,
        payments go unconfirmed, and promised instalments quietly slip away.
        Spreadsheets and bookkeeping apps aren’t built for the way a seller
        actually works: on a phone, between conversations, sometimes while
        packing an order.
      </p>
      <p>
        We wanted a tool a seller could open the moment they get a transfer
        alert, log it, and move on — and one that would remind them, a week
        later, that Chidi still owes ₦7,500.
      </p>

      <h2 className="mt-10 text-xl font-bold text-ink">What CashTraka does</h2>
      <ul className="space-y-3">
        <Point icon={<Wallet className="text-brand-600" size={18} />}>
          Record payments in seconds — cash or transfer, paid or pending.
        </Point>
        <Point icon={<Clock3 className="text-owed-600" size={18} />}>
          Keep a live list of everyone who owes you, with a running total.
        </Point>
        <Point icon={<MessageCircle className="text-[#128C7E]" size={18} />}>
          Send reminders and follow-ups through your own WhatsApp — no new
          account, no integration.
        </Point>
        <Point icon={<Users className="text-brand-600" size={18} />}>
          Build a customer list automatically, so no one gets forgotten.
        </Point>
      </ul>

      <h2 className="mt-10 text-xl font-bold text-ink">What we believe</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Simple beats clever. A seller should never need a tutorial.</li>
        <li>The phone is the office. Everything works one-handed.</li>
        <li>Your customers and your records belong to you — always exportable.</li>
        <li>Fewer features, done well, outlast feature-bloated platforms.</li>
      </ul>

      <h2 className="mt-10 text-xl font-bold text-ink">Get in touch</h2>
      <p>
        We’d love to hear from you — whether you have a question, a request,
        or you want to tell us what’s broken in your current workflow.{' '}
        <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
          Contact us
        </Link>
        .
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/signup" className="btn-primary">Start free</Link>
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
