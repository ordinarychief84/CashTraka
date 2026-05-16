'use client';

import { useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { waLink } from '@/lib/whatsapp';
import { WhatsAppSendButton } from '@/components/whatsapp/WhatsAppSendButton';

type Props = {
  phone: string;
  customerName: string;
  receiptId: string;
  amount: number;
  businessName: string;
  /** ISO timestamp of the most-recent confirmed WhatsApp send, if any. */
  lastSentAt?: string | null;
};

/**
 * Receipt action bar, hidden on print, visible in browser.
 *
 * - "Download PDF" downloads a server-rendered PDF (react-pdf), works the
 *   same on every browser, doesn't rely on the user's print-to-PDF flow.
 * - "Share on WhatsApp" delegates to <WhatsAppSendButton> (Decision 5)
 *   which opens the wa.me link AND prompts "Did you send?" after the link
 *   opens. The wa.me URL itself is unchanged.
 * - "Print" opens the browser print dialog for users with real printers.
 */
export function ReceiptActions({
  phone,
  customerName,
  receiptId,
  amount,
  businessName,
  lastSentAt,
}: Props) {
  const waUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = `${window.location.origin}/r/${receiptId}`;
    const msg = `Hi ${customerName}, here is your receipt from ${businessName} for ₦${amount.toLocaleString(
      'en-NG',
    )}: ${url}\nThank you!`;
    return waLink(phone, msg);
  }, [phone, customerName, receiptId, amount, businessName]);

  function downloadPdf() {
    if (typeof window === 'undefined') return;
    const a = document.createElement('a');
    a.href = `/api/receipts/${receiptId}`;
    a.download = `receipt-${receiptId.slice(-8).toUpperCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function printPdf() {
    if (typeof window !== 'undefined') window.print();
  }

  return (
    <div className="no-print mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
      <button
        type="button"
        onClick={downloadPdf}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:bg-brand-50"
      >
        <Download size={14} />
        Download PDF
      </button>
      <WhatsAppSendButton
        waLink={waUrl}
        entityType="receipt"
        entityId={receiptId}
        touchpointType="payment_received"
        label="Share on WhatsApp"
        lastSentAt={lastSentAt}
      />
      <button
        type="button"
        onClick={printPdf}
        className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:bg-brand-50 md:col-span-1"
      >
        <Printer size={14} />
        Print
      </button>
    </div>
  );
}
