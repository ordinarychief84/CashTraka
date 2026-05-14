import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Package,
  CalendarX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { shortageService } from '@/lib/services/shortage.service';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Surfaces every operational risk the owner needs to see at a glance:
 *   - Critical material shortages (severity HIGH or CRITICAL)
 *   - Delayed production runs (status DELAYED + past plannedEndAt)
 *   - Late supplier deliveries (POs past expectedAt, still open)
 *   - Out-of-stock products (trackStock + stock = 0)
 *   - Expiring materials (next 30 days)
 *
 * The panel hides entirely when there is no risk, so quiet days stay
 * clean.
 */
export async function OperationalRiskPanel({ userId }: { userId: string }) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const [
    criticalShortages,
    delayedProduction,
    lateSupplierPOs,
    outOfStockProducts,
    expiringMats,
  ] = await Promise.all([
    shortageService.listOpenForUser(userId, { limit: 5 }).then((all) =>
      all.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH'),
    ),
    prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { status: 'DELAYED' },
          {
            status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION'] },
            plannedEndAt: { lt: today },
          },
        ],
      },
      orderBy: { plannedEndAt: 'asc' },
      take: 5,
      select: {
        id: true,
        productionNumber: true,
        status: true,
        plannedEndAt: true,
      },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
        expectedAt: { lt: today },
      },
      orderBy: { expectedAt: 'asc' },
      take: 5,
      select: {
        id: true,
        poNumber: true,
        expectedAt: true,
        totalKobo: true,
        supplier: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: {
        userId,
        archived: false,
        trackStock: true,
        stock: { equals: 0 },
      },
      orderBy: { name: 'asc' },
      take: 5,
      select: { id: true, name: true },
    }),
    inventoryService.computeExpiringMaterials(userId, 30),
  ]);

  const totalIssues =
    criticalShortages.length +
    delayedProduction.length +
    lateSupplierPOs.length +
    outOfStockProducts.length +
    expiringMats.length;

  if (totalIssues === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-rose-700">
          <ShieldAlert size={14} />
          Risk panel
        </h2>
        <span className="num text-xs font-bold text-rose-700">{totalIssues}</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {criticalShortages.length > 0 && (
          <RiskGroup
            icon={AlertTriangle}
            label="Critical shortages"
            href="/shortages"
            count={criticalShortages.length}
          >
            {criticalShortages.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-700">
                  {s.material.name}
                </span>
                <span className="num font-bold text-rose-700">
                  -{s.shortageQuantity} {s.material.unit}
                </span>
              </li>
            ))}
          </RiskGroup>
        )}
        {delayedProduction.length > 0 && (
          <RiskGroup
            icon={CalendarX}
            label="Delayed production"
            href="/production?status=DELAYED"
            count={delayedProduction.length}
          >
            {delayedProduction.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/production/${p.id}`}
                  className="truncate font-mono text-brand-700 hover:underline"
                >
                  {p.productionNumber}
                </Link>
                <span className="text-xs text-slate-500">
                  {p.plannedEndAt
                    ? new Date(p.plannedEndAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </span>
              </li>
            ))}
          </RiskGroup>
        )}
        {lateSupplierPOs.length > 0 && (
          <RiskGroup
            icon={Calendar}
            label="Late supplier POs"
            href="/purchase-orders"
            count={lateSupplierPOs.length}
          >
            {lateSupplierPOs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/purchase-orders/${p.id}`}
                  className="truncate font-mono text-brand-700 hover:underline"
                >
                  {p.poNumber}
                </Link>
                <span className="truncate text-slate-500">
                  {p.supplier.name}
                </span>
              </li>
            ))}
          </RiskGroup>
        )}
        {outOfStockProducts.length > 0 && (
          <RiskGroup
            icon={Package}
            label="Out of stock"
            href="/products"
            count={outOfStockProducts.length}
          >
            {outOfStockProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/products/${p.id}`}
                  className="truncate text-slate-700 hover:underline"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </RiskGroup>
        )}
        {expiringMats.length > 0 && (
          <RiskGroup
            icon={AlertTriangle}
            label="Expiring materials"
            href="/materials"
            count={expiringMats.length}
          >
            {expiringMats.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/materials/${m.id}`}
                  className="truncate text-slate-700 hover:underline"
                >
                  {m.name}
                </Link>
                <span className="text-xs font-semibold text-amber-700">
                  {m.expiresAt
                    ? new Date(m.expiresAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : ''}
                </span>
              </li>
            ))}
          </RiskGroup>
        )}
      </div>
    </section>
  );
}

function RiskGroup({
  icon: Icon,
  label,
  href,
  count,
  children,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-rose-100 bg-white p-3">
      <Link
        href={href}
        className="mb-2 flex items-center justify-between gap-2 hover:opacity-90"
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">
          <Icon size={11} />
          {label}
        </span>
        <span className="num text-xs font-bold text-rose-700">{count}</span>
      </Link>
      <ul className="space-y-1 text-xs">{children}</ul>
    </div>
  );
}
