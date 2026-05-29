'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ShoppingCart, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertRow = {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
  severity: string;
  recommendedAction: string;
  neededByDate: string | null;
  productionNumber: string;
  productionStatus: string;
  productionOrderId: string;
};

const SEVERITY_TONE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-owed-100 text-owed-800',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-rose-100 text-rose-700',
};

const ACTION_LABEL: Record<string, string> = {
  BUY_MATERIAL: 'Buy material',
  REDUCE_PRODUCTION: 'Reduce production',
  USE_SUBSTITUTE: 'Use substitute',
  DELAY_PRODUCTION: 'Delay production',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ShortageAlertList({ rows }: { rows: AlertRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function act(
    id: string,
    action: 'resolve' | 'ignore',
    note?: string,
    recommendedAction?: string,
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/shortages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note, recommendedAction }),
      });
      if (res.ok) startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="card flex items-center gap-3 p-6">
        <CheckCircle2 size={20} className="text-success-600" />
        <div>
          <div className="text-sm font-semibold text-success-700">
            No open shortage alerts
          </div>
          <p className="text-xs text-slate-500">
            Every active production run has the materials it needs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="card flex flex-col gap-3 p-4 md:flex-row md:items-center"
        >
          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  SEVERITY_TONE[r.severity] ?? 'bg-slate-100 text-slate-700',
                )}
              >
                <AlertTriangle size={10} className="mr-1" />
                {r.severity}
              </span>
              <span className="text-sm font-semibold text-ink">
                {r.materialName}
              </span>
              <span className="text-xs text-slate-500">
                Short {r.shortageQuantity} {r.unit} · need {r.requiredQuantity}, have{' '}
                {r.availableQuantity}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              For{' '}
              <Link
                href={`/production/${r.productionOrderId}`}
                className="font-mono font-semibold text-brand-700 hover:underline"
              >
                {r.productionNumber}
              </Link>{' '}
              ({r.productionStatus.replace(/_/g, ' ').toLowerCase()})
              {r.neededByDate ? <> · needed by {formatDate(r.neededByDate)}</> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/purchase-orders/new?materialId=${r.materialId}&qty=${r.shortageQuantity}`}
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <ShoppingCart size={12} />
              {ACTION_LABEL[r.recommendedAction] ?? 'Buy'}
            </Link>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => act(r.id, 'resolve')}
              className="inline-flex items-center gap-1 rounded-md border border-success-200 bg-success-50 px-2.5 py-1.5 text-xs font-semibold text-success-700 hover:bg-success-100 disabled:opacity-50"
            >
              <CheckCircle2 size={12} />
              Resolve
            </button>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => act(r.id, 'ignore')}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <X size={12} />
              Ignore
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
