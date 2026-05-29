'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Square,
  AlertTriangle,
  Factory,
  Calendar,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export type KanbanItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export type KanbanCard = {
  id: string;
  productionNumber: string;
  status: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  customerOrder: {
    orderNumber: string;
    customerName: string;
  } | null;
  items: KanbanItem[];
  batchNumber: string | null;
  notes: string | null;
};

type ColumnDef = {
  key: 'PLANNED' | 'MATERIALS_NEEDED' | 'IN_PRODUCTION' | 'COMPLETED';
  title: string;
  accent: string;
  // Show on the card's primary action.
  cta?: 'start' | 'complete';
};

const COLUMNS: ColumnDef[] = [
  { key: 'PLANNED', title: 'Planned', accent: 'border-slate-300 text-slate-700' },
  {
    key: 'MATERIALS_NEEDED',
    title: 'Materials needed',
    accent: 'border-owed-300 text-owed-700',
  },
  {
    key: 'IN_PRODUCTION',
    title: 'In production',
    accent: 'border-blue-400 text-blue-700',
    cta: 'complete',
  },
  {
    key: 'COMPLETED',
    title: 'Completed',
    accent: 'border-success-400 text-success-700',
  },
];

const STATUS_DOT: Record<string, string> = {
  PLANNED: 'bg-slate-400',
  MATERIALS_NEEDED: 'bg-owed-500',
  IN_PRODUCTION: 'bg-blue-500',
  COMPLETED: 'bg-success-500',
  DELAYED: 'bg-rose-500',
  CANCELLED: 'bg-slate-300',
};

function durationSince(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h <= 0 && m <= 0) return '0m';
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function ProductionKanban({ cards }: { cards: KanbanCard[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const out: Record<string, KanbanCard[]> = {
      PLANNED: [],
      MATERIALS_NEEDED: [],
      IN_PRODUCTION: [],
      COMPLETED: [],
    };
    for (const c of cards) {
      if (c.status === 'DELAYED') {
        // Treat delayed runs as in-production but flag them on the card.
        out.IN_PRODUCTION.push(c);
      } else if (out[c.status]) {
        out[c.status].push(c);
      }
    }
    return out;
  }, [cards]);

  async function transition(id: string, action: 'start' | 'complete') {
    setBusyId(id);
    try {
      const res = await fetch(`/api/production-orders/${id}/${action}`, {
        method: 'POST',
      });
      if (res.ok) {
        startTransition(() => router.refresh());
      }
    } finally {
      setBusyId(null);
    }
  }

  const totalQty = (items: KanbanItem[]) =>
    items.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 lg:grid-cols-4 lg:grid-flow-row">
      {COLUMNS.map((col) => {
        const items = grouped[col.key];
        const colQty = items.reduce(
          (s, c) => s + totalQty(c.items),
          0,
        );
        return (
          <section
            key={col.key}
            className={cn(
              'flex min-w-[260px] flex-col rounded-xl border-t-4 bg-slate-50/60',
              col.accent,
            )}
          >
            <header className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {col.title}
                </div>
                <div className="text-[10px] text-slate-500">
                  {items.length}{' '}
                  {items.length === 1 ? 'run' : 'runs'}
                  {colQty > 0 ? ` · ${colQty.toLocaleString('en-NG')} units` : ''}
                </div>
              </div>
              {col.key === 'PLANNED' && (
                <Link
                  href="/production/new"
                  aria-label="Add production run"
                  className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-brand-700"
                >
                  <Plus size={14} />
                </Link>
              )}
            </header>

            <div className="flex-1 space-y-2 px-2 pb-2">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white/40 px-3 py-6 text-center text-xs text-slate-400">
                  No runs
                </div>
              ) : (
                items.map((c) => (
                  <article
                    key={c.id}
                    className="group rounded-lg border border-border bg-white shadow-sm transition hover:shadow-md"
                  >
                    {/* Top bar — status / action */}
                    <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        <span
                          className={cn(
                            'inline-block h-2 w-2 rounded-full',
                            STATUS_DOT[c.status] ?? 'bg-slate-300',
                          )}
                        />
                        {c.status === 'IN_PRODUCTION' && c.startedAt
                          ? durationSince(c.startedAt)
                          : c.status.replace(/_/g, ' ')}
                      </span>
                      {col.cta === 'complete' ? (
                        <button
                          type="button"
                          onClick={() => transition(c.id, 'complete')}
                          disabled={busyId === c.id}
                          className="inline-flex items-center gap-1 rounded-md bg-success-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-success-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={10} />
                          Done
                        </button>
                      ) : col.key === 'PLANNED' || col.key === 'MATERIALS_NEEDED' ? (
                        <button
                          type="button"
                          onClick={() => transition(c.id, 'start')}
                          disabled={busyId === c.id}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-50',
                            col.key === 'MATERIALS_NEEDED'
                              ? 'bg-owed-600 hover:bg-owed-700'
                              : 'bg-brand-600 hover:bg-brand-700',
                          )}
                        >
                          <Play size={10} />
                          Start
                        </button>
                      ) : null}
                    </header>

                    {/* Body */}
                    <Link
                      href={`/production/${c.id}`}
                      className="block px-2.5 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[11px] font-bold text-brand-700">
                            {c.productionNumber}
                          </div>
                          {c.customerOrder && (
                            <div className="text-xs text-slate-500">
                              {c.customerOrder.orderNumber} ·{' '}
                              <span className="truncate">{c.customerOrder.customerName}</span>
                            </div>
                          )}
                        </div>
                        {c.status === 'IN_PRODUCTION' && (
                          <Factory
                            size={14}
                            className="shrink-0 text-blue-500"
                          />
                        )}
                      </div>

                      {/* Items */}
                      <ul className="mt-1.5 space-y-0.5">
                        {c.items.slice(0, 3).map((it, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-2 text-xs text-slate-700"
                          >
                            <span className="truncate">{it.productName}</span>
                            <span className="num shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              {it.quantity}
                            </span>
                          </li>
                        ))}
                        {c.items.length > 3 && (
                          <li className="text-[10px] text-slate-400">
                            +{c.items.length - 3} more
                          </li>
                        )}
                      </ul>

                      {/* Meta footer */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                        {c.plannedEndAt && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Calendar size={10} />
                            {formatDate(new Date(c.plannedEndAt))}
                          </span>
                        )}
                        {c.batchNumber && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">
                            {c.batchNumber}
                          </span>
                        )}
                        {c.status === 'DELAYED' && (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700">
                            <AlertTriangle size={10} />
                            Delayed
                          </span>
                        )}
                      </div>
                    </Link>
                  </article>
                ))
              )}
            </div>

            <footer className="border-t border-slate-200 px-2 py-2">
              <Link
                href={
                  col.key === 'PLANNED'
                    ? '/production/new'
                    : `/production?status=${col.key}`
                }
                className="block w-full rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-700"
              >
                {col.key === 'PLANNED' ? '+ Add manufacturing task' : 'View all'}
              </Link>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
