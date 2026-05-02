'use client';

import { useState } from 'react';
import { Download, Share2, Printer, Loader2 } from 'lucide-react';

type Props = {
  id: string;
  phone: string;
  customerName: string;
  invoiceNumber: string;
  publicToken: string | null;
  total: number;
  businessName: string;
};

export function InvoiceActions({ id, publicToken }: Props) {
  const [sending, setSending] = useState(false);

  function downloadPdf() {
    if (typeof window === 'undefined') return;
    const a = document.createElement('a');
    a.href = `/api/invoices/${id}/pdf`;
    a.download = `invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  function printPdf() {
    if (typeof window !== 'undefined') window.print();
  }

  async function shareWa() {
    if (typeof window === 'undefined') return;
    if (sending) return;
    setSending(true);
    try {
      // If we already have a publicToken, we can also short-circuit, but
      // calling /send is preferred because it lifts DRAFT->SENT and emails
      // the customer too.
      const res = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: ['whatsapp', 'email'] }),
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
        if (publicToken) {
          // Best-effort: open the public link page.
          window.open(`/invoice/${publicToken}`, '_blank');
        } else {
          alert(json.error || 'Could not send. Save the invoice first.');
        }
        return;
      }
      if (json.data.email && !json.data.email.ok) {
        alert(`Email: ${json.data.email.error ?? 'failed'}`);
      }
      if (json.data.waLink) {
        window.open(json.data.waLink, '_blank');
      } else if (json.data.publicUrl) {
        window.open(json.data.publicUrl, '_blank');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSending(false);
    }
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
        disabled={sending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#1fbd5b] disabled:opacity-60"
      >
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
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
