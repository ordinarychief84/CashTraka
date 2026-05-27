'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CreatePurchaseOrderDialog, type SupplierOption } from './CreatePurchaseOrderDialog';

interface Props {
  rowCount: number;
  suppliers: SupplierOption[];
}

export function PurchaseOrdersPageHeader({ rowCount, suppliers }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">
          {rowCount} Purchase orders
        </h1>
        <div className="flex items-center gap-2">
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
            Hide received lines
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
            <Plus size={13} />
            Create new
          </button>
        </div>
      </div>

      <CreatePurchaseOrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        suppliers={suppliers}
      />
    </>
  );
}
