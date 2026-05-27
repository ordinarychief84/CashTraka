'use client';

import { useState } from 'react';
import { Box, Plus } from 'lucide-react';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { CreateVariationDialog } from '@/components/items/CreateVariationDialog';

export default function VariationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-app py-5 md:py-8">
        <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
          <ItemsSubNav />

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-ink">0 Variations</h1>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                <Plus size={13} />
                Create new
              </button>
            </div>

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 px-6 text-center">
              <div className="mb-5 text-slate-300">
                <Box size={56} strokeWidth={1.2} />
              </div>
              <p className="text-[15px] font-medium text-slate-400">
                No variations found
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              Variations let you sell the same product in different sizes, colours or options (e.g. Small / Medium / Large). Coming soon.
            </p>
          </div>
        </div>
      </div>

      <CreateVariationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
