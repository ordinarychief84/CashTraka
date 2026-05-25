'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings2, LayoutList } from 'lucide-react';
import { ManufacturingTasksTable, type TaskRow } from './ManufacturingTasksTable';
import { AddToScheduleModal } from './AddToScheduleModal';

export function ManufacturingTasksPageShell({ rows }: { rows: TaskRow[] }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {showModal && <AddToScheduleModal rows={rows} onClose={() => setShowModal(false)} />}

      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink">Manufacturing tasks</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <span className="text-[11px] text-slate-500 mr-1">
            Export:{' '}
            <button className="text-orange-500 hover:underline font-medium">CSV</button>
            {' '}
            <button className="text-orange-500 hover:underline font-medium">XLSX</button>
          </span>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700">
            <LayoutList size={11} /> STAGES
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-1.5 text-[11px] font-bold text-white hover:bg-orange-600"
          >
            + ADD
          </button>
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-1.5 rounded text-[11px] font-semibold text-slate-600 hover:text-slate-800"
          >
            <Settings2 size={12} /> ADJUST
          </Link>
        </div>
      </div>

      <ManufacturingTasksTable rows={rows} />
    </>
  );
}
