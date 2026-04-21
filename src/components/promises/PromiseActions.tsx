'use client';

import { useState } from 'react';
import { MoreVertical, Copy, Send, Eye, XCircle, Bell } from 'lucide-react';
import { waLink } from '@/lib/whatsapp';

type Props = {
  promise: {
    id: string;
    publicToken: string;
    publicUrl: string | null;
    customerNameSnapshot: string;
    phoneSnapshot: string;
    originalAmount: number;
    remainingAmount: number;
    status: string;
  };
  businessName: string;
};

export function PromiseActions({ promise, businessName }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const link = promise.publicUrl || `${appUrl}/promise/${promise.publicToken}`;

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  }

  function sendWhatsApp() {
    const amount = '₦' + promise.remainingAmount.toLocaleString('en-NG');
    const msg = `Hi ${promise.customerNameSnapshot}, you have an outstanding payment of ${amount} with ${businessName}. Please use this link to pay or set up a payment plan:\n\n${link}`;
    window.open(waLink(promise.phoneSnapshot, msg), '_blank');
    setOpen(false);
  }

  function sendReminder() {
    const amount = '₦' + promise.remainingAmount.toLocaleString('en-NG');
    const msg = `Hi ${promise.customerNameSnapshot}, this is a reminder about your outstanding payment of ${amount}. Please pay or update your commitment here:\n\n${link}`;
    window.open(waLink(promise.phoneSnapshot, msg), '_blank');
    setOpen(false);
  }

  async function cancelPromise() {
    if (!confirm('Cancel this promise? The link will stop working.')) return;
    await fetch(`/api/promises/${promise.id}/cancel`, { method: 'POST' });
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 hover:bg-slate-100"
      >
        <MoreVertical size={16} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border bg-white py-1 shadow-lg">
            <button onClick={copyLink} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Copy size={14} /> {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button onClick={sendWhatsApp} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Send size={14} /> Send via WhatsApp
            </button>
            {['PROMISED', 'BROKEN', 'PARTIALLY_PAID'].includes(promise.status) && (
              <button onClick={sendReminder} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Bell size={14} /> Send reminder
              </button>
            )}
            <a href={`/promises/${promise.id}`} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Eye size={14} /> View details
            </a>
            {!['PAID', 'CANCELLED', 'EXPIRED'].includes(promise.status) && (
              <>
                <div className="my-1 border-t" />
                <button onClick={cancelPromise} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <XCircle size={14} /> Cancel
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
