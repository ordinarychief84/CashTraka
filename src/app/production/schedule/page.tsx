import Link from 'next/link';
import { Factory, ArrowLeft } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 21; // 3-week look-ahead

/**
 * Production calendar — Gantt-light.
 *
 * Visualises the next 21 days of production runs as a horizontal grid:
 *   - Y axis: one row per ProductionOrder (active statuses only)
 *   - X axis: 21 day columns, today on the left
 *   - Each bar spans plannedStartAt → plannedEndAt clipped to the window
 *   - Bars are coloured by status so shortages, delays, and in-progress
 *     work pop without reading numbers.
 *
 * This is the visual that "production date" in the PRD asks for; the
 * existing /production list view answers "what runs do I have?" but not
 * "when do they overlap, when are we slammed, what's coming up?"
 *
 * Deliberately simple: no drag-to-reschedule, no zoom, no week/month
 * toggle. v0 of the calendar. Editing is still done on each
 * /production/[id] detail page.
 */
export default async function ProductionSchedulePage() {
  const user = await guard();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Pull every active or upcoming run that intersects the window.
  const orders = await prisma.productionOrder.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION', 'DELAYED'] },
      OR: [
        { plannedStartAt: { lte: windowEnd } },
        { plannedEndAt: { gte: today } },
        { plannedStartAt: null }, // unscheduled — render as a banner row below the grid
      ],
    },
    orderBy: [{ plannedStartAt: 'asc' }, { createdAt: 'asc' }],
    include: {
      items: { include: { product: { select: { name: true } } } },
      customerOrder: { select: { customerName: true, orderNumber: true } },
    },
    take: 100,
  });

  const days: Date[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    days.push(new Date(today.getTime() + i * 24 * 60 * 60 * 1000));
  }

  function dayIndex(d: Date): number {
    return Math.floor((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  }

  const scheduled = orders.filter((o) => o.plannedStartAt || o.plannedEndAt);
  const unscheduled = orders.filter((o) => !o.plannedStartAt && !o.plannedEndAt);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Production schedule"
        subtitle={`Next ${WINDOW_DAYS} days · ${orders.length} active run${orders.length === 1 ? '' : 's'}`}
        action={
          <Link href="/production" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={14} />
            All runs
          </Link>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
        <Legend color="bg-slate-300" label="Planned" />
        <Legend color="bg-amber-400" label="Materials needed" />
        <Legend color="bg-blue-500" label="In production" />
        <Legend color="bg-rose-500" label="Delayed" />
      </div>

      {scheduled.length === 0 && unscheduled.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <Factory size={28} className="text-slate-400" />
          <p className="text-sm font-semibold text-ink">Nothing scheduled</p>
          <p className="max-w-md text-xs text-slate-500">
            Create a production order with planned start + end dates to see it on the
            calendar. The /orders flow auto-creates one when you confirm a customer order.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <div className="min-w-[900px]">
            {/* Day header */}
            <div className="grid border-b border-border bg-slate-50 text-[11px]"
                 style={{ gridTemplateColumns: `260px repeat(${WINDOW_DAYS}, minmax(0, 1fr))` }}>
              <div className="border-r border-border px-3 py-2 font-semibold text-slate-600">
                Production run
              </div>
              {days.map((d, i) => {
                const isToday = i === 0;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={d.toISOString()}
                    className={
                      'px-1 py-2 text-center ' +
                      (isToday
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : isWeekend
                          ? 'text-slate-400'
                          : 'text-slate-600')
                    }
                  >
                    <div>{d.toLocaleDateString('en-NG', { weekday: 'short' })[0]}</div>
                    <div className="font-mono">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {scheduled.map((o) => {
              const startIdx = o.plannedStartAt
                ? Math.max(0, dayIndex(o.plannedStartAt))
                : 0;
              const endIdx = o.plannedEndAt
                ? Math.min(WINDOW_DAYS - 1, dayIndex(o.plannedEndAt))
                : startIdx;
              const span = Math.max(1, endIdx - startIdx + 1);

              const productLabel =
                o.items.length > 0
                  ? o.items.map((it) => `${it.quantity} × ${it.product.name}`).join(', ')
                  : '(no items)';

              const tone =
                o.status === 'DELAYED'
                  ? 'bg-rose-500 text-white'
                  : o.status === 'IN_PRODUCTION'
                    ? 'bg-blue-500 text-white'
                    : o.status === 'MATERIALS_NEEDED'
                      ? 'bg-amber-400 text-amber-900'
                      : 'bg-slate-300 text-slate-800';

              return (
                <div
                  key={o.id}
                  className="grid border-b border-border text-xs"
                  style={{ gridTemplateColumns: `260px repeat(${WINDOW_DAYS}, minmax(0, 1fr))` }}
                >
                  <Link
                    href={`/production/${o.id}`}
                    className="flex flex-col gap-0.5 border-r border-border px-3 py-2 hover:bg-slate-50"
                  >
                    <span className="font-mono text-[11px] font-bold text-brand-700">
                      {o.productionNumber}
                    </span>
                    <span className="truncate text-slate-700">{productLabel}</span>
                    {o.customerOrder ? (
                      <span className="truncate text-[10px] text-slate-500">
                        for {o.customerOrder.customerName} ({o.customerOrder.orderNumber})
                      </span>
                    ) : null}
                  </Link>
                  {/* Empty cells before the bar */}
                  {Array.from({ length: startIdx }).map((_, i) => (
                    <div key={`pre-${i}`} className="border-l border-slate-50" />
                  ))}
                  {/* The bar — spans `span` columns via grid-column */}
                  <div style={{ gridColumn: `span ${span} / span ${span}` }} className="p-1">
                    <div
                      className={`flex h-full items-center justify-center rounded ${tone}`}
                      title={`${o.productionNumber} · ${o.status.replace('_', ' ')}`}
                    >
                      <span className="truncate px-1.5 text-[10px] font-bold">
                        {o.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {/* Empty cells after the bar */}
                  {Array.from({ length: WINDOW_DAYS - endIdx - 1 }).map((_, i) => (
                    <div key={`post-${i}`} className="border-l border-slate-50" />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled runs — no plannedStart/End to show on the grid. */}
      {unscheduled.length > 0 ? (
        <section className="mt-6 card p-5">
          <h2 className="mb-2 text-sm font-semibold text-ink">
            Unscheduled ({unscheduled.length})
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            These runs have no planned start/end yet — set dates on the detail page to
            see them on the calendar.
          </p>
          <ul className="divide-y divide-border">
            {unscheduled.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <Link
                    href={`/production/${o.id}`}
                    className="font-mono text-xs font-bold text-brand-700 hover:underline"
                  >
                    {o.productionNumber}
                  </Link>
                  <span className="ml-2 text-slate-700">
                    {o.items.length} item{o.items.length === 1 ? '' : 's'}
                  </span>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {o.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-4 text-[11px] text-slate-500">
        Status colours mirror the dashboard. Click any row to open the run; click the
        date headers to be reminded of the day of the week.
      </p>
    </AppShell>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-0.5 text-slate-700">
      <span className={`h-2 w-2 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
