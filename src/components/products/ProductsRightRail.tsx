import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  Plus,
  Upload,
  Sliders,
  Barcode,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * Products page right rail:
 *   1. Low Stock Alert       — top 5 products at/below lowStockAt
 *   2. Recent Added Products — last 5 by createdAt
 *   3. Quick Actions          — 4 icon tiles (New, Bulk Import, Adjust
 *                                Stock, Print Barcodes)
 */
export async function ProductsRightRail({ userId }: { userId: string }) {
  const [low, recent] = await Promise.all([
    inventoryService.computeLowStockProducts(userId).then((all) => all.slice(0, 5)),
    prisma.product.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, createdAt: true, images: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <LowStockAlertCard rows={low} />
      <RecentAddedProductsCard rows={recent} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Low Stock Alert ============== */

function LowStockAlertCard({
  rows,
}: {
  rows: { id: string; name: string; stock: number; lowStockAt: number }[];
}) {
  return (
    <DashboardCard title="Low Stock Alert" viewAllHref="/products">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">
          Every product is above its alert level.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/products/${r.id}`}
                className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-owed-50 text-owed-700">
                  <AlertTriangle size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Alert at {r.lowStockAt}
                  </div>
                </div>
              </Link>
              <span className="num shrink-0 rounded-full bg-owed-100 px-2 py-0.5 text-[10px] font-bold text-owed-800">
                {r.stock} pcs left
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Recent Added Products ============== */

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RecentAddedProductsCard({
  rows,
}: {
  rows: { id: string; name: string; createdAt: Date; images: string[] }[];
}) {
  return (
    <DashboardCard title="Recent Added Products" viewAllHref="/products">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">
          New products you add will appear here.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/products/${r.id}`}
                className="flex items-center justify-between gap-2 hover:opacity-90"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-slate-50">
                    {r.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.images[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package size={14} className="text-slate-400" />
                    )}
                  </span>
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.name}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] text-slate-500">
                  {formatDate(r.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Quick Actions ============== */

function QuickActionsCard() {
  const actions: {
    Icon: LucideIcon;
    label: string;
    href: string;
    tone: 'brand' | 'success' | 'owed' | 'rose';
  }[] = [
    { Icon: Plus, label: 'New Product', href: '/products/new', tone: 'brand' },
    { Icon: Upload, label: 'Bulk Import', href: '/products', tone: 'success' },
    { Icon: Sliders, label: 'Adjust Stock', href: '/products', tone: 'owed' },
    { Icon: Barcode, label: 'Print Barcodes', href: '/products', tone: 'rose' },
  ];

  const TONE_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    success: 'bg-success-100 text-success-700 hover:bg-success-200',
    owed: 'bg-owed-50 text-owed-700 hover:bg-owed-100',
    rose: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  };

  return (
    <DashboardCard title="Quick Actions">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white p-3 transition hover:bg-slate-50"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_BG[a.tone]}`}
            >
              <a.Icon size={16} />
            </span>
            <span className="text-[10px] font-semibold text-slate-700">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
