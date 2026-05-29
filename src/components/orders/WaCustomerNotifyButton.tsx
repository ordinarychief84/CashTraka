'use client';

import { useState } from 'react';
import {
  Send,
  Check,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

/**
 * "Send WhatsApp notification" button for the order detail page and the
 * production detail page (Decision 5 of 5).
 *
 * Unlike receipts/invoices the wa.me URL isn't known at render time — it
 * has to be minted by POSTing to /api/customer-orders/[id]/notify with
 * the right `kind`. So this is a special variant of WhatsAppSendButton
 * that fetches the link on click, opens it, and then prompts "Did you
 * send?" the same way.
 *
 * The receipt/invoice variant lives in WhatsAppSendButton.tsx and takes
 * a pre-built waLink. They share the same UI vocabulary intentionally.
 */
type Kind = 'CONFIRMATION' | 'READY';

type Props = {
  customerOrderId: string;
  kind: Kind;
  /** ProductionOrder id when kind=READY, CustomerOrder id when CONFIRMATION. */
  entityId: string;
  entityType: 'order' | 'production';
  touchpointType: 'order_confirmed' | 'production_done';
  label: string;
  lastSentAt?: string | null;
};

type Step = 'idle' | 'fetching' | 'confirming' | 'saving' | 'sent';

function fmtSent(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function WaCustomerNotifyButton({
  customerOrderId,
  kind,
  entityId,
  entityType,
  touchpointType,
  label,
  lastSentAt,
}: Props) {
  const [step, setStep] = useState<Step>(lastSentAt ? 'sent' : 'idle');
  const [currentSentAt, setCurrentSentAt] = useState<string | null>(lastSentAt ?? null);
  const [error, setError] = useState<string | null>(null);

  async function openLink() {
    setStep('fetching');
    setError(null);
    try {
      const res = await fetch(`/api/customer-orders/${customerOrderId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { whatsappLink?: string | null };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data?.whatsappLink) {
        setError(json.error || 'No WhatsApp number on this customer.');
        setStep(currentSentAt ? 'sent' : 'idle');
        return;
      }
      if (typeof window !== 'undefined') {
        window.open(json.data.whatsappLink, '_blank', 'noopener,noreferrer');
      }
      setStep('confirming');
    } catch {
      setError('Network error. Try again.');
      setStep(currentSentAt ? 'sent' : 'idle');
    }
  }

  async function confirmSent() {
    setStep('saving');
    setError(null);
    try {
      const sentAt = new Date().toISOString();
      const res = await fetch('/api/whatsapp-sends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, touchpointType, sentAt }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { sentAt?: string };
        error?: string;
      };
      if (!res.ok || !json.success) {
        setError(json.error || 'Could not record. Try again.');
        setStep('confirming');
        return;
      }
      setCurrentSentAt(json.data?.sentAt ?? sentAt);
      setStep('sent');
    } catch {
      setError('Network error. Try again.');
      setStep('confirming');
    }
  }

  function notYet() {
    setError(null);
    setStep(currentSentAt ? 'sent' : 'idle');
  }

  const greenCls =
    'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#1fbd5b] disabled:opacity-60';

  if (step === 'sent' && currentSentAt) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-success-700">
          <Check size={12} />
          Sent {fmtSent(currentSentAt)}
        </div>
        <button type="button" onClick={openLink} className={greenCls}>
          <Send size={14} />
          Re-send
        </button>
        {error && (
          <div className="flex items-start gap-1 text-[11px] text-rose-700">
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  if (step === 'confirming' || step === 'saving') {
    return (
      <div className="space-y-1.5 rounded-lg border border-brand-200 bg-brand-50 p-2.5">
        <div className="flex items-start gap-1.5 text-[11px] font-medium text-brand-800">
          <MessageCircle size={12} className="mt-0.5 shrink-0" />
          <span>WhatsApp opened. Did you send the message?</span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={confirmSent}
            disabled={step === 'saving'}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-success-700 disabled:opacity-60"
          >
            <Check size={12} />
            {step === 'saving' ? 'Saving…' : 'Yes, sent'}
          </button>
          <button
            type="button"
            onClick={notYet}
            disabled={step === 'saving'}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Not yet
          </button>
        </div>
        {error && (
          <div className="flex items-start gap-1 text-[11px] text-rose-700">
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-owed-700">
        <AlertCircle size={12} />
        Customer not yet notified
      </div>
      <button
        type="button"
        onClick={openLink}
        disabled={step === 'fetching'}
        className={greenCls}
      >
        <Send size={14} />
        {step === 'fetching' ? 'Opening WhatsApp…' : label}
      </button>
      {error && (
        <div className="flex items-start gap-1 text-[11px] text-rose-700">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
