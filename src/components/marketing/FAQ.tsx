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
    a: 'Your records are private to you. We do not sell data. WhatsApp messages go through your own WhatsApp — we never read them.',
  },
  {
    q: 'What is the difference between the plans?',
    a: 'Free gets you the core tracker with limits. The paid plan unlocks verification, receipts, automation and reports. The top tier adds team and priority support. Compare them on the pricing section above.',
  },
];

const SELLER_QUESTIONS: QA[] = [
  {
    q: 'How does the bank-alert verification stop fake screenshots?',
    a: 'When a customer claims they paid, you paste your real bank SMS or email into CashTraka. The system reads the amount, sender name and reference from YOUR bank — not a screenshot from the customer. A fake receipt cannot pass this because the alert has to come from your own bank.',
  },
  {
    q: 'Can I send proper invoices and receipts to my customers?',
    a: 'Yes. Every payment automatically gets a shareable receipt link AND a downloadable PDF. You can also create professional invoices, send them on WhatsApp, and convert them to a payment once received.',
  },
  {
    q: 'Can I manage a team and track what I owe them?',
    a: 'Yes. Add your staff with their pay type (monthly salary, weekly, daily wage, or per-task), mark attendance each day, and log every salary, advance, bonus, or reimbursement. CashTraka shows how much you still owe each staff this month, and salary payments automatically appear in your expenses report.',
  },
  {
    q: 'Do I need to change how I sell?',
    a: 'No. You keep using WhatsApp. CashTraka gives you structure and receipts on top of your existing workflow.',
  },
  {
    q: 'Why should I pay for this?',
    a: 'Because one prevented fake-screenshot fraud, one unpaid invoice chased down, or one forgotten customer followed up pays for the full year.',
  },
];

const PM_QUESTIONS: QA[] = [
  {
    q: 'How does CashTraka help me track rent across multiple properties?',
    a: "Each property has its own tenant roster and rent ledger. A single 'Rent Tracker' page shows you expected collection, actual collection, and who's behind — across every property you manage.",
  },
  {
    q: 'How do the rent reminders work?',
    a: 'Set an auto-reminder once per tenant and CashTraka surfaces it on your reminders page when it comes due. One tap opens WhatsApp with a prefilled polite reminder mentioning the property, the amount, and the due date.',
  },
  {
    q: 'Can I verify rent payments against my bank?',
    a: "Yes. When a tenant says they paid, paste your bank credit alert into CashTraka. If the amount and sender match, the rent is auto-confirmed, a receipt generates, and the tenant's ledger is updated. Fake screenshots don't get past the verification.",
  },
  {
    q: 'Do I need to install anything on the tenant\'s side?',
    a: 'No. Tenants receive everything on WhatsApp — reminders, payment links, receipts — with no app, no account, no friction on their end.',
  },
  {
    q: 'Why should I pay for this instead of a spreadsheet?',
    a: 'Because a spreadsheet won\'t chase late tenants, won\'t verify bank alerts, won\'t auto-issue receipts, and won\'t tell you at-a-glance what your collection rate is this month. CashTraka does all four.',
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
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-semibold text-slate-900">{item.q}</span>
                <ChevronDown
                  size={20}
                  className={cn(
                    'shrink-0 text-slate-500 transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border px-5 py-4 text-sm text-slate-700">
                  {item.a}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
