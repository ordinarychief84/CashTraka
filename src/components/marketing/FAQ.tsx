'use client';

import { useState } from 'react';
import { ChevronDown, Store, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

type IC = 'seller' | 'property_manager';

type QA = { q: string; a: string };

const SHARED: QA[] = [
  {
    q: 'Do my customers need an account to pay?',
    a: 'No. They tap the pay link, choose card or transfer, pay through Paystack, and get a receipt. No account, no app, no signup. Even a phone-only customer can complete it on their phone browser.',
  },
  {
    q: 'Can I share invoices on WhatsApp?',
    a: 'Yes. Every invoice has a public link. From the invoice screen, one tap opens your WhatsApp with the link and a short message ready to send. The customer opens the link, sees the invoice, and pays.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes. The free plan covers up to 50 payments a month, 20 active debts, 50 customers, 1 property and 5 tenants, with no card and no expiry. Invoices, recurring billing, credit notes, and FIRS features are on Starter.',
  },
  {
    q: 'What about FIRS and tax?',
    a: 'Starter includes tax invoices with TIN, buyer details, and item codes, plus IRN and a QR code on every receipt. You can download the XML for FIRS and pull from a 6-year document archive when they ask.',
  },
  {
    q: 'Does CashTraka work without internet?',
    a: 'You need internet for invoices and Paystack payments to send. Old records you already loaded stay readable offline. The moment you reconnect, anything pending syncs automatically.',
  },
  {
    q: 'Is my data safe?',
    a: 'Your records are private. We do not sell data. Card payments go through Paystack (PCI compliant). WhatsApp messages send through your own WhatsApp, we never see them.',
  },
];

const SELLER_QUESTIONS: QA[] = [
  {
    q: 'How does the invoice engine work?',
    a: 'Pick a customer, add line items, add tax or discount if you want, and save. CashTraka gives you a public pay link and a PDF. Share on WhatsApp. The customer pays online or you mark it as paid offline. The receipt sends itself.',
  },
  {
    q: 'Can I set up an invoice that sends itself every month?',
    a: 'Yes. Create a recurring invoice for retainer clients, monthly subscriptions, or any regular bill. Pick the day, the customer, and the line items. CashTraka issues and sends each cycle on its own.',
  },
  {
    q: 'What if I cancel a sale or refund a customer?',
    a: 'Issue a credit note in two taps. The original invoice updates, the receipt is adjusted, and the audit log keeps a record so your books stay clean.',
  },
  {
    q: 'I took the payment by bank transfer. Do I have to wait for Paystack?',
    a: 'No. Paste the bank alert SMS or email. CashTraka reads the amount, sender name, and reference straight from your bank. The payment marks as verified without going through Paystack.',
  },
  {
    q: 'I have customers without email. Can I still send them invoices?',
    a: 'Yes. Save them by phone. The invoice link goes on WhatsApp. They open it on their phone, pay, and get the receipt back on WhatsApp.',
  },
];

const PM_QUESTIONS: QA[] = [
  {
    q: 'Can I send rent invoices instead of chasing in a group chat?',
    a: 'Yes. Create a recurring invoice per tenant for their monthly rent. CashTraka issues it on the due date, sends the pay link to their WhatsApp, and tracks who has paid.',
  },
  {
    q: 'Can rent be auto-debited every month?',
    a: 'Yes. Once a tenant pays via your pay link the first time, Paystack stores their card authorization. Set the schedule and CashTraka charges them on the same day each month until the lease ends.',
  },
  {
    q: 'How do I know who is owing across all my properties?',
    a: 'The rent tracker shows expected, collected, and outstanding for every property in one screen. Tap any tenant to see their full history and send a reminder.',
  },
  {
    q: 'Do tenants need to install anything?',
    a: 'No. They receive the invoice and pay link on WhatsApp, pay, and get the receipt back on WhatsApp. No app, no signup, no friction.',
  },
  {
    q: 'Can I issue a proper tax invoice if a tenant or company asks?',
    a: 'Yes. Switch the invoice to a tax invoice, fill in TIN and buyer details, and CashTraka generates it with IRN and QR. Download the XML for FIRS if you need to.',
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
