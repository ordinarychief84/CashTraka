'use client';

import { useState } from 'react';
import { Check, Clock, XCircle, AlertTriangle } from 'lucide-react';

type Props = {
  token: string;
  status: string;
};

export function PayPageClient({ token, status: initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClaim() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pay/${token}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setStatus('claimed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'confirmed') {
    return (
      <div className="rounded-xl bg-success-50 p-4 text-center">
        <Check size={32} className="mx-auto mb-2 text-success-600" />
        <p className="font-semibold text-success-800">Payment Confirmed</p>
        <p className="text-sm text-success-600 mt-1">This payment has been confirmed by the seller. Thank you!</p>
      </div>
    );
  }

  if (status === 'claimed') {
    return (
      <div className="rounded-xl bg-purple-50 p-4 text-center">
        <Clock size={32} className="mx-auto mb-2 text-purple-600" />
        <p className="font-semibold text-purple-800">Payment Claimed</p>
        <p className="text-sm text-purple-600 mt-1">
          You&apos;ve marked this as paid. The seller will confirm shortly.
        </p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-center">
        <AlertTriangle size={32} className="mx-auto mb-2 text-slate-400" />
        <p className="font-semibold text-slate-700">Link Expired</p>
        <p className="text-sm text-slate-500 mt-1">This payment link has expired. Please contact the seller for a new link.</p>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-center">
        <XCircle size={32} className="mx-auto mb-2 text-red-400" />
        <p className="font-semibold text-red-700">Link Cancelled</p>
        <p className="text-sm text-red-500 mt-1">This payment link has been cancelled by the seller.</p>
      </div>
    );
  }

  // Active — pending or viewed
  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <p className="mb-4 text-center text-sm text-slate-500">
        After making payment via bank transfer, tap the button below to notify the seller.
      </p>
      <button
        onClick={handleClaim}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-success-600 py-3.5 text-base font-bold text-white shadow-sm hover:bg-success-700 disabled:opacity-50 transition"
      >
        <Check size={20} />
        {loading ? 'Submitting...' : "I've Paid"}
      </button>
    </div>
  );
}
