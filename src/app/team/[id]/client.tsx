'use client';

import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { StaffPayDialog } from '@/components/StaffPayDialog';

type Staff = {
  id: string;
  name: string;
  phone: string | null;
  payType: string;
  payAmount: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
};

/**
 * Client sliver of the staff detail page — just the big "Pay" button plus
 * the pay dialog it opens. Kept separate so the server page stays a
 * server component.
 */
export function StaffDetailClient({ staff }: { staff: Staff }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mb-5 flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary"
        >
          <Banknote size={16} />
          Log a payment
        </button>
      </div>
      <StaffPayDialog open={open} onClose={() => setOpen(false)} staff={staff} />
    </>
  );
}
