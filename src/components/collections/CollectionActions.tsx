'use client';

import { useState } from 'react';
import { MessageCircle, Send, Check, Phone } from 'lucide-react';
import type { CollectionItem } from '@/lib/services/collection.service';

type Props = {
  item: CollectionItem;
  businessName: string;
};

function buildWhatsAppLink(phone: string, name: string, amount: number, businessName: string): string {
  let normalized = phone.replace(/\s+/g, '');
  if (normalized.startsWith('0')) normalized = '234' + normalized.slice(1);
  if (!normalized.startsWith('+')) normalized = '+' + normalized;
  normalized = normalized.replace('+', '');

  const msg =
    `Hi ${name}, this is a reminder about your outstanding balance of ₦${amount.toLocaleString('en-NG')} with ${businessName}. ` +
    `Please make payment at your earliest convenience. Thank you!`;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
}

export function CollectionActions({ item, businessName }: Props) {
  const [confirming, setConfirming] = useState(false);

  async function confirmPaylink() {
    if (!item.paylinkToken) return;
    setConfirming(true);
    try {
      await fetch(`/api/paylinks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      });
      window.location.reload();
    } finally {
      setConfirming(false);
    }
  }

  const waLink = buildWhatsAppLink(item.customerPhone, item.customerName, item.remaining, businessName);

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      {/* Confirm claimed paylink */}
      {item.type === 'paylink' && item.status === 'claimed' && (
        <button
          onClick={confirmPaylink}
          disabled={confirming}
          className="flex h-8 items-center gap-1 rounded-lg bg-success-600 px-3 text-xs font-semibold text-white hover:bg-success-700 disabled:opacity-50"
        >
          <Check size={14} />
          Confirm
        </button>
      )}

      {/* Send PayLink (for debts without one) */}
      {item.type === 'debt' && (
        <a
          href={`/paylinks/new?name=${encodeURIComponent(item.customerName)}&phone=${encodeURIComponent(item.customerPhone)}&amount=${item.remaining}${item.debtId ? `&debtId=${item.debtId}` : ''}`}
          className="flex h-8 items-center gap-1 rounded-lg bg-success-600 px-3 text-xs font-semibold text-white hover:bg-success-700"
        >
          <Send size={14} />
          PayLink
        </a>
      )}

      {/* View promise details, stay in collections context */}
      {item.type === 'promise' && item.promiseToken && (
        <a
          href={`/collections?highlight=${item.id}`}
          className="flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Send size={14} />
          View
        </a>
      )}

      {/* WhatsApp reminder */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 items-center gap-1 rounded-lg border border-success-200 bg-success-50 px-3 text-xs font-semibold text-success-700 hover:bg-success-100"
      >
        <MessageCircle size={14} />
        WhatsApp
      </a>
    </div>
  );
}
