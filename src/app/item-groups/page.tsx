'use client';

// Item groups page — derived from distinct product categories
// No separate DB table; groups come from product.category field.

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Import, Pencil, Trash2 } from 'lucide-react';
import { ItemsSubNav } from '@/components/ItemsSubNav';

interface GroupRow {
  number: number;
  name: string;
  itemCount: number;
  hasInventory: boolean;
}

export default function ItemGroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        const products: any[] = data.products ?? data ?? [];

        // Aggregate by category
        const map = new Map<string, { count: number; hasInventory: boolean }>();
        for (const p of products) {
          const cat = p.category || p.group || '(No group)';
          const existing = map.get(cat) ?? { count: 0, hasInventory: false };
          map.set(cat, {
            count: existing.count + 1,
            hasInventory: existing.hasInventory || (p.trackStock ?? false),
          });
        }

        const rows: GroupRow[] = Array.from(map.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, { count, hasInventory }], i) => ({
            number: 1001 + i,
            name,
            itemCount: count,
            hasInventory,
          }));

        setGroups(rows);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q) || String(g.number).includes(q));
  }, [groups, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Inline shell — no AppShell import to avoid server/client mismatch */}
      <div className="container-app py-5 md:py-8">
        <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
          <ItemsSubNav />

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-slate-900">
                {filtered.length} Item groups
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Import size={13} />
                  Import
                </button>
                <Link
                  href="/item-groups/new"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
                >
                  <Plus size={13} />
                  Create new
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              {/* Search bar */}
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="relative max-w-xs">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="By number &amp; name"
                    className="h-8 w-full rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                  />
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Number</th>
                    <th className="min-w-[220px] px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5 text-right">Items in group</th>
                    <th className="px-3 py-2.5">Has inventory</th>
                    <th className="w-20 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                        No item groups found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.number} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[12px] text-blue-700">{row.number}</span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{row.name}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{row.itemCount}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                            row.hasInventory
                              ? 'bg-success-100 text-success-700'
                              : 'bg-rose-100 text-rose-600'
                          }`}>
                            {row.hasInventory ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/products?group=${encodeURIComponent(row.name)}`}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Pencil size={14} />
                            </Link>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-rose-500"
                              title="Remove group (redirects to products)"
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
      </div>
    </div>
  );
}
