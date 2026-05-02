'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Banknote, Send } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { waLink } from '@/lib/whatsapp';

/**
 * Quick-pay dialog for logging a payment made to a staff member.
 *
 * Five kinds supported, the copy + defaults nudge owners to pick the right
 * one so the P&L mirrors stay accurate (salary/bonus/commission become
 * Expense rows; advance/reimbursement do not).
 */

type PayKind = 'salary' | 'advance' | 'bonus' | 'commission' | 'reimbursement';

type Props = {
  open: boolean;
  onClose: () => void;
  staff: {
    id: string;
    name: string;
    phone?: string | null;
    payType: string;
    payAmount: number;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountName?: string | null;
  };
};

const KIND_LABELS: Record<PayKind, string> = {
  salary: 'Salary',
  advance: 'Advance',
  bonus: 'Bonus',
  commission: 'Commission',
  reimbursement: 'Reimbursement',
};

const KIND_HELP: Record<PayKind, string> = {
  salary: 'Regular pay for a period. Counts as a business expense.',
  advance: 'Money lent against future salary. Not a business expense.',
  bonus: 'Extra on top of salary. Counts as a business expense.',
  commission: 'Performance-based. Counts as a business expense.',
  reimbursement: 'Paying back out-of-pocket money. Not re-expensed.',
};

export function StaffPayDialog({ open, onClose, staff }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<PayKind>('salary');
  const [amount, setAmount] = useState<string>(
    staff.payType !== 'per_task' ? String(staff.payAmount || '') : '',
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function save(alsoNotify: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error('Enter a valid amount');
      }
      const res = await fetch('/api/staff-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staff.id,
          kind,
          amount: n,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');

      if (alsoNotify && staff.phone) {
        const msg = `Hi ${staff.name}, I have just paid ${formatNaira(n)} as ${KIND_LABELS[kind].toLowerCase()}${note ? ' (' + note + ')' : ''}. Thank you.`;
        window.open(waLink(staff.phone, msg), '_blank');
      }

      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

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
            <Banknote size={18} />
            <span className="text-base font-bold">Pay {staff.name}</span>
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
          <div>
            <label htmlFor="pay-kind" className="label">Payment type</label>
            <select
              id="pay-kind"
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value as PayKind)}
            >
              {(['salary', 'advance', 'bonus', 'commission', 'reimbursement'] as PayKind[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ),
              )}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">{KIND_HELP[kind]}</p>
          </div>
          <div>
            <label htmlFor="pay-amount" className="label">Amount (₦)</label>
            <input
              id="pay-amount"
              type="number"
              inputMode="numeric"
              min={0}
              className="input num text-lg"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="pay-note" className="label">Note (optional)</label>
            <input
              id="pay-note"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. January salary · advance for school fees"
            />
          </div>

          {staff.bankName && staff.bankAccountNumber && (
            <div className="rounded-lg border border-border bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-semibold text-ink">Transfer details</div>
              <div className="mt-0.5">
                {staff.bankName} · {staff.bankAccountNumber} ·{' '}
                {staff.bankAccountName || staff.name}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={() => save(false)}
              className="btn-primary w-full"
            >
              {submitting ? 'Saving…' : 'Log payment'}
            </button>
            {staff.phone && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => save(true)}
                className="btn-secondary w-full"
              >
                <Send size={14} />
                Log &amp; notify on WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
