'use client';

import { useEffect, useState } from 'react';
import {
  X,
  ReceiptText as ReceiptIcon,
  Download,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { waLink } from '@/lib/whatsapp';
import { formatNaira, formatDate } from '@/lib/format';

/**
 * Receipt-generation dialog.
 *
 * Flow:
 *   1. Preview the payment the receipt will capture (items, totals, date).
 *      Owner can catch a typo *before* it becomes a customer-facing PDF.
 *   2. Click "Generate receipt" → POST /api/receipts/generate.
 *   3. On success we show the receipt number and three actions:
 *        - Send on WhatsApp (opens prefilled wa.me)
 *        - View online (opens /r/[paymentId])
 *        - Download PDF
 *
 * The service is idempotent, so clicking Generate twice is safe — it will
 * return the existing receipt for this payment.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  payment: {
    id: string;
    amount: number;
    status: 'PAID' | 'PENDING';
    createdAt: string | Date;
    customerName: string;
    phone?: string | null;
  };
  businessName: string;
};

type GenerateResult = {
  id: string;
  receiptNumber: string;
  pdfUrl: string | null;
  status: string;
};

export function ReceiptDialog({ open, onClose, payment, businessName }: Props) {
  const [stage, setStage] = useState<'preview' | 'success' | 'error'>('preview');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever the dialog reopens.
  useEffect(() => {
    if (open) {
      setStage('preview');
      setResult(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/receipts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not generate receipt');
      }
      setResult(data.data as GenerateResult);
      setStage('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStage('error');
    } finally {
      setLoading(false);
    }
  }

  function shareOnWa() {
    if (!payment.phone) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/r/${payment.id}`;
    const msg = `Hi ${payment.customerName}, here is your receipt from ${businessName} for ${formatNaira(payment.amount)} (${
      result?.receiptNumber ?? 'Receipt'
    }): ${url}\nThank you!`;
    window.open(waLink(payment.phone, msg), '_blank');
  }

  function viewOnline() {
    if (typeof window === 'undefined') return;
    window.open(`/r/${payment.id}`, '_blank');
  }

  function downloadPdf() {
    if (typeof window === 'undefined' || !result) return;
    const a = document.createElement('a');
    a.href = `/api/receipts/${result.id}`;
    a.download = `${result.receiptNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const createdDate =
    typeof payment.createdAt === 'string'
      ? new Date(payment.createdAt)
      : payment.createdAt;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md overflow-hidden rounded-t-2xl p-0 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-brand-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <ReceiptIcon size={18} />
            <span className="text-base font-bold">
              {stage === 'success' ? 'Receipt ready' : 'Generate receipt'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {stage === 'preview' && (
            <>
              {/* Payment preview */}
              <div className="rounded-xl border border-border bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Payment preview
                  </div>
                  {payment.status === 'PAID' ? (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      PAID
                    </span>
                  ) : (
                    <span className="rounded-full bg-owed-50 px-2 py-0.5 text-[10px] font-bold text-owed-700">
                      PENDING
                    </span>
                  )}
                </div>
                <div className="mt-3 text-lg font-bold text-ink">
                  {payment.customerName}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {payment.phone || 'No phone on file'} ·{' '}
                  {formatDate(createdDate)}
                </div>
                <div className="mt-3 flex items-baseline gap-2 border-t border-slate-200 pt-3">
                  <span className="text-xs text-slate-500">Amount</span>
                  <span className="num text-xl font-bold text-ink">
                    {formatNaira(payment.amount)}
                  </span>
                </div>
              </div>

              {payment.status === 'PENDING' && (
                <div className="flex items-start gap-2 rounded-lg border border-owed-200 bg-owed-50 px-3 py-2 text-xs text-owed-700">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <div>
                    This payment is still <strong>pending</strong>. The receipt will
                    say so too. Usually you want to mark it paid first.
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={generate}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  <Sparkles size={16} />
                  {loading ? 'Generating…' : 'Generate receipt'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {stage === 'success' && result && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <CheckCircle2 size={28} className="shrink-0 text-brand-600" />
                <div>
                  <div className="text-sm font-bold text-ink">Receipt generated</div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    <span className="font-mono font-semibold">
                      {result.receiptNumber}
                    </span>{' '}
                    for {payment.customerName}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {payment.phone && (
                  <button
                    type="button"
                    onClick={shareOnWa}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#1fbd5b]"
                  >
                    <Send size={16} />
                    Send on WhatsApp to {payment.customerName}
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={viewOnline}
                    className="btn-secondary"
                  >
                    <Eye size={14} />
                    View online
                  </button>
                  <button
                    type="button"
                    onClick={downloadPdf}
                    className="btn-secondary"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-ink"
                >
                  Done
                </button>
              </div>
            </>
          )}

          {stage === 'error' && (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <div className="text-sm font-bold text-red-700">
                    Could not generate receipt
                  </div>
                  <div className="mt-0.5 text-xs text-red-700">{error}</div>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStage('preview')}
                  className="btn-primary w-full"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-ink"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )