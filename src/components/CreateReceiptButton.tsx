'use client';

import { useState } from 'react';
import { ReceiptText as ReceiptIcon } from 'lucide-react';
import { CreateReceiptDialog } from './CreateReceiptDialog';
import { cn } from '@/lib/utils';

/**
 * Client-island button that opens `CreateReceiptDialog`. Safe to drop onto
 * server components (they pass businessName down from the owner record).
 */
export function CreateReceiptButton({
  businessName,
  variant = 'primary',
  label = 'Create receipt',
  className,
}: {
  businessName: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const baseClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(baseClass, className)}
      >
        <ReceiptIcon size={16} />
        {label}
      </button>
      <CreateReceiptDialog
        open={open}
        onClose={() => setOpen(false)}
        businessName={businessName}
      />
    </>
  );
}