'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { waLink, reminderMessage } from '@/lib/whatsapp';

type Props = {
  scheduleId: string;
  name: string;
  phone: string;
  amount: number;
};

export function ReminderActions({ scheduleId, name, phone, amount }: Props) {
  const router = useRouter();

  async function sendAndMark() {
    // Open WhatsApp with prefilled reminder
    const href = waLink(phone, reminderMessage(name, amount));
    window.open(href, '_blank');

    // Mark as sent so nextDueAt advances
    await fetch('/api/reminders/mark-sent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: scheduleId }),
    });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sendAndMark}
      className="btn-wa shrink-0 px-3 py-2 text-xs"
    >
      <MessageCircle size={14} />
      Send reminder
    </button>
  );
}
