'use client';

import { useState, useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export interface UnitRow {
  name: string;
  abbreviation: string;
  packagingCode: string;
  barcode: string;
}

interface Props {
  units: UnitRow[];
}

export function UnitsTable({ units }: Props) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600">
              <th className="min-w-[180px] px-5 py-3">Name</th>
              <th className="px-4 py-3">Abbreviation</th>
              <th className="px-4 py-3">Packaging code</th>
              <th className="px-4 py-3">Barcode</th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {units.map((unit) => (
              <tr key={unit.name} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-2.5">
                  <span className="font-medium text-brand-700 hover:underline cursor-pointer">
                    {unit.name}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{unit.abbreviation || '—'}</td>
                <td className="px-4 py-2.5 text-slate-400">{unit.packagingCode || ''}</td>
                <td className="px-4 py-2.5 text-slate-400">{unit.barcode || ''}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(unit.name)}
                      className="text-slate-400 hover:text-brand-600"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
