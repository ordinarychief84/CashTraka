'use client';

import { useState } from 'react';
import {
  BarChart3,
  ShoppingBag,
  Truck,
  Boxes,
  Factory,
  Banknote,
  MoreHorizontal,
  Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatKobo } from '@/lib/format';

export type ReportRow = {
  key: string;
  category: 'sales' | 'purchases' | 'inventory' | 'production' | 'customers' | 'suppliers' | 'payments' | 'aging';
  label: string;
  sublabel: string;
  period: string;
  totalRevenueKobo: number | null;
  totalCostKobo: number | null;
  grossProfitKobo: number | null;
  transactions: number;
  status: string;
  exportHref: string;
};

type Tab = 'OVERVIEW' | 'SALES' | 'PURCHASES' | 'INVENTORY' | 'PRODUCTION' | 'FINANCIAL';

const TABS: { value: Tab; label: string }[] = [
  { value: 'OVERVIEW', label: 'Overview' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PURCHASES', label: 'Purchases' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'FINANCIAL', label: 'Financial' },
];

const CATEGORY_ICON: Record<ReportRow['category'], LucideIcon> = {
  sales: ShoppingBag,
  purchases: Truck,
  inventory: Boxes,
  production: Factory,
  customers: BarChart3,
  suppliers: Truck,
  payments: Banknote,
  aging: BarChart3,
};

const TAB_FILTER: Record<Tab, ReportRow['category'][]> = {
  OVERVIEW: ['sales', 'purchases', 'inventory', 'production', 'customers', 'suppliers', 'payments', 'aging'],
  SALES: ['sales', 'customers'],
  PURCHASES: ['purchases', 'suppliers'],
  INVENTORY: ['inventory'],
  PRODUCTION: ['production'],
  FINANCIAL: ['payments', 'aging'],
};

/**
 * Reports table — rows are virtual: each represents a precomputed report
 * (Sales Summary, Inventory Summary, etc.) generated from live data.
 * Status reflects whether the report is current ("Generated") or empty
 * ("Pending"). Tabs filter by category. Download links call existing CSV
 * export endpoints.
 */
export function ReportsTable({ rows }: { rows: ReportRow[] }) {
  const [tab, setTab] = useState<Tab>('OVERVIEW');

  const filtered = rows.filter((r) => TAB_FILTER[tab].includes(r.category));

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border bg-white px-3 pt-3">
        {TABS.map((t) => {
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition',
                isActive
                  ? 'border-b-2 border-brand-500 text-brand-700'
                  : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Report Type</th>
                <th className="px-3 py-2.5">Period</th>
                <th className="px-3 py-2.5 text-right">Total Revenue</th>
                <th className="px-3 py-2.5 text-right">Total Cost</th>
                <th className="px-3 py-2.5 text-right">Gross Profit</th>
                <th className="px-3 py-2.5 text-right">Margin (%)</th>
                <th className="px-3 py-2.5 text-right">Transactions</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const Icon = CATEGORY_ICON[r.category];
                const margin =
                  r.grossProfitKobo != null && r.totalRevenueKobo && r.totalRevenueKobo > 0
                    ? Math.round((r.grossProfitKobo / r.totalRevenueKobo) * 100)
                    : null;
                const isNegative = (r.grossProfitKobo ?? 0) < 0;
                return (
                  <tr key={r.key} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                          <Icon size={14} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink">
                            {r.label}
                          </div>
                          <div className="text-[10px] capitalize text-slate-500">
                            {r.sublabel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      {r.period}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-sm font-semibold text-ink">
                      {r.totalRevenueKobo == null ? '—' : formatKobo(r.totalRevenueKobo)}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 align-middle text-right num text-sm font-semibold',
                        (r.totalCostKobo ?? 0) > 0 ? 'text-rose-700' : 'text-slate-500',
                      )}
                    >
                      {r.totalCostKobo == null ? '—' : formatKobo(r.totalCostKobo)}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 align-middle text-right num text-sm font-semibold',
                        r.grossProfitKobo == null
                          ? 'text-slate-500'
                          : isNegative
                            ? 'text-rose-700'
                            : 'text-success-700',
                      )}
                    >
                      {r.grossProfitKobo == null ? '—' : formatKobo(r.grossProfitKobo)}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-xs text-slate-600">
                      {margin == null ? '—' : `${margin}%`}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-xs text-slate-600">
                      {r.transactions.toLocaleString('en-NG')}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right">
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={r.exportHref}
                          download
                          title="Download CSV"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No reports for this tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-border md:hidden">
        {filtered.map((r) => {
          const Icon = CATEGORY_ICON[r.category];
          return (
            <li key={r.key} className="flex items-start gap-3 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                <Icon size={16} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-ink">{r.label}</div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-[11px] text-slate-500">{r.period}</div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {r.transactions} txn{r.transactions === 1 ? '' : 's'}
                  </span>
                  <span
                    className={cn(
                      'num font-semibold',
                      (r.grossProfitKobo ?? 0) >= 0 ? 'text-success-700' : 'text-rose-700',
                    )}
                  >
                    {r.grossProfitKobo == null ? '—' : formatKobo(r.grossProfitKobo)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">No reports.</li>
        )}
      </ul>
    </div>
  );
}
