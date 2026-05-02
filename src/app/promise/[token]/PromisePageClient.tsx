'use client';

/**
 * Public Promise to Pay Page, CashTraka
 *
 * Debtors see this page. They can:
 *   - Pay now (full remaining amount)
 *   - Pay part now (custom amount)
 *   - Promise to pay on a date
 *
 * Payment is initialized via provider checkout. Actual confirmation
 * happens server-side via webhook, NOT via callback redirect.
 */

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronRight,
  Shield,
} from 'lucide-react';

type PromiseData = {
  id: string;
  customerName: string;
  originalAmount: number;
  remainingAmount: number;
  status: string;
  note: string | null;
  publicToken: string;
  commitments: any[];
  payments: { amount: number; status: string; paidAt: string | null }[];
  business: {
    name: string;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    logoUrl: string | null;
  };
  createdAt: string;
};

type ViewState =
  | 'loading'
  | 'open'
  | 'pay_now'
  | 'pay_part'
  | 'promise_date'
  | 'processing'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'promise_recorded'
  | 'paid'
  | 'broken'
  | 'cancelled'
  | 'expired'
  | 'error';

function formatNaira(n: number) {
  return '₦' + n.toLocaleString('en-NG');
}

export function PromisePageClient({ token }: { token: string }) {
  const [data, setData] = useState<PromiseData | null>(null);
  const [view, setView] = useState<ViewState>('loading');
  const [error, setError] = useState('');

  // Pay form state
  const [payAmount, setPayAmount] = useState('');
  const [email, setEmail] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if redirected from payment
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const paymentPending = urlParams?.get('payment') === 'pending';

  useEffect(() => {
    fetchPromise();
  }, [token]);

  async function fetchPromise() {
    try {
      const res = await fetch(`/api/promises/public/${token}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Link not found');
        setView('error');
        return;
      }
      setData(json.data);
      const status = json.data.status;
      if (status === 'PAID') setView('paid');
      else if (status === 'CANCELLED') setView('cancelled');
      else if (status === 'EXPIRED') setView('expired');
      else if (status === 'BROKEN') setView('broken');
      else if (paymentPending) setView('payment_pending');
      else setView('open');
    } catch {
      setError('Failed to load payment details');
      setView('error');
    }
  }

  async function handlePayNow() {
    if (!data || !email) return;
    setSubmitting(true);
    try {
      // Record commitment
      await fetch(`/api/promises/public/${token}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitmentType: 'PAY_NOW', amount: data.remainingAmount, email }),
      });

      // Initialize payment
      const res = await fetch(`/api/promises/${data.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: data.remainingAmount, email }),
      });
      const json = await res.json();
      if (json.success && json.data.authorizationUrl) {
        window.location.href = json.data.authorizationUrl;
      } else {
        setError(json.error || 'Failed to initialize payment');
        setView('error');
      }
    } catch {
      setError('Something went wrong');
      setView('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayPart() {
    if (!data || !email || !payAmount) return;
    const amount = parseInt(payAmount, 10);
    if (isNaN(amount) || amount <= 0 || amount > data.remainingAmount) {
      setError('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`/api/promises/public/${token}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitmentType: 'PAY_PART', amount, email }),
      });

      const res = await fetch(`/api/promises/${data.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, email }),
      });
      const json = await res.json();
      if (json.success && json.data.authorizationUrl) {
        window.location.href = json.data.authorizationUrl;
      } else {
        setError(json.error || 'Failed to initialize payment');
        setView('error');
      }
    } catch {
      setError('Something went wrong');
      setView('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromiseDate() {
    if (!promiseDate) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/promises/public/${token}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentType: 'PAY_ON_DATE',
          promisedDate: promiseDate,
          message: message || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setView('promise_recorded');
      } else {
        setError(json.error || 'Failed to record promise');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  // Minimum promise date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (view === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-6 text-center">
        {data.business.logoUrl && (
          <img src={data.business.logoUrl} alt="" className="mx-auto mb-3 h-12 w-12 rounded-full object-cover" />
        )}
        <h1 className="text-lg font-bold text-slate-900">{data.business.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Payment request</p>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 p-4">
        {/* Amount card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            {view === 'paid' ? 'Paid' : 'Amount due'}
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {formatNaira(data.remainingAmount)}
          </p>
          {totalPaid > 0 && (
            <p className="mt-1 text-xs text-green-600">
              {formatNaira(totalPaid)} already paid of {formatNaira(data.originalAmount)}
            </p>
          )}
          {data.note && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{data.note}</p>
          )}
        </div>

        {/* Status-specific views */}
        {view === 'paid' && (
          <div className="mt-6 rounded-2xl bg-green-50 p-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <h2 className="text-lg font-bold text-green-800">Payment confirmed</h2>
            <p className="mt-1 text-sm text-green-600">Thank you for your payment!</p>
          </div>
        )}

        {view === 'payment_pending' && (
          <div className="mt-6 rounded-2xl bg-amber-50 p-6 text-center">
            <Clock className="mx-auto mb-3 h-12 w-12 text-amber-500" />
            <h2 className="text-lg font-bold text-amber-800">Payment being confirmed</h2>
            <p className="mt-1 text-sm text-amber-600">
              Your payment is being verified. This usually takes a few seconds.
              You&apos;ll receive confirmation shortly.
            </p>
            <button
              onClick={fetchPromise}
              className="mt-4 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200"
            >
              Refresh status
            </button>
          </div>
        )}

        {view === 'payment_confirmed' && (
          <div className="mt-6 rounded-2xl bg-green-50 p-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <h2 className="text-lg font-bold text-green-800">Payment confirmed!</h2>
            <p className="mt-1 text-sm text-green-600">Your payment has been verified and recorded.</p>
          </div>
        )}

        {view === 'promise_recorded' && (
          <div className="mt-6 rounded-2xl bg-blue-50 p-6 text-center">
            <Calendar className="mx-auto mb-3 h-12 w-12 text-blue-500" />
            <h2 className="text-lg font-bold text-blue-800">Promise recorded</h2>
            <p className="mt-1 text-sm text-blue-600">
              Your commitment to pay on {new Date(promiseDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} has been noted.
            </p>
          </div>
        )}

        {view === 'broken' && (
          <div className="mt-6 rounded-2xl bg-red-50 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-red-400" />
            <h2 className="text-lg font-bold text-red-800">Promise overdue</h2>
            <p className="mt-1 text-sm text-red-600">
              The promised payment date has passed. Please make payment as soon as possible.
            </p>
            <button
              onClick={() => setView('open')}
              className="mt-4 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              Pay now
            </button>
          </div>
        )}

        {(view === 'cancelled' || view === 'expired') && (
          <div className="mt-6 rounded-2xl bg-slate-100 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-700">
              {view === 'cancelled' ? 'Request cancelled' : 'Link expired'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This payment link is no longer active. Contact {data.business.name} for assistance.
            </p>
          </div>
        )}

        {/* Action buttons, open state */}
        {view === 'open' && (
          <div className="mt-6 space-y-3">
            <button
              onClick={() => setView('pay_now')}
              className="flex w-full items-center justify-between rounded-2xl bg-green-600 px-5 py-4 text-left text-white shadow-sm hover:bg-green-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard size={20} />
                <div>
                  <p className="font-semibold">Pay now</p>
                  <p className="text-xs text-green-100">Pay {formatNaira(data.remainingAmount)} instantly</p>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            {data.remainingAmount > 1000 && (
              <button
                onClick={() => setView('pay_part')}
                className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left shadow-sm hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-brand-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Pay part now</p>
                    <p className="text-xs text-slate-500">Make a partial payment</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            )}

            <button
              onClick={() => setView('promise_date')}
              className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left shadow-sm hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-blue-600" />
                <div>
                  <p className="font-semibold text-slate-900">Promise to pay later</p>
                  <p className="text-xs text-slate-500">Commit to a future date</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          </div>
        )}

        {/* Pay Now form */}
        {view === 'pay_now' && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Pay {formatNaira(data.remainingAmount)}</h2>
            <p className="mt-1 text-xs text-slate-500">Enter your email to receive a receipt</p>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-4 w-full rounded-lg border px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setView('open'); setError(''); }}
                className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handlePayNow}
                disabled={!email || submitting}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Pay now'}
              </button>
            </div>
          </div>
        )}

        {/* Pay Part form */}
        {view === 'pay_part' && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Partial payment</h2>
            <p className="mt-1 text-xs text-slate-500">
              Remaining: {formatNaira(data.remainingAmount)}
            </p>
            <input
              type="number"
              placeholder="Amount to pay"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              min={100}
              max={data.remainingAmount}
              className="mt-4 w-full rounded-lg border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-3 w-full rounded-lg border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setView('open'); setError(''); }}
                className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handlePayPart}
                disabled={!email || !payAmount || submitting}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Pay'}
              </button>
            </div>
          </div>
        )}

        {/* Promise Date form */}
        {view === 'promise_date' && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Promise to pay</h2>
            <p className="mt-1 text-xs text-slate-500">Choose a date when you will make payment</p>
            <input
              type="date"
              value={promiseDate}
              onChange={(e) => setPromiseDate(e.target.value)}
              min={minDate}
              className="mt-4 w-full rounded-lg border px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <textarea
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={2}
              className="mt-3 w-full rounded-lg border px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setView('open'); setError(''); }}
                className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handlePromiseDate}
                disabled={!promiseDate || submitting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm promise'}
              </button>
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3">
          <Shield size={14} className="shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-500">
            Payments are processed securely. CashTraka does not store your card details.
          </p>
        </div>
      </div>
    </div>
  );
}
