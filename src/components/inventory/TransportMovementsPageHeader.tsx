'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CreateTransportMovementDialog } from './CreateTransportMovementDialog';

interface Props {
  rowCount: number;
}

export function TransportMovementsPageHeader({ rowCount }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">
          {rowCount} Transport movements
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Export ▾
          </button>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={13} />
            Create
          </button>
        </div>
      </div>

      <CreateTransportMovementDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
