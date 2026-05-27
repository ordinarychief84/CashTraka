import Link from 'next/link';
import { Plus, Box, MoreHorizontal, ArrowUpDown, ImageIcon } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';

export const dynamic = 'force-dynamic';

// Collections = curated product bundles / kits
// No DB model yet — page scaffolded for Rackbeat-style UI; data wired in a later sprint.
interface CollectionRow {
  id: string;
  number: number;
  name: string;
  itemCount: number;
}

const STATIC_COLLECTIONS: CollectionRow[] = [];

export default async function ItemCollectionsPage() {
  const user = await guard();

  const rows = STATIC_COLLECTIONS;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <ItemsSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} {rows.length === 1 ? 'Collection' : 'Collections'}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Import ▾
              </button>
              <Link
                href="/item-collections/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                <Plus size={13} />
                Create new
              </Link>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {/* Image thumbnail column */}
                  <th className="w-14 px-4 py-2.5" />
                  <th className="min-w-[240px] px-3 py-2.5">
                    <span className="flex items-center gap-1">
                      Name
                      <ArrowUpDown size={11} className="text-slate-400" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-right">Items</th>
                  {/* Actions column */}
                  <th className="w-12 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Box size={44} strokeWidth={1.2} className="text-slate-300" />
                        <p className="text-[14px] text-slate-400">No collections found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="group hover:bg-slate-50/60 transition-colors">
                      {/* Thumbnail */}
                      <td className="px-4 py-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-300">
                          <ImageIcon size={16} />
                        </div>
                      </td>
                      {/* Name + number */}
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/item-collections/${row.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-400">{row.number}</span>
                          <ArrowUpDown size={10} className="text-slate-300" />
                        </div>
                      </td>
                      {/* Item count */}
                      <td className="px-3 py-2.5 text-right text-slate-600">
                        {row.itemCount}
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 transition-all"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
