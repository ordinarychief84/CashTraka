'use client';

import { useState } from 'react';
import {
  Receipt,
  Mail,
  MessageCircle,
  Check,
  Loader2,
  Copy,
  User,
  Phone,
  AtSign,
  Printer,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { whatsappLink, normalizeNigerianPhone } from '@/lib/whatsapp.util';
import { cn } from '@/lib/utils';

export type ReceiptSaleItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ReceiptSaleData = {
  id: string;
  saleNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: ReceiptSaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  note?: string | null;
  soldAt: string | Date;
  businessName: string;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  TRANSFER: 'Transfer',
  POS: 'POS',
  CARD: 'Card',
};

/**
 * Reusable receipt view with send-via-WhatsApp / email buttons.
 *
 * Used in:
 *  1. RecordSaleForm success screen (inline after recording)
 *  2. /sales/[id] detail page
 */
export function SalesReceiptView({
  sale,
  onRecordAnother,
}: {
  sale: ReceiptSaleData;
  /** If provided, shows a "Record Another Sale" button (form context). */
  onRecordAnother?: () => void;
}) {
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  const dateStr = new Date(sale.soldAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // ── WhatsApp receipt message ───────────────────────────────────────
  function buildWhatsAppMessage(): string {
    const itemLines = sale.items
      .map((i) => `  ${i.description} x${i.quantity}, ₦${i.total.toLocaleString()}`)
      .join('\n');

    let msg =
      `*Receipt from ${sale.businessName}*\n` +
      `Receipt #: ${sale.saleNumber}\n` +
      `Date: ${dateStr}\n\n` +
      `Items:\n${itemLines}\n\n`;

    if (sale.discount > 0) {
      msg += `Subtotal: ₦${sale.subtotal.toLocaleString()}\n`;
      msg += `Discount: -₦${sale.discount.toLocaleString()}\n`;
    }
    msg += `*Total: ₦${sale.total.toLocaleString()}*\n`;
    msg += `Payment: ${METHOD_LABEL[sale.paymentMethod] || sale.paymentMethod}\n\n`;
    msg += `Thank you for your purchase!`;
    return msg;
  }

  function handleWhatsApp() {
    if (!sale.customerPhone) return;
    const msg = buildWhatsAppMessage();
    const url = whatsappLink(sale.customerPhone, msg);
    window.open(url, '_blank', 'noopener');
  }

  async function handleEmail() {
    if (!sale.customerEmail) return;
    setEmailStatus('sending');
    try {
      const res = await fetch(`/api/sales/${sale.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'email' }),
      });
      if (res.ok) {
        setEmailStatus('sent');
      } else {
        setEmailStatus('error');
      }
    } catch {
      setEmailStatus('error');
    }
  }

  function handleCopyReceipt() {
    const text = buildWhatsAppMessage().replace(/\*/g, '');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-md">
      {/* ── Receipt card ────────────────────────────────────────────── */}
      <div className="card overflow-hidden print:shadow-none print:border-0">
        {/* Green success strip */}
        <div className="bg-success-500 px-5 py-3 text-center">
          <div className="flex items-center justify-center gap-2 text-white">
            <Receipt size={18} />
            <span className="text-sm font-bold">Sale Recorded</span>
          </div>
        </div>

        <div className="p-5">
          {/* Business name + receipt number */}
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black text-ink">{sale.businessName}</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-400 tracking-wide">
              {sale.saleNumber}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{dateStr}</p>
          </div>

          {/* Customer info (if any) */}
          {(sale.customerName || sale.customerPhone || sale.customerEmail) && (
            <div className="mb-4 rounded-lg bg-slate-50 p-3 space-y-1">
              {sale.customerName && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <User size={12} className="text-slate-400" />
                  {sale.customerName}
                </div>
              )}
              {sale.customerPhone && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone size={12} className="text-slate-400" />
                  {sale.customerPhone}
                </div>
              )}
              {sale.customerEmail && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <AtSign size={12} className="text-slate-400" />
                  {sale.customerEmail}
                </div>
              )}
            </div>
          )}

          {/* Items table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-2 text-left">Item</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Amt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sale.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-2.5 text-ink">
                    <span className="font-medium">{item.description}</span>
                    {item.quantity > 1 && (
                      <span className="ml-1 text-[11px] text-slate-400">
                        @ {formatNaira(item.unitPrice)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-center num text-slate-600">{item.quantity}</td>
                  <td className="py-2.5 text-right num font-semibold text-ink">
                    {formatNaira(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 space-y-1.5">
            {sale.discount > 0 && (
              <>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="num">{formatNaira(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-owed-600">
                  <span>Discount</span>
                  <span className="num">-{formatNaira(sale.discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-lg font-black text-ink">
              <span>Total</span>
              <span className="num">{formatNaira(sale.total)}</span>
            </div>
          </div>

          {/* Payment method badge */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-success-50 px-2.5 py-0.5 font-semibold text-success-700">
              {METHOD_LABEL[sale.paymentMethod] || sale.paymentMethod}
            </span>
            {sale.note && <span className="truncate">· {sale.note}</span>}
          </div>
        </div>

        {/* ── Send actions ────────────────────────────────────────── */}
        <div className="border-t border-border bg-slate-50/60 p-4 space-y-2 print:hidden">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Send receipt to customer
          </p>

          <div className="flex gap-2">
            {/* WhatsApp button */}
            <button
              onClick={handleWhatsApp}
              disabled={!sale.customerPhone}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition',
                sale.customerPhone
                  ? 'bg-[#25D366] text-white hover:bg-[#20BD5A] active:scale-[0.98]'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400',
              )}
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>

            {/* Email button */}
            <button
              onClick={handleEmail}
              disabled={!sale.customerEmail || emailStatus === 'sending' || emailStatus === 'sent'}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition',
                emailStatus === 'sent'
                  ? 'bg-success-100 text-success-700'
                  : sale.customerEmail
                    ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400',
              )}
            >
              {emailStatus === 'sending' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : emailStatus === 'sent' ? (
                <Check size={16} />
              ) : (
                <Mail size={16} />
              )}
              {emailStatus === 'sent' ? 'Sent' : 'Email'}
            </button>
          </div>

          {/* Helpers row */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyReceipt}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {copied ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
            <button
              onClick={handlePrint}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Printer size={14} />
              Print
            </button>
          </div>

          {/* Disabled hints */}
          {!sale.customerPhone && !sale.customerEmail && (
            <p className="text-center text-[11px] text-slate-400 mt-1">
              Add customer phone or email to send the receipt.
            </p>
          )}
        </div>
      </div>

      {/* ── Action buttons below receipt ───────────────────────────── */}
      <div className="mt-4 flex gap-2 print:hidden">
        {onRecordAnother && (
          <button onClick={onRecordAnother} className="btn-primary flex-1 justify-center">
            Record Another Sale
          </button>
        )}
        <a
          href="/sales"
          className="btn-secondary flex-1 justify-center text-center"
        >
          View All Sales
        </a>
      </div>
    </div>
  );
}
