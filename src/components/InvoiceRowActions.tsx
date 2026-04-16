'use client';

import { useRouter } from 'next/navigation';
import { Send, Eye, Check, XCircle, Trash2 } from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';
import { waLink } from '@/lib/whatsapp';

type Props = {
  id: string;
  invoiceNumber: string;
  status: string;
  customerName: string;
  phone: string;
  total: number;
};

export function InvoiceRowActions({ id, invoiceNumber, status, customerName, phone, total }: Props) {
  const router = useRouter();

  const actions: RowMenuAction[] = [];

  actions.push({
    label: 'View invoice',
    icon: <Eye size={16} />,
    onClick: () => { window.open(`/invoice/${invoiceNumber}`, '_blank'); },
  });

  if (phone && (status === 'DRAFT' || status === 'SENT')) {
    actions.push({
      label: 'Send via WhatsApp',
      icon: <Send size={16} />,
      onClick: async () => {
        // Mark as SENT if currently DRAFT
        if (status === 'DRAFT') {
          await fetch(`/api/invoices/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SENT' }),
          });
          router.refresh();
        }
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/invoice/${invoiceNumber}`;
        const msg = `Hi ${customerName}, here is your invoice (${invoiceNumber}) for ₦${total.toLocaleString('en-NG')}: ${url}\nPlease pay at your earliest convenience. Thank you!`;
        window.open(waLink(phone, msg), '_blank');
      },
    });
  }

  if (status !== 'PAID') {
    actions.push({
      label: 'Mark as paid',
      icon: <Check size={16} />,
      onClick: async () => {
        await fetch(`/api/invoices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAID' }),
        });
        router.refresh();
      },
    });
  }

  if (status !== 'CANCELLED' && status !== 'PAID') {
    actions.push({
      label: 'Cancel',
      icon: <XCircle size={16} />,
      danger: true,
      onClick: async () => {
        if (!confirm('Cancel this invoice?')) return;
        await fetch(`/api/invoices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        });
        router.refresh();
      },
    });
  }

  actions.push({
    label: 'Delete',
    icon: <Trash2 size={16} />,
    danger: true,
    onClick: async () => {
      if (!confirm('Delete this invoice permanently?')) return;
      await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      router.refresh();
    },
  });

  return <RowMenu actions={actions} />;
}
