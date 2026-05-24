import Link from 'next/link';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type MaterialRow = {
  kind: 'material';
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  stock: number;
  reorderLevel: number;
  lowStockAt: number | null;
  unitCostKobo: number;
  category: string | null;
};

type ProductRow = {
  kind: 'product';
  id: string;
  name: string;
  sku: string | null;
  unit: null;
  stock: number;
  reorderLevel: null;
  lowStockAt: number | null;
  unitCostKobo: number | null;
  category: string | null;
};

type InventoryRow = MaterialRow | ProductRow;

export default async function AllInventoryPage() {
  const user = await guard();

  const [rawMaterials, rawProducts] = await Promise.all([
    prisma.rawMaterial.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        stock: true,
        reorderLevel: true,
        unitCostKobo: true,
        category: true,
      },
    }),
    prisma.product.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockAt: true,
        costKobo: true,
        priceKobo: true,
        category: true,
      },
    }),
  ]);

  const materials: InventoryRow[] = rawMaterials.map((m) => ({
    kind: 'material' as const,
    id: m.id,
    name: m.name,
    sku: m.sku ?? null,
    unit: m.unit,
    stock: m.stock,
    reorderLevel: m.reorderLevel,
    lowStockAt: null,
    unitCostKobo: m.unitCostKobo,
    category: m.category ?? null,
  }));

  const products: InventoryRow[] = rawProducts.map((p) => ({
    kind: 'product' as const,
    id: p.id,
    name: p.name,
    sku: p.sku ?? null,
    unit: null,
    stock: p.stock,
    reorderLevel: null,
    lowStockAt: p.lowStockAt,
    unitCostKobo: p.costKobo ?? null,
    category: p.category ?? null,
  }));

  // Merge and sort by name.
  const allItems: InventoryRow[] = [...materials, ...products].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const totalCount = allItems.length;

  function isLowStock(item: InventoryRow): boolean {
    if (item.kind === 'material') {
      return item.stock <= item.reorderLevel;
    }
    // Product: low if stock <= lowStockAt (treat null lowStockAt as not configured)
    if (item.lowStockAt === null || item.lowStockAt === undefined) return false;
    return item.stock <= item.lowStockAt;
  }

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Inventories"
        subtitle={`${totalCount} item${totalCount === 1 ? '' : 's'} across all categories`}
        backHref="/inventory"
      />

      {allItems.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">No inventory items yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">SKU</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Stock</th>
                <th className="px-4 py-2 text-right">Reorder</th>
                <th className="px-4 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allItems.map((item) => {
                const low = isLowStock(item);
                const reorderDisplay =
                  item.kind === 'material'
                    ? item.reorderLevel
                    : item.lowStockAt !== null && item.lowStockAt !== undefined
                    ? item.lowStockAt
                    : '—';
                return (
                  <tr key={`${item.kind}-${item.id}`}>
                    {/* Type chip */}
                    <td className="px-4 py-2">
                      {item.kind === 'material' ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Material
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Product
                        </span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-2">
                      <Link
                        href={item.kind === 'product' ? `/products/${item.id}` : `/materials/${item.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">
                      {item.sku ?? '—'}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-2 text-slate-600">{item.category ?? '—'}</td>

                    {/* Stock */}
                    <td
                      className={`px-4 py-2 text-right font-bold font-mono ${
                        low ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {item.stock}
                      {item.kind === 'material' && item.unit ? (
                        <span className="ml-1 text-xs font-normal text-slate-400">{item.unit}</span>
                      ) : null}
                    </td>

                    {/* Reorder level */}
                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-500">
                      {reorderDisplay}
                    </td>

                    {/* Status chip */}
                    <td className="px-4 py-2 text-center">
                      {low ? (
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
