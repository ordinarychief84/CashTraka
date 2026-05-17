'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  Loader2,
  Pencil,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { UpgradeChip } from '@/components/billing/UpgradeChip';

type LineItem = {
  rawMaterialId: string;
  rawMaterialName: string;
  qtyNeeded: number;
  unit: string;
  unitPriceKobo: number;
  totalKobo: number;
  isMissing: boolean;
};

type BatchCost = {
  materialCostKobo: number;
  totalCostKobo: number;
  revenueKobo: number;
  grossMarginBps: number;
  costPerUnitKobo: number;
  hasUnpricedMaterials: boolean;
  labourCostKobo: number;
  overheadCostKobo: number;
  lineItems: LineItem[];
  batchCostCalculatedAt: string | null;
  hasLinkedCustomerOrder: boolean;
};

type Props = {
  productionOrderId: string;
  hasFeature: boolean;
  /**
   * Initial server-rendered cost row. When null we poll briefly because
   * the fire-and-forget calc may still be in flight after status flipped
   * to COMPLETED.
   */
  initial: BatchCost | null;
};

const NAIRA = '₦';
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 30_000;

function naira(kobo: number): string {
  return NAIRA + Math.round(kobo / 100).toLocaleString('en-NG');
}

function nairaInput(kobo: number): string {
  return String(Math.round(kobo / 100));
}

function nairaToKobo(naira: string): number | null {
  const cleaned = naira.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

function marginPct(bps: number): string {
  // 4000 bps = 40.0%; one decimal place is plenty.
  return (bps / 100).toFixed(1) + '%';
}

function marginTone(bps: number): { cls: string; label: string | null } {
  if (bps < 0) return { cls: 'text-rose-700', label: 'Loss on this batch' };
  if (bps < 2000) return { cls: 'text-rose-700', label: null };
  if (bps < 4000) return { cls: 'text-amber-700', label: null };
  return { cls: 'text-success-700', label: null };
}

export function BatchCostPanel({ productionOrderId, hasFeature, initial }: Props) {
  const router = useRouter();
  const [cost, setCost] = useState<BatchCost | null>(initial);
  const [polling, setPolling] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  // Editing state for labour / overhead.
  const [editLabour, setEditLabour] = useState(false);
  const [editOverhead, setEditOverhead] = useState(false);
  const [labourDraft, setLabourDraft] = useState('');
  const [overheadDraft, setOverheadDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'labour' | 'overhead' | null>(null);

  // Poll for the fire-and-forget result when the panel renders without
  // a batchCostCalculatedAt timestamp (i.e. calc still in flight).
  useEffect(() => {
    if (!hasFeature) return;
    if (cost?.batchCostCalculatedAt) return;
    setPolling(true);
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > POLL_TIMEOUT_MS) {
        clearInterval(timer);
        setPolling(false);
        setPollTimedOut(true);
        return;
      }
      try {
        const res = await fetch(
          `/api/production-orders/${productionOrderId}/batch-cost`,
          { method: 'POST' },
        );
        if (!res.ok) return;
        const j = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: BatchCost;
        };
        if (j.success && j.data) {
          clearInterval(timer);
          setPolling(false);
          setCost(j.data);
        }
      } catch {
        /* ignore; we'll retry */
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasFeature, cost?.batchCostCalculatedAt, productionOrderId]);

  if (!hasFeature) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Batch cost breakdown
        </div>
        <UpgradeChip
          feature="batchCostIntelligence"
          suggestedPlanLabel="Pro"
          variant="block"
        />
      </div>
    );
  }

  if (!cost) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Batch cost breakdown
        </div>
        {pollTimedOut ? (
          <p className="text-sm text-slate-600">
            Cost calculation is taking longer than expected.{' '}
            <button
              type="button"
              onClick={() => router.refresh()}
              className="font-semibold text-brand-700 hover:underline"
            >
              Refresh
            </button>{' '}
            to check again.
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={14} className="animate-spin" />
            Calculating batch cost…
          </div>
        )}
      </div>
    );
  }

  const tone = marginTone(cost.grossMarginBps);
  const hasRevenue = cost.revenueKobo > 0;

  async function patch(
    which: 'labour' | 'overhead',
    nextKoboNumber: number,
  ): Promise<void> {
    setSaving(which);
    setEditError(null);
    const prev = cost!;
    // Optimistic placeholder so the totals don't blink to zero.
    const optimistic: BatchCost = {
      ...prev,
      labourCostKobo: which === 'labour' ? nextKoboNumber : prev.labourCostKobo,
      overheadCostKobo:
        which === 'overhead' ? nextKoboNumber : prev.overheadCostKobo,
    };
    setCost(optimistic);
    try {
      const res = await fetch(
        `/api/production-orders/${productionOrderId}/batch-cost`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labourCostKobo: which === 'labour' ? nextKoboNumber : prev.labourCostKobo,
            overheadCostKobo:
              which === 'overhead' ? nextKoboNumber : prev.overheadCostKobo,
          }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: BatchCost;
        error?: string;
      };
      if (!res.ok || !j.success || !j.data) {
        setCost(prev);
        setEditError(j.error || 'Could not save.');
        return;
      }
      setCost({ ...j.data, labourCostKobo: optimistic.labourCostKobo, overheadCostKobo: optimistic.overheadCostKobo });
      if (which === 'labour') setEditLabour(false);
      if (which === 'overhead') setEditOverhead(false);
    } catch {
      setCost(prev);
      setEditError('Network error.');
    } finally {
      setSaving(null);
    }
  }

  function startEdit(which: 'labour' | 'overhead') {
    setEditError(null);
    if (which === 'labour') {
      setLabourDraft(nairaInput(cost!.labourCostKobo));
      setEditLabour(true);
    } else {
      setOverheadDraft(nairaInput(cost!.overheadCostKobo));
      setEditOverhead(true);
    }
  }

  function commit(which: 'labour' | 'overhead') {
    const raw = which === 'labour' ? labourDraft : overheadDraft;
    const kobo = nairaToKobo(raw);
    if (kobo === null || kobo < 0) {
      setEditError('Enter a positive amount in naira.');
      return;
    }
    void patch(which, kobo);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Batch cost breakdown
        </div>
        {polling ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Loader2 size={11} className="animate-spin" /> Recalculating
          </div>
        ) : null}
      </div>

      {/* Material lines */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2 text-right">Unit ₦</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {cost.lineItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-xs text-slate-500">
                  No recipe lines on this run.
                </td>
              </tr>
            ) : (
              cost.lineItems.map((l) => (
                <tr key={l.rawMaterialId} className="border-t border-border/60">
                  <td className="px-3 py-2 text-slate-800">{l.rawMaterialName}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {l.qtyNeeded}{l.unit ? ` ${l.unit}` : null}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {l.isMissing ? (
                      <span className="text-amber-700">—</span>
                    ) : (
                      naira(l.unitPriceKobo)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    {naira(l.totalKobo)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cost.hasUnpricedMaterials ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">
              Some materials have no purchase price on record.
            </div>
            <div className="mt-0.5">
              Cost shown may be lower than actual.{' '}
              <Link
                href="/purchase-orders/new"
                className="font-semibold text-amber-900 underline"
              >
                Add purchase prices →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Labour + overhead */}
      <div className="mb-4 space-y-2">
        <EditableMoneyRow
          label="Labour cost"
          valueKobo={cost.labourCostKobo}
          editing={editLabour}
          draft={labourDraft}
          setDraft={setLabourDraft}
          onStart={() => startEdit('labour')}
          onCancel={() => setEditLabour(false)}
          onSave={() => commit('labour')}
          saving={saving === 'labour'}
        />
        <EditableMoneyRow
          label="Overhead cost"
          valueKobo={cost.overheadCostKobo}
          editing={editOverhead}
          draft={overheadDraft}
          setDraft={setOverheadDraft}
          onStart={() => startEdit('overhead')}
          onCancel={() => setEditOverhead(false)}
          onSave={() => commit('overhead')}
          saving={saving === 'overhead'}
        />
        {editError ? (
          <p className="text-xs text-rose-700">{editError}</p>
        ) : null}
      </div>

      <hr className="my-3 border-border" />

      {/* Totals */}
      <div className="space-y-1.5 text-sm">
        <Row label="Total cost" value={naira(cost.totalCostKobo)} bold />
        {hasRevenue ? (
          <Row label="Revenue" value={naira(cost.revenueKobo)} />
        ) : null}
      </div>

      {hasRevenue ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Gross margin
          </div>
          <div className={`mt-1 flex items-center justify-center gap-1.5 text-3xl font-black ${tone.cls}`}>
            {cost.grossMarginBps < 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
            {marginPct(cost.grossMarginBps)}
          </div>
          {tone.label ? (
            <div className="mt-1 text-xs font-semibold text-rose-700">{tone.label}</div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-slate-50/60 p-4 text-center text-xs text-slate-600">
          This production run has no linked customer order. Link an order to see profitability.
        </div>
      )}

      <div className="mt-4 text-[11px] text-slate-500">
        Cost per unit:{' '}
        <span className="font-semibold text-slate-700">{naira(cost.costPerUnitKobo)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-slate-600">{label}</div>
      <div className={bold ? 'font-bold text-slate-900' : 'text-slate-800'}>{value}</div>
    </div>
  );
}

function EditableMoneyRow({
  label,
  valueKobo,
  editing,
  draft,
  setDraft,
  onStart,
  onCancel,
  onSave,
  saving,
}: {
  label: string;
  valueKobo: number;
  editing: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!editing) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium text-slate-800 hover:bg-slate-100"
        >
          {NAIRA}
          {Math.round(valueKobo / 100).toLocaleString('en-NG')}
          <Pencil size={11} className="text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-slate-500">{NAIRA}</span>
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={onSave}
          disabled={saving}
          className="w-28 rounded-md border border-border px-2 py-1 text-right text-sm focus:border-brand-500 focus:outline-none"
        />
        {saving ? <Loader2 size={11} className="animate-spin text-slate-500" /> : null}
      </div>
    </div>
  );
}
