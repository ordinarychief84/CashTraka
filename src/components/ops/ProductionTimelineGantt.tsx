import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';
import { cn } from '@/lib/utils';

const DAYS = 7;

const STATUS_BAR_TONE: Record<string, string> = {
  PLANNED: 'bg-slate-200 text-slate-700 border-slate-300',
  MATERIALS_NEEDED: 'bg-owed-100 text-owed-800 border-owed-300',
  READY_TO_PRODUCE: 'bg-brand-100 text-brand-800 border-brand-300',
  IN_PRODUCTION: 'bg-success-100 text-success-800 border-success-300',
  COMPLETED: 'bg-emerald-200 text-emerald-900 border-emerald-300',
  DELAYED: 'bg-rose-100 text-rose-800 border-rose-300',
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planned',
  MATERIALS_NEEDED: 'Materials Needed',
  READY_TO_PRODUCE: 'Ready',
  IN_PRODUCTION: 'In Production',
  COMPLETED: 'Completed',
  DELAYED: 'Delayed',
};

/**
 * Production Timeline · 7-day Gantt strip.
 *
 * Pulls every active or recently completed production run that has at
 * least one planned date inside the current week, then renders a bar
 * per run spanning the days it covers. Today is marked with a vertical
 * dashed line. The product name + quantity sits in the left column.
 *
 * Bars use the same status palette as ProductionKanban. No chart
 * library — pure CSS grid + absolute positioning.
 */
export async function ProductionTimelineGantt({ userId }: { userId: string }) {
  // Anchor the strip on Sunday of the current week (Sun-Sat per the comp).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + DAYS - 1);
  saturday.setHours(23, 59, 59, 999);

  const days: Date[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    return d;
  });

  const runs = await prisma.productionOrder.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [
        { plannedStartAt: { lte: saturday, gte: sunday } },
        { plannedEndAt: { lte: saturday, gte: sunday } },
        { startedAt: { lte: saturday, gte: sunday } },
        { completedAt: { lte: saturday, gte: sunday } },
        {
          AND: [
            { plannedStartAt: { lt: sunday } },
            { plannedEndAt: { gt: saturday } },
          ],
        },
      ],
    },
    orderBy: { plannedStartAt: 'asc' },
    take: 8,
    include: {
      items: {
        include: { product: { select: { name: true } } },
        take: 1,
      },
    },
  });

  const todayIdx = Math.max(
    0,
    Math.min(DAYS - 1, Math.floor((today.getTime() - sunday.getTime()) / (24 * 60 * 60 * 1000))),
  );

  return (
    <DashboardCard title="Production Timeline" rightSlot={<PeriodPill />}>
      {runs.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">
          Nothing scheduled this week. Create a production order to see it on
          the timeline.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header row — day labels */}
            <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-border pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <div className="pr-2">Product</div>
              {days.map((d, i) => {
                const isToday = i === todayIdx;
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      'text-center',
                      isToday ? 'text-brand-700' : 'text-slate-500',
                    )}
                  >
                    <div>
                      {d.toLocaleDateString('en-NG', {
                        month: 'short',
                        day: '2-digit',
                      })}
                    </div>
                    <div className="text-[9px] font-medium text-slate-400">
                      {d.toLocaleDateString('en-NG', { weekday: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div className="relative mt-2 space-y-1.5">
              {/* Today vertical line — drawn from the top of the first row to the bottom of the last */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 top-0 z-0 border-l border-dashed border-rose-400"
                style={{
                  // 140px label column + (todayIdx + 0.5) / 7 of the remaining width
                  left: `calc(140px + (100% - 140px) * ${(todayIdx + 0.5) / DAYS})`,
                }}
              />

              {runs.map((r) => {
                const item = r.items[0];
                const productName = item?.product?.name ?? r.title ?? 'Production';
                const qty = item?.quantity ?? 0;
                return (
                  <Row
                    key={r.id}
                    name={productName}
                    qty={qty}
                    unit="pcs"
                    status={r.status}
                    start={r.plannedStartAt ?? r.startedAt ?? null}
                    end={r.plannedEndAt ?? r.completedAt ?? null}
                    sunday={sunday}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

function Row({
  name,
  qty,
  unit,
  status,
  start,
  end,
  sunday,
}: {
  name: string;
  qty: number;
  unit: string;
  status: string;
  start: Date | null;
  end: Date | null;
  sunday: Date;
}) {
  const tone = STATUS_BAR_TONE[status] ?? STATUS_BAR_TONE.PLANNED;
  const label = STATUS_LABEL[status] ?? status;

  // Compute day spans, clipped to [0, 6].
  const dayMs = 24 * 60 * 60 * 1000;
  const startIdx = start
    ? Math.floor((start.getTime() - sunday.getTime()) / dayMs)
    : null;
  const endIdx = end
    ? Math.floor((end.getTime() - sunday.getTime()) / dayMs)
    : null;
  const colStart = startIdx == null ? 0 : Math.max(0, Math.min(DAYS - 1, startIdx));
  const colEnd = endIdx == null
    ? colStart
    : Math.max(colStart, Math.min(DAYS - 1, endIdx));
  const span = colEnd - colStart + 1;

  return (
    <div className="grid grid-cols-[140px_repeat(7,1fr)] items-center gap-y-0.5">
      {/* Product label */}
      <div className="pr-2 text-xs">
        <div className="truncate font-semibold text-ink">{name}</div>
        <div className="text-[10px] text-slate-500">
          {qty} {unit}
        </div>
      </div>

      {/* Day cells (background grid) */}
      {Array.from({ length: DAYS }, (_, i) => (
        <div
          key={i}
          className="relative h-7 border-l border-slate-100 first:border-l-0"
        />
      ))}

      {/* Bar — positioned via grid column span */}
      <div
        className="col-span-7 row-start-1 -mt-7 grid grid-cols-7 gap-0 px-0.5"
        style={{ gridColumn: '2 / span 7' }}
      >
        <div
          className={cn(
            'flex h-6 items-center justify-center self-center truncate rounded-md border px-2 text-[10px] font-bold',
            tone,
          )}
          style={{
            gridColumn: `${colStart + 1} / span ${span}`,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
