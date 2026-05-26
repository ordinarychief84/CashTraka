'use client';

import { useState, useMemo } from 'react';
import { Pencil, Trash2, ChevronsDown, Search } from 'lucide-react';

export interface LocationRow {
  id: string;
  number: number;
  name: string;
  isDefault?: boolean;
  subLocationCount: number;
}

interface Props {
  locations: LocationRow[];
}

export function LocationsTable({ locations }: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Open');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) => l.name.toLowerCase().includes(q) || String(l.number).includes(q),
    );
  }, [locations, search]);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
              Search
            </label>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder=""
                className="h-8 w-40 rounded-md border border-slate-300 px-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
            >
              <option>Open</option>
              <option>Closed</option>
              <option>All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600">
                <th className="w-24 px-5 py-3">Number</th>
                <th className="min-w-[220px] px-4 py-3">Name</th>
                <th className="px-4 py-3">Amount of sub-locations</th>
                <th className="w-28 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                    No locations found
                  </td>
                </tr>
              ) : (
                filtered.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-[12px] text-brand-700">{loc.number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{loc.name}</span>
                      {loc.isDefault && (
                        <span className="ml-2 text-[11px] text-slate-400">Default</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {loc.subLocationCount > 0 ? (
                        <span className="font-medium text-brand-700">{loc.subLocationCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {loc.subLocationCount > 0 && (
                          <button
                            type="button"
                            className="text-slate-400 hover:text-brand-600"
                            title="Expand sub-locations"
                          >
                            <ChevronsDown size={14} />
                          </button>
                        )}
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
    </div>
  );
}
