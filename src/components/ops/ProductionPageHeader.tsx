'use client';

import { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { CreateProductionOrderDialog } from './CreateProductionOrderDialog';

interface Props {
  rowCount: number;
  products: { id: string; name: string; sku: string | null }[];
  customerOrders: { id: string; orderNumber: string; customerName: string }[];
}

export function ProductionPageHeader({ rowCount, products, customerOrders }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">
          {rowCount} Production orders
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
          >
            <Settings2 size={15} />
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

      <CreateProductionOrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        products={products}
        customerOrders={customerOrders}
      />
    </>
  );
}
