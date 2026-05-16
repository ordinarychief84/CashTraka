'use client';

import { useState } from 'react';
import { Send, Check, AlertCircle, MessageCircle } from 'lucide-react';

/**
 * "Did you send this?" wrapper around any wa.me deep link.  Decision 5 of 5.
 *
 * Behaviour (identical across the four customer touchpoints):
 *
 *   1. Initial state — render the WhatsApp button. If a prior send log
 *      row exists for this (entity, touchpoint), surface "Sent {date}"
 *      above the button (the button stays clickable for re-sends).
 *
 *   2. On click — open the wa.me link in a new tab and IMMEDIATELY swap
 *      the button for an inline two-option confirmation:
 *
 *        "WhatsApp opened. Did you send the message?"
 *        [✓ Yes, sent]   [✗ Not yet]
 *
 *      No timer, no auto-dismiss. Switching back to the CashTraka tab
 *      finds the prompt still visible.
 *
 *   3a. "Yes, sent" → POST /api/whatsapp-sends → on success move to a
 *       lasting "Sent {date}" state.
 *   3b. "Not yet"   → revert to the initial button. Nothing persisted.
 *
 * The wa.me URL itself is unchanged — this is pure UI state on top of
 * what the system already builds server-side.
 */
export type WhatsAppEntityType = 'order' | 'production' | 'invoice' | 'receipt';

export type WhatsAppTouchpointType =
  | 'order_confirmed'
  | 'production_done'
  | 'invoice_issued'
  | 'payment_received';

type Props = {
  /** wa.me URL — already built by the server / whatsapp.util.ts. */
  waLink: string;
  entityType: WhatsAppEntityType;
  entityId: string;
  touchpointType: WhatsAppTouchpointType;
  /** Label inside the green button (e.g. "Send confirmation"). */
  label: string;
  /** ISO timestamp of the most-recent confirmed send, if any. */
  lastSentAt?: string | null;
  /** Optional pill className override for the WhatsApp button. */
  className?: string;
};

type Step = 'idle' | 'confirming' | 'saving' | 'sent' | 'error';

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

export function WhatsAppSendButton({
  waLink,
  entityType,
  entityId,
  touchpointType,
  label,
  lastSentAt,
  className,
}: Props) {
  const [step, setStep] = useState<Step>(lastSentAt ? 'sent' : 'idle');
  const [currentSentAt, setCurrentSentAt] = useState<string | null>(lastSentAt ?? null);
  const [error, setError] = useState<string | null>(null);

  function openLink() {
    if (typeof window !== 'undefined') {
      window.open(waLink, '_blank', 'noopener,noreferrer');
    }
    setError(null);
    setStep('confirming');
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(json?.error || 'Could not record. Try again.');
        setStep('confirming');
        return;
      }
      setCurrentSentAt(json?.data?.sentAt ?? sentAt);
      setStep('sent');
    } catch {
      setError('Network error. Try again.');
      setStep('confirming');
    }
  }

  function notYet() {
    setError(null);
    setStep('idle');
  }

  function resend() {
    // Click on a "sent" state — let owner re-send. Opens the link again
    // and prompts for confirmation. A new sent row is created on Yes.
    openLink();
  }

  const cls =
    className ??
    'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#1fbd5b]';

  /* ── State: sent (with re-send affordance) ──────────────────────── */
  if (step === 'sent' && currentSentAt) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-success-700">
          <Check size={12} />
          Sent {fmtSent(currentSentAt)}
        </div>
        <button type="button" onClick={resend} className={cls}>
          <Send size={14} />
          Re-send
        </button>
      </div>
    );
  }

  /* ── State: confirming / saving ─────────────────────────────────── */
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

  /* ── State: idle ────────────────────────────────────────────────── */
  return (
    <div className="space-y-1.5">
      {currentSentAt ? (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
          <AlertCircle size={12} />
          Not yet sent
        </div>
      ) : null}
      <button type="button" onClick={openLink} className={cls}>
        <Send size={14} />
        {label}
      </button>
    </div>
  );
}
