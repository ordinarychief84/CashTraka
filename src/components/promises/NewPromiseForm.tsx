'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Send, CheckCircle } from 'lucide-react';
import { ContactPickerButton } from '@/components/ContactPickerButton';
import { waLink } from '@/lib/whatsapp';

export function NewPromiseForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{
    id: string;
    publicUrl: string;
    publicToken: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/promises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, phone, amount: parseInt(amount), note: note || undefined }),
      });
      const json = await res.json();
      if (\!json.success) {
        setError(json.error || 'Failed to create promise');
        return;
      }
      setCreated(json.data);
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function handleContactPicked(contact: { name: string; phone: string }) {
    setCustomerName(contact.name);
    setPhone(contact.phone);
  }

  function copyLink() {
    if (created?.publicUrl) {
      navigator.clipboard.writeText(created.publicUrl);
    }
  }

  function sendWhatsApp() {
    if (\!created?.publicUrl) return;
    const amt = '₦' + parseInt(amount).toLocaleString('en-NG');
    const msg = `Hi ${customerName}, you have an outstanding payment of ${amt}. Please use this link to pay or set up a payment plan:\n\n${created.publicUrl}`;
    window.open(waLink(phone, msg), '_blank');
  }

  // Success state
  if (created) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h2 className="text-lg font-bold text-slate-900">Promise created\!</h2>
        <p className="mt-2 text-sm text-slate-500">
          Share the link with {customerName} so they can pay or commit to a date.
        </p>

        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <p className="break-all text-xs font-mono text-slate-600">{created.publicUrl}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={copyLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Copy size={14} /> Copy link
          </button>
          <button
            onClick={sendWhatsApp}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Send size={14} /> Send via WhatsApp
          </button>
        </div>

        <button
          onClick={() => router.push('/promises')}
          className="mt-4 text-sm text-brand-600 hover:text-brand-700"
        >
          View all promises
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-slate-700">Customer name</label>
          <ContactPickerButton onContactPicked={handleContactPicked} />
        </div>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Amaka Johnson"
          required
          className="w-full rounded-lg border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 08012345678"
          required
          className="w-full rounded-lg border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount owed (₦)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 50000"
          min={1}
          required
          className="w-full rounded-lg border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Balance from January order"
          maxLength={500}
          rows={2}
          className="w-full rounded-lg border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || \!customerName || \!phone || \!amount}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Creating...' : 'Create & get link'}
      </button>
    </form>
  );
}
