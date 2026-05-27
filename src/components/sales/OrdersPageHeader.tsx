'use client';

import { useState } from 'react';
import { CreateOrderDialog } from './CreateOrderDialog';
import { type CustomerOption } from './CreateOfferDialog';

interface Props {
  rowCount: number;
  customers: CustomerOption[];
}

export function OrdersPageHeader({ rowCount, customers }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">
          {rowCount} Orders
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Bulk actions ▾
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Import / Export ▾
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Hide shipped lines
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Show lines
          </button>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            + Create new
          </button>
        </div>
      </div>

      <CreateOrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        customers={customers}
      />
    </>
  );
}
