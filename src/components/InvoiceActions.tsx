'use client';

import { Download, Share2, Printer } from 'lucide-react';
import { waLink } from '@/lib/whatsapp';

type Props = {
  phone: string;
  customerName: string;
  invoiceNumber: string;
  total: number;
  businessName: string;
};

export function InvoiceActions({ phone, customerName, invoiceNumber, total, businessName }: Props) {
  function downloadPdf() {
    if (typeof window === 'undefined') return;
    const a = document.createElement('a');
    a.href = `/api/invoices/${invoiceNumber}/pdf`;
    a.download = `invoice-${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  function printPdf() {
    if (typeof window !== 'undefined') window.print();
  }

  function shareWa() {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/invoice/${invoiceNumber}`;
    const msg = `Hi ${customerName}, here is your invoice (${invoiceNumber}) from ${businessName} for ₦${total.toLocaleString(
      'en-NG',
    )}: ${url}\nKindly pay at your earliest convenience. Thank you!`;
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
