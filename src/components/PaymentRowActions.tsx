'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Pencil,
  Trash2,
  Receipt,
  Send,
  Shield,
  Link as LinkIcon,
  Eye,
} from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';
import { VerifyDialog } from './VerifyDialog';
import { ReceiptDialog } from './ReceiptDialog';
import { waLink } from '@/lib/whatsapp';

type Props = {
  id: string;
  status: 'PAID' | 'PENDING';
  verified: boolean;
  amount: number;
  referenceCode: string | null;
  customerName?: string;
  phone?: string;
  createdAt: string | Date;
  businessName: string;
  /** When true on mount, opens the receipt dialog immediately. Set by the
   *  payments page when the URL has ?openReceipt=<this-id>. */
  autoOpenReceipt?: boolean;
};

/**
 * Per-row actions on the /payments list.
 *
 * Design goal: the "happy path" action — generate+send receipt — is a
 * single visible click. Everything else is in an overflow menu.
 */
export function PaymentRowActions({
  id,
  status,
  verified,
  amount,
  referenceCode,
  customerName,
  phone,
  createdAt,
  businessName,
  autoOpenReceipt = false,
}: Props) {
  const router = useRouter();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Post-save hook: when the payments page redirects us here with
  // ?openReceipt=<id>, pop the receipt dialog immediately so the owner
  // doesn't have to click a second time.
  useEffect(() => {
    if (autoOpenReceipt) setReceiptOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actions: RowMenuAction[] = [];

  if (\!verified) {
    actions.push({
      label: 'Verify with bank alert',
      icon: <Shield size={16} />,
      onClick: () => setVerifyOpen(true),
    });
  }

  if (referenceCode && customerName && phone) {
    actions.push({
      label: 'Send payment request',
      icon: <Send size={16} />,
      onClick: () => {
        const origin =
          typeof window \!== 'undefined' ? window.location.origin : 'https://cashtraka.co';
        const url = `${origin}/pay/${referenceCode}`;
        const msg = `Hi ${customerName}, here is your secure payment link for ₦${amount.toLocaleString(
          'en-NG',
        )}: ${url}\nPlease include reference ${referenceCode} in your transfer narration.`;
        window.open(waLink(phone, msg), '_blank');
      },
    });
    actions.push({
      label: 'Copy payment link',
      icon: <LinkIcon size={16} />,
      onClick: async () => {
        const origin = typeof window \!== 'undefined' ? window.location.origin : '';
        const url = `${origin}/pay/${referenceCode}`;
        try {
          await navigator.clipboard.writeText(url);
          alert('Payment link copied');
        } catch {
          prompt('Copy this payment link:', url);
        }
      },
    });
  }

  actions.push({
    label: 'View receipt online',
    icon: <Eye size={16} />,
    onClick: () => { window.open(`/r/${id}`, '_blank'); },
  });

  if (status === 'PENDING') {
    actions.push({
      label: 'Mark as paid',
      icon: <Check size={16} />,
      onClick: async () => {
        await fetch(`/api/payments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAID' }),
        });
        router.refresh();
        // After flipping to PAID, open the receipt dialog so the owner can
        // review and send the auto-generated receipt immediately.
        setReceiptOpen(true);
      },
    });
  } else {
    actions.push({
      label: 'Mark as pending',
      icon: <Check size={16} />,
      onClick: async () => {
        await fetch(`/api/payments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PENDING' }),
        });
        router.refresh();
      },
    });
  }

  actions.push({
    label: 'Edit',
    icon: <Pencil size={16} />,
    onClick: () => router.push(`/payments/${id}/edit`),
  });
  actions.push({
    label: 'Delete',
    icon: <Trash2 size={16} />,
    danger: true,
    onClick: async () => {
      if (\!confirm('Delete this payment? This cannot be undone.')) return;
      await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      router.refresh();
    },
  });

  return (
    <>
      <div className="flex items-center gap-1">
        {\!verified && status === 'PAID' && (
          <button
            type="button"
            onClick={() => setVerifyOpen(true)}
            className="rounded-md border border-brand-500 bg-white px-2 py-1 text-[10px] font-bold text-brand-600 hover:bg-brand-50"
          >
            <Shield size={11} className="mr-0.5 inline" />
            Verify
          </button>
        )}
        {/* The primary receipt action — always visible, always one tap. */}
        <button
          type="button"
          onClick={() => setReceiptOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
          title="Generate & send receipt"
        >
          <Receipt size={11} />
          Receipt
        </button>
        <RowMenu actions={actions} />
      </div>
      <VerifyDialog
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        payment={{
          id,
          amount,
          referenceCode,
          customerName: customerName ?? '',
          phone: phone ?? undefined,
        }}
      />
      <ReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        payment={{
          id,
          amount,
          status,
          createdAt,
          customerName: customerName ?? 'Customer',
          phone: phone ?? null,
        }}
        businessName={businessName}
      />
    </>
  );
}
