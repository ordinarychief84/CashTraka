import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface Props {
  userId: string;
}

export async function ProductsToReorderPanel({ userId }: Props) {
  // Fetch products where stock <= lowStockAt (Prisma doesn't support column-to-column compare
  // so we pull candidates and filter in JS — the list is short so this is fine)
  const candidates = await prisma.product
    .findMany({
      where: {
        userId,
        trackStock: true,
        archived: false,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockAt: true,
      },
      orderBy: { name: 'asc' },
    })
    .catch(() => []);

  const rows = candidates.filter(
    (p) => p.lowStockAt != null && p.stock <= p.lowStockAt,
  );

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-[13px] font-bold text-ink">
          {rows.length} Product{rows.length !== 1 ? 's' : ''} to reorder
        </h3>
      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
          <p className="text-xs text-slate-400">All stock levels are healthy</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {rows.slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <Link
                  href={`/products/${p.id}/edit`}
                  className="block truncate text-[13px] font-medium text-ink hover:text-brand-700"
                >
                  {p.name}
                </Link>
                {p.sku && (
                  <span className="text-[11px] text-slate-400">{p.sku}</span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[12px] font-semibold text-red-600">{p.stock}</span>
                <span className="ml-0.5 text-[11px] text-slate-400">/ {p.lowStockAt}</span>
              </div>
            </div>
          ))}
          {rows.length > 8 && (
            <div className="px-4 py-2 text-center text-[11px] text-slate-400">
              +{rows.length - 8} more
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-slate-100 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/purchase-orders/new"
            className="text-[12px] font-semibold text-brand-700 hover:underline"
          >
            Reorder all (max 100)
          </Link>
          <Link
            href="/products?filter=low-stock"
            className="text-[12px] text-slate-500 hover:text-ink hover:underline"
          >
            Show all
          </Link>
        </div>
      </div>
    </div>
  );
}
