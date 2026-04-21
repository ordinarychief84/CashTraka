'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';
import { RentPaymentDialog } from './RentPaymentDialog';

type Props = {
  tenantId: string;
  tenantName: string;
  phone: string;
  rentAmount: number;
  propertyName: string;
  period: string;
  waLink: string;
  editHref: string;
};

export function TenantRowActions({
  tenantId,
  tenantName,
  rentAmount,
  waLink: waUrl,
  editHref,
}: Props) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const actions: RowMenuAction[] = [
    {
      label: 'Record payment',
      icon: <Banknote size={14} />,
      onClick: () => setPayOpen(true),
    },
    {
      label: 'Send rent reminder',
      icon: <MessageCircle size={14} />,
      onClick: () => {
        window.open(waUrl, '_blank');
      },
    },
    {
      label: 'Edit tenant',
      icon: <Pencil size={14} />,
      onClick: () => router.push(editHref),
    },
    {
      label: 'Delete tenant',
      icon: <Trash2 size={14} />,
      danger: true,
      disabled: deleting,
      onClick: async () => {
        if (!confirm(`Delete ${tenantName}? This cannot be undone.`)) return;
        setDeleting(true);
        await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' });
        router.refresh();
      },
    },
  ];

  return (
    <>
      <RowMenu actions={actions} />
      <RentPaymentDialog
        tenantId={tenantId}
        tenantName={tenantName}
        rentAmount={rentAmount}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />
    </>
  )