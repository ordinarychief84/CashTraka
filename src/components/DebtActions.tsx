'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Check, Pencil, Trash2, RotateCcw, Banknote, Bell } from 'lucide-react';
import { waLink, reminderMessage } from '@/lib/whatsapp';
import { RowMenu, type RowMenuAction } from './RowMenu';
import { PartialPaymentDialog } from './PartialPaymentDialog';

type Props = {
  id: string;
  name: string;
  phone: string;
  amountOwed: number;
  amountPaid: number;
  status: 'OPEN' | 'PAID';
};

export function DebtActions({ id, name, phone, amountOwed, amountPaid, status }: Props) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const remaining = Math.max(amountOwed - amountPaid, 0);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/debts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    router.refresh();
    return data;
  }

  async function markPaidAndOfferReceipt() {
    const data = await patch({ status: 'PAID' });
    if (data?.receiptUrl && typeof window !== 'undefined') {
      const origin = window.location.origin;
      const fullUrl = `${origin}${data.receiptUrl}`;
      const msg = `Hi ${name}, your payment has been confirmed. Here is your receipt: ${fullUrl}\nThank you!`;
      const send = confirm(
        `Debt marked as paid. Send a receipt to ${name} via WhatsApp now?`,
      );
      if (send) {
        window.open(waLink(phone, msg), '_blank');
      }
    }
  }

  const actions: RowMenuAction[] = [];
  if (status === 'OPEN') {
    actions.push({
      label: 'Record payment',
      icon: <Banknote size={16} />,
      onClick: () => setPayOpen(true),
    });
    actions.push({
      label: 'Mark all paid',
      icon: <Check size={16} />,
      onClick: markPaidAndOfferReceipt,
    });
    actions.push({
      label: 'Set auto-reminder',
      icon: <Bell size={16} />,
      onClick: async () => {
        const freq = prompt(
          'How often? Type: daily, every_3_days, or weekly',
          'weekly',
        );
        if (!freq) return;
        await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ debtId: id, frequency: freq }),
        });
        router.refresh();
        alert('Reminder set. Check the Reminders page for your schedule.');
      },
    });
  } else {
    actions.push({
      label: 'Reopen debt',
      icon: <RotateCcw size={16} />,
      onClick: () => patch({ status: 'OPEN' }),
    });
  }
  actions.push({
    label: 'Edit',
    icon: <Pencil size={16} />,
    onClick: () => router.push(`/debts/${id}/edit`),
  });
  actions.push({
    label: 'Delete',
    icon: <Trash2 size={16} />,
    danger: true,
    onClick: async () => {
      if (!confirm('Delete this debt? This cannot be undone.')) return;
      await fetch(`/api/debts/${id}`, { method: 'DELETE' });
      router.refresh();
    },
  });

  return (
    <>
      <div className="flex items-center gap-2">
        {status === 'OPEN' && (
          <>
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="btn-secondary px-3 py-2 text-xs"
            >
              <Banknote size={14} />
              Record payment
            </button>
            <a
              href={waLink(phone, reminderMessage(name, remaining || amountOwed))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-wa px-3 py-2 text-xs"
            >
              <MessageCircle size={14} />
              Remind
            </a>
          </>
        )}
        <RowMenu actions={actions} />
      </div>
      <PartialPaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        debt={{ id, customerName: name, amountOwed, amountPaid }}
      />
    </>
  )