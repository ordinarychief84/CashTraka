'use client';

import { useState } from 'react';
import { Send, RefreshCw, Loader2, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

type Props = {
  invoiceId: string;
  initial: {
    firsStatus: string | null;
    firsIrn: string | null;
    firsLastError: string | null;
    firsRetryCount: number;
    firsSubmittedAt: string | null;
    firsAcceptedAt: string | null;
    vatApplied: boolean;
    vatRate: number;
  };
};

const STATUS_TONE: Record<string, { tone: 'ok' | 'warn' | 'err' | 'idle'; label: string }> = {
  ACCEPTED: { tone: 'ok', label: 'Accepted by FIRS' },
  SUBMITTED: { tone: 'warn', label: 'Submitted, awaiting acceptance' },
  PENDING: { tone: 'warn', label: 'Pending' },
  RETRYING: { tone: 'warn', label: 'Retrying' },
  REJECTED: { tone: 'err', label: 'Rejected by FIRS' },
  FAILED: { tone: 'err', label: 'Failed' },
};

/**
 * FIRS compliance panel, shown on every /invoices/[id] page.
 *
 * The buttons drive /api/invoices/[id]/firs/{submit,status,retry}. With the
 * NoopFIRSAdapter (default), Submit will fail clearly with "adapter not
 * configured", that's the expected behaviour until you wire in real FIRS
 * credentials and a real adapter.
 */
export function FirsCompliancePanel({ invoiceId, initial }: Props) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<null | 'submit' | 'status' | 'retry'>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tone = state.firsStatus ? STATUS_TONE[state.firsStatus] : null;

  async function call(action: 'submit' | 'status' | 'retry') {
    setBusy(action);
    setMessage(null);
    try {
      const method = action === 'status' ? 'GET' : 'POST';
      const res = await fetch(`/api/invoices/${invoiceId}/firs/${action}`, { method });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? `Request failed (${res.status})`);
        setBusy(null);
        return;
      }

      // The shape from /firs/submit and /firs/retry: data is the result of
      // the adapter call. /firs/status returns the StatusResult.
      const data = (json.data ?? {}) as Record<string, unknown>;
      if (action !== 'status' && data.ok === false) {
        setMessage(String(data.error ?? 'Submission failed.'));
        setState((s) => ({ ...s, firsStatus: 'FAILED' }));
        setBusy(null);
        return;
      }
      if (data.error) setMessage(String(data.error));

      // Refresh server-side state by re-fetching status, which also persists
      // any update to the Invoice row.
      try {
        const s = await fetch(`/api/invoices/${invoiceId}/firs/status`).then((r) => r.json());
        const status = (s?.data?.status as string | undefined) ?? null;
        const irn = (s?.data?.irn as string | undefined) ?? null;
        if (status) setState((p) => ({ ...p, firsStatus: status }));
        if (irn) setState((p) => ({ ...p, firsIrn: irn }));
      } catch {
        /* non-fatal */
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
        <ShieldCheck size={16} className="text-brand-600" />
        FIRS e-Invoice
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Transmit this tax invoice to the Federal Inland Revenue Service under the Merchant
        Buyer Solution. On acceptance, FIRS returns an IRN + QR code that prints on the PDF.
      </p>

      {/* Status */}
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2">
        {tone?.tone === 'ok' ? (
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success-700" />
        ) : tone?.tone === 'err' ? (
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
        ) : (
          <Clock size={16} className="mt-0.5 shrink-0 text-slate-400" />
        )}
        <div className="text-sm">
          <div className="font-medium text-ink">{tone?.label ?? 'Not submitted'}</div>
          {state.firsIrn ? (
            <div className="mt-0.5 font-mono text-xs text-slate-600">IRN: {state.firsIrn}</div>
          ) : null}
          {state.firsRetryCount > 0 ? (
            <div className="mt-0.5 text-xs text-slate-500">
              Retries: {state.firsRetryCount}
            </div>
          ) : null}
          {state.firsLastError ? (
            <div className="mt-1 text-xs text-red-700">{state.firsLastError}</div>
          ) : null}
        </div>
      </div>

      {/* VAT summary */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
          <div className="text-slate-500">VAT applied</div>
          <div className="mt-0.5 font-semibold text-ink">
            {state.vatApplied ? 'Yes' : 'No'}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
          <div className="text-slate-500">VAT rate</div>
          <div className="mt-0.5 font-semibold text-ink">{state.vatRate}%</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => call('submit')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy === 'submit' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Submit to FIRS
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => call('status')}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500 disabled:opacity-60"
          >
            {busy === 'status' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Refresh status
          </button>
          <button
            type="button"
            onClick={() => call('retry')}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500 disabled:opacity-60"
          >
            {busy === 'retry' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Retry
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {message}
        </div>
      ) : null}
    </div>
  );
}
