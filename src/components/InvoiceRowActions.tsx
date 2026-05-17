'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send, Eye, Check, XCircle, Trash2, Link2 } from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';

type Props = {
  id: string;
  invoiceNumber: string;
  publicToken: string | null;
  status: string;
  customerName: string;
  phone: string;
  total: number;
};

export function InvoiceRowActions({
  id,
  publicToken,
  status,
  phone,
}: Props) {
  const router = useRouter();

  const actions: RowMenuAction[] = [];

  if (publicToken) {
    actions.push({
      label: 'View public invoice',
      icon: <Eye size={16} />,
      onClick: () => {
        window.open(`/invoice/${publicToken}`, '_blank');
      },
    });

    actions.push({
      label: 'Copy public link',
      icon: <Link2 size={16} />,
      onClick: async () => {
        try {
          const url = `${window.location.origin}/invoice/${publicToken}`;
          await navigator.clipboard.writeText(url);
          toast.success('Link copied');
        } catch {
          toast.error('Could not copy. Long-press to copy from the address bar.');
        }
      },
    });
  }

  // Send / Resend via the dedicated endpoint that mints a token, lifts
  // status, sends email, and returns a wa.me link.
  if (status !== 'CANCELLED' && status !== 'CREDITED' && status !== 'PAID') {
    actions.push({
      label: status === 'DRAFT' ? 'Send via WhatsApp / email' : 'Resend',
      icon: <Send size={16} />,
      onClick: async () => {
        const channels: ('email' | 'whatsapp')[] = [];
        if (phone) channels.push('whatsapp');
        channels.push('email');
        try {
          const res = await fetch(`/api/invoices/${id}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channels }),
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
            toast.error(json.error || 'Could not send invoice.');
            return;
          }
          if (json.data.email && !json.data.email.ok) {
            toast.error(`Email: ${json.data.email.error ?? 'failed'}`);
          } else if (json.data.email?.ok) {
            toast.success('Invoice sent');
          }
          if (json.data.waLink) {
            window.open(json.data.waLink, '_blank');
          }
          router.refresh();
        } catch {
          toast.error('Network error. Please try again.');
        }
      },
    });
  }

  if (status !== 'PAID' && status !== 'CANCELLED' && status !== 'CREDITED') {
    actions.push({
      label: 'Mark as paid',
      icon: <Check size={16} />,
      onClick: async () => {
        const res = await fetch(`/api/invoices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAID' }),
        });
        if (res.ok) {
          toast.success('Invoice marked paid');
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error || 'Could not update');
        }
        router.refresh();
      },
    });
  }

  if (status !== 'CANCELLED' && status !== 'PAID' && status !== 'CREDITED') {
    actions.push({
      label: 'Cancel',
      icon: <XCircle size={16} />,
      danger: true,
      onClick: async () => {
        if (!confirm('Cancel this invoice?')) return;
        const res = await fetch(`/api/invoices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        });
        if (res.ok) {
          toast.success('Invoice cancelled');
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error || 'Could not cancel');
        }
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
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Invoice deleted');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Could not delete');
      }
      router.refresh();
    },
  });

  return <RowMenu actions={actions} />;
}
