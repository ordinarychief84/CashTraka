'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Banknote, Clock3, ReceiptText, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = { open: boolean; onClose: () => void };

export function QuickAddSheet({ open, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items = [
    { href: '/payments/new', icon: Banknote, label: 'Add payment', color: 'bg-brand-50 text-brand-600' },
    { href: '/debts/new', icon: Clock3, label: 'Add debt', color: 'bg-owed-50 text-owed-600' },
    { href: '/expenses/new', icon: ReceiptText, label: 'Add expense', color: 'bg-slate-100 text-slate-700' },
    { href: '/invoices/new', icon: FileText, label: 'Create invoice', color: 'bg-success-50 text-success-700' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/50 transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white p-5 shadow-2xl transition-transform duration-300 md:hidden',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Quick add</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={onClose}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4 text-center hover:border-brand-300 hover:bg-brand-50/30"
            >
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', it.color)}>
                <it.icon size={22} />
              </span>
              <span className="text-sm font-semibold text-ink">{it.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )