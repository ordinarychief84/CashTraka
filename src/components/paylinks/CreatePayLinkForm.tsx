'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, MessageCircle, User, Phone, DollarSign, FileText, Link2, Mail, Building2 } from 'lucide-react';

type Customer = { id: string; name: string; phone: string };
type DebtItem = { id: string; customerName: string; phone: string; remaining: number };

type Prefill = { name?: string; phone?: string; amount?: string; debtId?: string };

type Props = {
  customers: Customer[];
  debts: DebtItem[];
  prefill?: Prefill;
  defaultBusinessName?: string;
};

export function CreatePayLinkForm({ customers, debts, prefill, defaultBusinessName }: Props) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(prefill?.name || '');
  const [customerPhone, setCustomerPhone] = useState(prefill?.phone || '');
  const [amount, setAmount] = useState(prefill?.amount || '');
  const [description, setDescription] = useState('');
  const [businessName, setBusinessName] = useState(defaultBusinessName || '');
  const [customerId, setCustomerId] = useState('');
  const [debtId, setDebtId] = useState(prefill?.debtId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ token: string; linkNumber: string; id: string } | null>(null);
  const [showCustomers, setShowCustomers] = useState(false);
  const [search, setSearch] = useState('');
  const [customerEmailInput, setCustomerEmailInput] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentOk, setEmailSentOk] = useState(false);
  const [emailErr, setEmailErr] = useState('');

  const filtered = search.length > 0
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
    : customers.slice(0, 10);

  function selectCustomer(c: Customer) {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerId(c.id);
    setShowCustomers(false);
    setSearch('');
  }

  function selectDebt(d: DebtItem) {
    setCustomerName(d.customerName);
    setCustomerPhone(d.phone);
    setAmount(String(d.remaining));
    setDebtId(d.id);
    setDescription('Outstanding balance');
    const match = customers.find((c) => c.phone === d.phone);
    if (match) setCustomerId(match.id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!customerName.trim() || !customerPhone.trim() || !amount || Number(amount) <= 0) {
      setError('Please fill in customer name, phone, and amount');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/paylinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          amount: Number(amount),
          description: description.trim() || undefined,
          customerId: customerId || undefined,
          debtId: debtId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create PayLink');
      }

      const data = await res.json();
      setResult({ token: data.token, linkNumber: data.linkNumber, id: data.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const payUrl = `${appUrl}/pay/${result.token}`;

    let phone = customerPhone.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '234' + phone.slice(1);
    if (!phone.startsWith('+')) phone = '+' + phone;
    phone = phone.replace('+', '');

    const biz = businessName.trim() || 'CashTraka';
    const msg =
      `Hi ${customerName},\n\n` +
      `You have a payment request of ₦${Number(amount).toLocaleString('en-NG')} from ${biz}.\n` +
      (description ? `For: ${description}\n` : '') +
      `\nPay here: ${payUrl}\n\n— Sent via CashTraka`;
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-100">
          <Send size={24} className="text-success-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">PayLink Created!</h2>
        <p className="text-sm text-slate-500 mb-4">{result.linkNumber}</p>

        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500 mb-1">Share this link:</p>
          <p className="text-sm font-mono text-slate-700 break-all">{payUrl}</p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-success-600 px-4 py-3 text-sm font-semibold text-white hover:bg-success-700"
          >
            <MessageCircle size={18} />
            Send via WhatsApp
          </a>

          {/* Send via Email */}
          {!emailSentOk ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={customerEmailInput}
                  onChange={(e) => { setCustomerEmailInput(e.target.value); setEmailErr(''); }}
                  placeholder="Customer email address"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 focus:outline-none"
                />
                <button
                  onClick={async () => {
                    if (!customerEmailInput || !customerEmailInput.includes('@')) {
                      setEmailErr('Enter a valid email');
                      return;
                    }
                    setEmailSending(true);
                    setEmailErr('');
                    try {
                      const res = await fetch(`/api/paylinks/${result.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'email_sent', customerEmail: customerEmailInput }),
                      });
                      if (res.ok) {
                        setEmailSentOk(true);
                      } else {
                        const d = await res.json().catch(() => ({}));
                        setEmailErr(d.error || 'Failed to send');
                      }
                    } catch {
                      setEmailErr('Network error');
                    } finally {
                      setEmailSending(false);
                    }
                  }}
                  disabled={emailSending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <Mail size={16} />
                  {emailSending ? 'Sending...' : 'Email'}
                </button>
              </div>
              {emailErr && <p className="text-xs text-red-500 text-center">{emailErr}</p>}
            </div>
          ) : (
            <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-700">
              <Mail size={16} />
              Email sent successfully!
            </div>
          )}

          <button
            onClick={() => { navigator.clipboard.writeText(payUrl); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Link2 size={18} />
            Copy Link
          </button>
          <button
            onClick={() => router.push('/paylinks')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Back to PayLinks
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {debts.length > 0 && (
        <div className="rounded-xl border bg-owed-50 p-4">
          <p className="text-xs font-semibold text-owed-700 mb-2">Quick: Create from outstanding debt</p>
          <div className="flex flex-wrap gap-2">
            {debts.slice(0, 5).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => selectDebt(d)}
                className="rounded-lg border border-owed-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-owed-100"
              >
                {d.customerName} · ₦{d.remaining.toLocaleString('en-NG')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          <User size={14} className="inline mr-1" />
          Customer Name
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => {
            setCustomerName(e.target.value);
            setSearch(e.target.value);
            setShowCustomers(true);
            setCustomerId('');
          }}
          onFocus={() => setShowCustomers(true)}
          placeholder="Type to search or enter new name"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500"
          required
        />
        {showCustomers && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCustomer(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-slate-400">{c.phone}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          <Phone size={14} className="inline mr-1" />
          Phone Number
        </label>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="08012345678"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          <DollarSign size={14} className="inline mr-1" />
          Amount (₦)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="5000"
          min="1"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          <FileText size={14} className="inline mr-1" />
          Description (optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Balance for shoes order"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          <Building2 size={14} className="inline mr-1" />
          Business Name (optional)
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. My Store Name"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-success-600 py-3 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
      >
        <Send size={16} />
        {loading ? 'Creating...' : 'Create PayLink'}
      </button>
    </form>
  );
}
