'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Send,
  Bell,
  FileMinus,
  Check,
  XCircle,
  Download,
  FileCode,
  Link2,
  Loader2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

type Props = {
  id: string;
  status: string;
  publicToken: string | null;
  hasCustomerEmail: boolean;
  hasCustomerPhone: boolean;
  /** ISO timestamp of the most-recent confirmed WhatsApp send, if any. */
  lastSentAt?: string | null;
};

type Busy =
  | null
  | 'send'
  | 'reminder'
  | 'credit'
  | 'paid'
  | 'cancel'
  | 'copy'
  | 'xml';

/**
 * State-aware action panel for an owner's invoice detail page.
 *
 * Uses browser prompt() / confirm() for the Reminder + Credit Note
 * dialogs as a v1; the buttons themselves call the right APIs and the
 * results are visible in the page (router.refresh()). Polish to a real
 * dialog UI in a follow-up.
 */
export function InvoiceDetailActions({
  id,
  status,
  publicToken,
  hasCustomerEmail,
  hasCustomerPhone,
  lastSentAt,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Decision 5: after /api/invoices/{id}/send returns a waLink we open it
  // AND prompt "Did you send?" — this state carries the post-open prompt.
  const [waConfirm, setWaConfirm] = useState<{
    open: boolean;
    saving: boolean;
    error: string | null;
  }>({ open: false, saving: false, error: null });
  const [sentAtIso, setSentAtIso] = useState<string | null>(lastSentAt ?? null);

  const isTerminal = status === 'CANCELLED' || status === 'CREDITED';
  const isPaid = status === 'PAID';

  async function send() {
    setBusy('send');
    setMessage(null);
    try {
      const channels: ('email' | 'whatsapp')[] = [];
      if (hasCustomerPhone) channels.push('whatsapp');
      channels.push('email');
      const res = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: {
          publicUrl?: string;
          waLink?: string | null;
          email?: { ok: boolean; error?: string } | null;
        };
        error?: string;
      };
      if (!res.ok || !json.data) {
        setMessage(json.error || 'Could not send.');
        return;
      }
      if (json.data.email && !json.data.email.ok) {
        setMessage(`Email: ${json.data.email.error ?? 'failed'}`);
      } else if (json.data.email?.ok) {
        setMessage('Email sent.');
      }
      if (json.data.waLink) {
        window.open(json.data.waLink, '_blank');
        // Decision 5: prompt "Did you send?" — the wa.me link is open in
        // a new tab; until the owner clicks Yes/Not yet the prompt
        // stays visible.
        setWaConfirm({ open: true, saving: false, error: null });
      }
      router.refresh();
    } catch {
      setMessage('Network error.');
    } finally {
      setBusy(null);
    }
  }

  async function confirmWaSent() {
    setWaConfirm((s) => ({ ...s, saving: true, error: null }));
    try {
      const sentAt = new Date().toISOString();
      const res = await fetch('/api/whatsapp-sends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'invoice',
          entityId: id,
          touchpointType: 'invoice_issued',
          sentAt,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { sentAt?: string };
        error?: string;
      };
      if (!res.ok || !json.success) {
        setWaConfirm({ open: true, saving: false, error: json.error || 'Could not record.' });
        return;
      }
      setSentAtIso(json.data?.sentAt ?? sentAt);
      setWaConfirm({ open: false, saving: false, error: null });
    } catch {
      setWaConfirm({ open: true, saving: false, error: 'Network error.' });
    }
  }

  function waNotYet() {
    setWaConfirm({ open: false, saving: false, error: null });
  }

  async function reminder() {
    const typeRaw = window.prompt(
      'Reminder type? F = friendly, O = overdue, X = final',
      'F',
    );
    if (!typeRaw) return;
    const t = typeRaw.trim().toUpperCase();
    const type =
      t.startsWith('O')
        ? 'OVERDUE_NOTICE'
        : t.startsWith('X') || t.startsWith('FI')
          ? 'FINAL_NOTICE'
          : 'FRIENDLY_REMINDER';
    const channelRaw = window.prompt('Channel? E = email, W = WhatsApp', 'E');
    if (!channelRaw) return;
    const channel = channelRaw.trim().toUpperCase().startsWith('W')
      ? 'WHATSAPP'
      : 'EMAIL';

    setBusy('reminder');
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${id}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, channel }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { waLink?: string | null; error?: string | null };
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error || 'Could not send reminder.');
        return;
      }
      if (json.data?.waLink) window.open(json.data.waLink, '_blank');
      setMessage(json.success ? 'Reminder sent.' : json.data?.error || 'Failed.');
      router.refresh();
    } catch {
      setMessage('Network error.');
    } finally {
      setBusy(null);
    }
  }

  async function issueCredit() {
    const amountRaw = window.prompt(
      'Credit amount in NGN (leave blank for full balance):',
      '',
    );
    if (amountRaw === null) return; // cancelled
    const amount = amountRaw.trim() ? Number(amountRaw) : undefined;
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      setMessage('Invalid amount.');
      return;
    }
    const reason = window.prompt('Reason (optional):', '') ?? '';

    setBusy('credit');
    setMessage(null);
    try {
      const res = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: id,
          amount,
          reason: reason.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error || 'Could not issue credit note.');
        return;
      }
      setMessage('Credit note issued.');
      router.refresh();
    } catch {
      setMessage('Network error.');
    } finally {
      setBusy(null);
    }
  }

  async function patchStatus(newStatus: 'PAID' | 'CANCELLED', confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(newStatus === 'PAID' ? 'paid' : 'cancel');
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(j.error || 'Could not update status.');
        return;
      }
      router.refresh();
    } catch {
      setMessage('Network error.');
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!publicToken) {
      setMessage('Send the invoice first to mint a public link.');
      return;
    }
    setBusy('copy');
    try {
      const url = `${window.location.origin}/invoice/${publicToken}`;
      await navigator.clipboard.writeText(url);
      setMessage('Public link copied.');
    } catch {
      setMessage('Could not copy. Long-press to copy from the address bar.');
    } finally {
      setBusy(null);
    }
  }

  const sendLabel = status === 'DRAFT' ? 'Send' : 'Resend';

  return (
    <div className="space-y-2 rounded-xl border border-border bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Actions
      </div>

      {/* Decision 5 — WhatsApp send confirmation state */}
      {sentAtIso && !waConfirm.open ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-success-50 px-2.5 py-1.5 text-[11px] font-semibold text-success-700">
          <Check size={12} />
          Sent via WhatsApp {fmtSent(sentAtIso)}
        </div>
      ) : !sentAtIso && !waConfirm.open && hasCustomerPhone ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
          <AlertCircle size={12} />
          Invoice not sent to customer yet
        </div>
      ) : null}

      {waConfirm.open ? (
        <div className="space-y-1.5 rounded-lg border border-brand-200 bg-brand-50 p-2.5">
          <div className="flex items-start gap-1.5 text-[11px] font-medium text-brand-800">
            <MessageCircle size={12} className="mt-0.5 shrink-0" />
            <span>WhatsApp opened. Did you send the message?</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={confirmWaSent}
              disabled={waConfirm.saving}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-success-700 disabled:opacity-60"
            >
              <Check size={12} />
              {waConfirm.saving ? 'Saving…' : 'Yes, sent'}
            </button>
            <button
              type="button"
              onClick={waNotYet}
              disabled={waConfirm.saving}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Not yet
            </button>
          </div>
          {waConfirm.error ? (
            <div className="flex items-start gap-1 text-[11px] text-rose-700">
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              <span>{waConfirm.error}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <ActionBtn
          icon={busy === 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          label={sendLabel}
          onClick={send}
          disabled={busy !== null || isTerminal}
        />
        <ActionBtn
          icon={busy === 'reminder' ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
          label="Send reminder"
          onClick={reminder}
          disabled={busy !== null || isTerminal || isPaid || (!hasCustomerEmail && !hasCustomerPhone)}
        />
        <ActionBtn
          icon={busy === 'credit' ? <Loader2 size={14} className="animate-spin" /> : <FileMinus size={14} />}
          label="Issue credit note"
          onClick={issueCredit}
          disabled={busy !== null || isTerminal}
        />
        <ActionBtn
          icon={busy === 'paid' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          label="Mark paid"
          onClick={() => patchStatus('PAID', 'Mark this invoice as fully paid?')}
          disabled={busy !== null || isPaid || isTerminal}
        />
        <ActionBtn
          icon={busy === 'cancel' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
          label="Cancel"
          danger
          onClick={() => patchStatus('CANCELLED', 'Cancel this invoice?')}
          disabled={busy !== null || isPaid || isTerminal}
        />
        <ActionBtn
          icon={<FileCode size={14} />}
          label="Download XML"
          onClick={() => window.open(`/api/invoices/${id}/xml`, '_blank')}
          disabled={busy !== null}
        />
        <ActionBtn
          icon={<Download size={14} />}
          label="Download PDF"
          onClick={() => window.open(`/api/invoices/${id}/pdf`, '_blank')}
          disabled={busy !== null}
        />
        <ActionBtn
          icon={busy === 'copy' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          label="Copy public link"
          onClick={copyLink}
          disabled={busy !== null || !publicToken}
        />
      </div>

      {message ? (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}

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

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ' +
        (danger
          ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
          : 'border-border bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50')
      }
    >
      {icon}
      {label}
    </button>
  );
}
