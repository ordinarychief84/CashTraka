'use client';

import { Download, Share2, Printer } from 'lucide-react';
import { waLink } from '@/lib/whatsapp';

type Props = {
  phone: string;
  customerName: string;
  receiptId: string;
  amount: number;
  businessName: string;
};

/**
 * Receipt action bar — hidden on print, visible in browser.
 *
 * - "Download PDF" downloads a server-rendered PDF (react-pdf) — works the same
 *   on every browser, doesn't rely on the user's print-to-PDF flow.
 * - "Share on WhatsApp" opens a wa.me link with the receipt URL prefilled.
 * - "Print" opens the browser print dialog for users with real printers.
 */
export function ReceiptActions({
  phone,
  customerName,
  receiptId,
  amount,
  businessName,
}: Props) {
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

  function shareWa() {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/r/${receiptId}`;
    const msg = `Hi ${customerName}, here is your receipt from ${businessName} for ₦${amount.toLocaleString(
      'en-NG',
    )}: ${url}\nThank you!`;
    window.open(waLink(phone, msg), '_blank');
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
      <button
        type="button"
        onClick={shareWa}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#1fbd5b]"
      >
        <Share2 size={14} />
        Share on WhatsApp
      </button>
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
