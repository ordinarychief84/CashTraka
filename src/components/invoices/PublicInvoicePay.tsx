'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

type Props = {
  invoiceId: string;
  token: string;
  outstanding: number;
  accentColor: string;
  /// Foreground color picked by the server based on accent luminance.
  /// Defaults to white for backwards compatibility.
  accentFg?: string;
};

/**
 * Pay button on the public invoice page. Calls /api/invoices/[id]/pay,
 * gets back a Paystack hosted-checkout URL, and bounces the customer
 * there. The webhook handler at /api/webhooks/paystack picks up
 * charge.success and reconciles Invoice.amountPaid + status.
 *
 * Public, no-auth - the publicToken is the only thing that gates the
 * call.
 */
export function PublicInvoicePay({
  invoiceId,
  token,
  outstanding,
  accentColor,
  accentFg = '#ffffff',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { authorizationUrl?: string };
        error?: string;
      };
      if (!res.ok || !json.data?.authorizationUrl) {
        setErr(json.error || 'Could not start payment. Please try again.');
        setBusy(false);
        return;
      }
      window.location.href = json.data.authorizationUrl;
    } catch {
      setErr('Network error. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={busy || outstanding <= 0}
        style={{ background: accentColor, color: accentFg }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <CreditCard size={16} />
        )}
        Pay now
      </button>
      {err ? (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </div>
      ) : null}
      <p className="mt-2 text-center text-[11px] text-slate-500">
        Secure payment powered by Paystack
      </p>
    </div>
  );
}
