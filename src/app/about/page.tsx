import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ClipboardList,
  Factory,
  Boxes,
  AlertTriangle,
} from 'lucide-react';
import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata: Metadata = {
  title:
    'About CashTraka | Operational Planning for Small Batch Businesses',
  description:
    'CashTraka is the operational planning system for small batch businesses in Nigeria and Africa. We help shops, factories, and workshops manage orders, production, materials, inventory, invoices, and receipts.',
  alternates: { canonical: 'https://www.cashtraka.co/about' },
  openGraph: {
    title: 'About CashTraka',
    description:
      'The operational planning system for small batch businesses in Nigeria and Africa.',
    url: 'https://www.cashtraka.co/about',
    siteName: 'CashTraka',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <LegalLayout title="About CashTraka">
      <p className="text-lg">
        CashTraka is an operational planning system built for small batch
        businesses in Nigeria and Africa — the shops, factories, workshops,
        and processors that make, assemble, package, or process products
        every day.
      </p>

      <h2 className="mt-10 text-xl font-bold text-ink">The problem we saw</h2>
      <p>
        Most small production businesses run on WhatsApp, notebooks, and
        memory. That works until orders increase, materials run out,
        production gets delayed, or a customer asks for an update you cannot
        answer quickly.
      </p>
      <p>
        Customer orders get scattered across chats. Raw materials run out
        at the wrong time. Production plans live in someone's head. Inventory
        is hard to trust. Invoices and receipts are created too late.
        Enterprise ERP software costs too much and asks for too much. The
        gap in the middle — between a notebook and SAP — is where small
        batch businesses sit and where CashTraka fits.
      </p>

      <h2 className="mt-10 text-xl font-bold text-ink">What we built</h2>
      <p>
        CashTraka brings customer orders, production, raw materials,
        inventory, purchases, invoices, and receipts into one simple
        workflow. Mobile-first, WhatsApp-friendly, and designed for
        non-technical business owners.
      </p>
      <ul className="space-y-3">
        <Point icon={<ClipboardList className="text-brand-600" size={18} />}>
          Capture every customer order with items, quantity, due date, and
          notes. Track it from request to delivery.
        </Point>
        <Point icon={<Factory className="text-brand-600" size={18} />}>
          Plan production orders, monitor progress, and connect each run to
          the customer order that requested it.
        </Point>
        <Point icon={<Boxes className="text-brand-600" size={18} />}>
          Track raw materials, reorder levels, supplier records, and finished
          goods stock as it moves.
        </Point>
        <Point icon={<AlertTriangle className="text-rose-600" size={18} />}>
          See material shortages before production starts, with a suggested
          purchase list so nothing stalls a run.
        </Point>
      </ul>

      <h2 className="mt-10 text-xl font-bold text-ink">Who it is for</h2>
      <p>
        CashTraka is built for small batch businesses across many industries:
        skincare and cosmetics brands, food processors, fashion workshops,
        furniture makers, printing shops, agro-processors, packaging
        businesses, and small factories. If you make, assemble, package, or
        process products, CashTraka was designed for you.
      </p>

      <h2 className="mt-10 text-xl font-bold text-ink">What we believe</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Simple beats clever. If you need a tutorial, the product has failed.
        </li>
        <li>The phone is the office. Every feature works one-handed.</li>
        <li>Your data belongs to you. Always exportable, never locked in.</li>
        <li>
          A few features done well will always beat a bloated ERP nobody uses.
        </li>
        <li>
          African production businesses deserve tools built for the way they
          actually operate.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-bold text-ink">Get in touch</h2>
      <p>
        We are always listening. Whether you have a feature request, a
        question, or you just want to tell us what is broken in your current
        workflow, we want to hear it.{' '}
        <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
          Contact us
        </Link>
        .
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/signup" className="btn-primary">
          Start 30-day free trial
        </Link>
        <Link href="/solutions" className="btn-secondary">
          See the workflow
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Every new account gets 30 days of Pro free. No card required.
      </p>
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
