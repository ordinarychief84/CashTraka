import Link from 'next/link';
import { Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';

type ActionRow = {
  label: string;
  count: number;
  href: string;
};

/**
 * Daily Action List — single column of "what needs doing today" with a
 * count badge per row. Each item links to the list page filtered down
 * to today's deadlines.
 */
export async function DailyActionListCard({ userId }: { userId: string }) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    ordersDueToday,
    productionDueToday,
    materialsToReorder,
    purchaseOrdersDue,
    invoicesOverdue,
  ] = await Promise.all([
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED', 'IN_PRODUCTION'] },
        dueAt: { gte: today, lt: endOfToday },
      },
    }),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION'] },
        plannedEndAt: { gte: today, lt: endOfToday },
      },
    }),
    inventoryService.computeLowStockMaterials(userId).then((r) => r.length),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
        expectedAt: { gte: today, lt: endOfToday },
      },
    }),
    prisma.invoice.count({
      where: {
        userId,
        status: { in: ['SENT', 'VIEWED', 'OVERDUE'] },
        dueDate: { lt: today },
      },
    }),
  ]);

  const rows: ActionRow[] = [
    { label: 'Orders due today', count: ordersDueToday, href: '/orders' },
    { label: 'Production due today', count: productionDueToday, href: '/production' },
    { label: 'Materials to reorder', count: materialsToReorder, href: '/materials' },
    { label: 'Purchase orders due', count: purchaseOrdersDue, href: '/purchase-orders' },
    { label: 'Invoices overdue', count: invoicesOverdue, href: '/invoices' },
  ];

  return (
    <DashboardCard title="Daily Action List" viewAllHref="/dashboard">
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label}>
            <Link
              href={r.href}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-2.5">
                <Circle size={16} className="shrink-0 text-success-500" strokeWidth={2.5} />
                <span className="text-sm text-slate-700">{r.label}</span>
              </div>
              <span
                className={
                  r.count > 0
                    ? 'num inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-50 px-1.5 text-xs font-bold text-brand-800'
                    : 'num text-xs font-bold text-slate-300'
                }
              >
                {r.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
