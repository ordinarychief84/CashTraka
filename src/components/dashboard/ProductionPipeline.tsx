import Link from 'next/link';
import { Factory, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';

/**
 * Mini production pipeline — 5 status columns, count + spark of recent
 * runs each. Drills through to the full Kanban at /production.
 */
export async function ProductionPipeline({ userId }: { userId: string }) {
  const counts = await prisma.productionOrder.groupBy({
    by: ['status'],
    where: { userId, deletedAt: null, status: { not: 'CANCELLED' } },
    _count: { _all: true },
  });

  const byStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  const total = [...byStatus.values()].reduce((s, n) => s + n, 0);

  if (total === 0) return null;

  const columns = [
    { key: 'PLANNED', label: 'Planned', tone: 'bg-slate-100 text-slate-700' },
    {
      key: 'MATERIALS_NEEDED',
      label: 'Materials needed',
      tone: 'bg-owed-100 text-owed-800',
    },
    {
      key: 'READY_TO_PRODUCE',
      label: 'Ready',
      tone: 'bg-violet-100 text-violet-700',
    },
    {
      key: 'IN_PRODUCTION',
      label: 'In production',
      tone: 'bg-blue-100 text-blue-700',
    },
    {
      key: 'COMPLETED',
      label: 'Completed',
      tone: 'bg-success-100 text-success-700',
    },
  ];

  return (
    <section className="mb-6 card p-5">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <Factory size={14} />
          Production pipeline
        </h2>
        <Link
          href="/production"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
        >
          Open board <ArrowRight size={12} />
        </Link>
      </header>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {columns.map((c) => (
          <Link
            key={c.key}
            href={`/production?status=${c.key}`}
            className={`rounded-lg border border-border bg-white px-3 py-2.5 transition hover:-translate-y-0.5`}
          >
            <div
              className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.tone}`}
            >
              {c.label}
            </div>
            <div className="num text-2xl font-black text-ink">
              {byStatus.get(c.key) ?? 0}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
