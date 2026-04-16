'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { RentPaymentDialog } from './RentPaymentDialog';

type Props = {
  tenantId: string;
  tenantName: string;
  rentAmount: number;
};

export function RentQuickActions({ tenantId, tenantName, rentAmount }: Props) {
  const [payOpen, setPayOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPayOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-brand-600 hover:bg-brand-50"
        title="Record payment"
      >
        <Wallet size={18} />
      </button>
      <RentPaymentDialog
        tenantId={tenantId}
        tenantName={tenantName}
        rentAmount={rentAmount}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />
    </>
  );
}
