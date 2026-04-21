'use client';

import { useState } from 'react';
import { ChevronDown, Store, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

type IC = 'seller' | 'property_manager';

type QA = { q: string; a: string };

const SHARED: QA[] = [
  {
    q: 'Do I need technical knowledge?',
    a: 'No. If you can use WhatsApp, you can use CashTraka.',
  },
  {
    q: 'Does it work on my phone?',
    a: 'Yes. Built mobile-first. Works on any Android or iPhone in your browser — no app store install needed.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Payments, debts, customers, and expenses export to CSV with one tap. Your data is always yours.',
  },
  {
    q: 'Is my data safe?',
    a: 'Your records are private to you. We do not sell data. Payment processing goes through Paystack (PCI-compliant). WhatsApp messages go through your own WhatsApp — we never read them.',
  },
  {
    q: 'How does pricing work?',
    a: 'One plan — Starter — gives you full access to every feature. Pick quarterly, biannual, or yearly billing. Longer commitments save you up to 25%. Every frequency starts with a 7-day free trial, no card required.',
  },
  {
    q: 'How does the auto-debit / installment plan work?',
    a: 'When a customer first pays via your PayLink, Paystack stores their card authorization (only if reusable). You can then set up an installment plan — CashTraka automatically charges their card on schedule (daily, weekly, or monthly) until the balance clears. Every charge is verified via webhook before updating your records.',
  },
];

const SELLER_QUESTIONS: QA[] = [
  {
    q: 'How do payment links work?',
    a: 'You create a PayLink with the amount owed, share it on WhatsApp, and the customer pays online via Paystack. The moment they complete payment, CashTraka confirms it automatically via webhook — no manual checking. A receipt emails the customer and the payment updates your dashboard instantly.',
  },
  {
    q: 'What is Promise to Pay?',
    a: 'Instead of chasing a customer for money, you send them a Promise link. They open it, choose a payment date and amount, and commit. If they miss their promise, CashTraka flags it as "broken" automatically and moves them up your Collection Queue so you know who to follow up with first.',
  },
  {
    q: 'How does the bank-alert verification stop fake screenshots?',
    a: 'When a customer claims they paid, you paste your real bank SMS or email into CashTraka. The system reads the amount, sender name and reference from YOUR bank — not a screenshot from the customer. A fake receipt cannot pass this because the alert has to come from your own bank.',
  },
  {
    q: 'Can I send proper invoices and receipts to my customers?',
    a: 'Yes. Every payment automatically gets a shareable receipt link AND a downloadable PDF. Receipts are generated and emailed the moment payment is confirmed — whether via PayLink, auto-debit, or manual entry.',
  },
  {
    q: 'Do I need to change how I sell?',
    a: 'No. You keep using WhatsApp. CashTraka adds payment links, auto-debit, receipts, and a collection queue on top of your existing workflow.',
  },
  {
    q: 'Why should I pay for this?',
    a: 'Because one auto-collected installment, one prevented fake-screenshot fraud, or one broken promise caught early pays for the full quarter.',
  },
];

const PM_QUESTIONS: QA[] = [
  {
    q: 'How does CashTraka help me track rent across multiple properties?',
    a: "Each property has its own tenant roster and rent ledger. A single 'Rent Tracker' page shows you expected collection, actual collection, and who's behind — across every property you manage.",
  },
  {
    q: 'Can I set up auto-debit for rent collection?',
    a: 'Yes. After a tenant pays via your PayLink for the first time, their card authorization is stored securely by Paystack. You can then set up a monthly installment plan — CashTraka automatically charges their card on the same day each month until the balance clears or the lease ends.',
  },
  {
    q: 'How do the rent reminders work?',
    a: 'Set an auto-reminder once per tenant and CashTraka surfaces it on your reminders page when it comes due. One tap opens WhatsApp with a prefilled polite reminder mentioning the property, the amount, and the due date.',
  },
  {
    q: 'Do I need to install anything on the tenant\'s side?',
    a: 'No. Tenants receive everything on WhatsApp — reminders, payment links, receipts — with no app, no account, no friction on their end.',
  },
  {
    q: 'Why should I pay for this instead of a spreadsheet?',
    a: 'Because a spreadsheet won\'t auto-debit tenants, won\'t chase late payers, won\'t verify bank alerts, won\'t auto-issue receipts, and won\'t tell you at-a-glance what your collection rate is this month. CashTraka does all five.',
  },
];

export function FAQ() {
  const [ic, setIc] = useState<IC>('seller');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const items = ic === 'seller' ? [...SELLER_QUESTIONS, ...SHARED] : [...PM_QUESTIONS, ...SHARED];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Toggle mirrors the hero */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-white p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setIc('seller'); setOpenIndex(0); }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition',
              ic === 'seller' ? 'bg-brand-500 text-white' : 'text-slate-600 hover:text-ink',
            )}
          >
            <Store size={13} />
            Small Business
          </button>
          <button
            type="button"
            onClick={() => { setIc('property_manager'); setOpenIndex(0); }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition',
              ic === 'property_manager' ? 'bg-brand-500 text-white' : 'text-slate-600 hover:text-ink',
            )}
          >
            <Home size={13} />
            Landlords
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <li key={`${ic}-${i}`} className="card overflow-hidden">
              