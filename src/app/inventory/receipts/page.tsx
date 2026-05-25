import Link from 'next/link';
import { List, Plus, Settings2, TriangleAlert, Pencil, Trash2 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { inventoryService } from '@/lib/services/inventory.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function receiptTypeLabel(reason: string): string {
  switch (reason) {
    case 'PURCHASE_RECEIVE':
      return 'From the supplier';
    case 'ADJUSTMENT':
      return 'Adjustment';
    case 'RETURN':
      return 'Return';
    default:
      return reason;
  }
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="text-[11px] font-bold uppercase tracking-wide text-slate-600 border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 whitespace-nowrap text-left">
    {children}
  </th>
);

const TD = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={`border-r border-slate-100 px-2.5 py-1.5 text-[12px] text-slate-700 whitespace-nowrap ${className ?? ''}`}>
    {children}
  </td>
);

export default async function InventoryReceiptsPage() {
  const user = await guard();
  const { rows, total } = await inventoryService.listMovements(user.id, {
    reason: 'PURCHASE_RECEIVE',
    take: 200,
  });

  // Resolve item names
  const productIds = Array.from(
    new Set(rows.filter((r) => r.itemType === 'PRODUCT').map((r) => r.itemId)),
  );
  const materialIds = Array.from(
    new Set(rows.filter((r) => r.itemType === 'MATERIAL').map((r) => r.itemId)),
  );
  const [products, materials] = await Promise.all([
    productIds.length > 0
      ? prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [],
    materialIds.length > 0
      ? prisma.rawMaterial.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, name: true, unit: true },
        })
      : [],
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink">
            Inventory receipts
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Stock received from supplier purchase orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white">
            <List size={12} /> LIST VIEW
          </button>
          <Link
            href="/purchase-orders/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition"
          >
            <Plus size={12} /> ADD
          </Link>
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            <Settings2 size={12} /> ADJUST
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-[11px] text-slate-500">
            {total} record{total !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span>Records per page:</span>
            <select className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none">
              <option>10</option>
              <option>20</option>
              <option>30</option>
              <option>50</option>
            </select>
            <span className="text-slate-500">
              1–{Math.min(10, rows.length)} of {rows.length}
            </span>
            <button className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30" disabled>
              &#8249;
            </button>
            <button className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30" disabled>
              &#8250;
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] border-collapse text-left">
            <thead>
              <tr>
                <TH>{""}</TH>
                <TH>Inventory</TH>
                <TH>Receipt type</TH>
                <TH>Supplier</TH>
                <TH>Client</TH>
                <TH>Identification</TH>
                <TH>ID Prodio</TH>
                <TH>Date</TH>
                <TH>Comments</TH>
                <TH>Date of creation</TH>
                <th className="text-[11px] font-bold uppercase tracking-wide text-slate-600 border-b border-slate-200 bg-slate-50 px-2.5 py-2 whitespace-nowrap text-left">
                  Actions
                </th>
              </tr>
              {/* Static visual filter row */}
              <tr className="bg-white">
                <td className="border-b border-r border-slate-100 px-2.5 py-1" />
                {['Inventory', 'Receipt type', 'Supplier', 'Client', 'Identification', 'ID Prodio'].map(
                  (col) => (
                    <td key={col} className="border-b border-r border-slate-100 px-2 py-1">
                      <select className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 focus:outline-none">
                        <option value="">Choose</option>
                      </select>
                    </td>
                  ),
                )}
                {/* Date — calendar picker */}
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <input type="date" className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300" />
                </td>
                {/* Comments */}
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <select className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 focus:outline-none">
                    <option value="">Choose</option>
                  </select>
                </td>
                {/* Date of creation — calendar picker */}
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <input type="date" className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300" />
                </td>
                <td className="border-b border-slate-100 px-2 py-1" />
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <TriangleAlert size={28} className="text-slate-300" />
                      <span className="text-sm font-medium">No data found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const itemName =
                    r.itemType === 'PRODUCT'
                      ? productName.get(r.itemId) ?? r.itemId
                      : materialMap.get(r.itemId)?.name ?? r.itemId;
                  const itemHref =
                    r.itemType === 'PRODUCT'
                      ? `/products/${r.itemId}`
                      : `/materials/${r.itemId}`;
                  const truncatedNotes = r.notes
                    ? r.notes.length > 30
                      ? r.notes.slice(0, 30) + '…'
                      : r.notes
                    : '—';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Expand toggle */}
                      <TD className="text-center">
                        <div className="mx-auto w-9 h-5 rounded-full bg-slate-200 cursor-pointer" />
                      </TD>
                      {/* Inventory */}
                      <TD>
                        <Link
                          href={itemHref}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {itemName}
                        </Link>
                      </TD>
                      {/* Receipt type */}
                      <TD>{receiptTypeLabel(r.reason)}</TD>
                      {/* Supplier — from notes or — */}
                      <TD>—</TD>
                      {/* Client */}
                      <TD>—</TD>
                      {/* Identification */}
                      <TD>{r.id.slice(-6)}</TD>
                      {/* ID Prodio */}
                      <TD>{r.refId ? r.refId.slice(-8) : '—'}</TD>
                      {/* Date */}
                      <TD>{fmt(r.createdAt)}</TD>
                      {/* Comments */}
                      <TD>{truncatedNotes}</TD>
                      {/* Date of creation */}
                      <TD>{fmt(r.createdAt)}</TD>
                      {/* Actions */}
                      <td className="px-2.5 py-1.5 text-[12px] text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-orange-50">
                            <Pencil size={13} className="text-orange-400 hover:text-orange-600" />
                          </button>
                          <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-orange-50 cursor-default" title="Not implemented">
                            <Trash2 size={13} className="text-orange-400 hover:text-orange-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
