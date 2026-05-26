'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SupplierGroupRow {
  id: string;
  number: number;
  name: string;
}

interface Props {
  rows: SupplierGroupRow[];
}

export function SupplierGroupsTable({ rows }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600">
              <th className="min-w-[120px] px-5 py-3">Number</th>
              <th className="min-w-[220px] px-4 py-3">Name</th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-14 text-center text-sm text-slate-400">
                  No supplier groups found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <span className="font-mono text-[12px] font-medium text-brand-700">
                      {row.number}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
