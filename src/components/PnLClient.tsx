'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Users,
  ShoppingBag,
  Home,
  Briefcase,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
} from 'lucide-react';

type Period = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';

type PnLData = {
  period: { label: string; start: string; end: string };
  current: {
    revenue: { payments: number; paymentCount: number; sales: number; salesCount: number; rent: number; rentCount: number; total: number };
    expenses: { operating: number; payroll: number; payrollCount: number; categories: { category: string; amount: number }[]; total: number };
    netIncome: number;
    profitMargin: number;
  };
  previous: {
    revenue: { total: number };
    expenses: { total: number };
    netIncome: number;
    profitMargin: number;
  };
  months: { label: string; revenue: number; expenses: number; net: number }[];
  isPm: boolean;
  snapshot: { outstandingDebts: number; debtCount: number };
};

const PERIODS: { value: Period; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

function formatNaira(n: number) {
  const abs = Math.abs(n);
  const formatted = '₦' + abs.toLocaleString('en-NG');
  return n < 0 ? '-' + formatted : formatted;
}

function formatCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n < 0 ? '-' : '') + '₦' + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n < 0 ? '-' : '') + '₦' + (abs / 1_000).toFixed(0) + 'K';
  return formatNaira(n);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function ChangeBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  const pct = pctChange(current, previous);
  if (pct === null) return null;
  const isPositive = invert ? pct < 0 : pct > 0;
  const isNeutral = pct === 0;
  return (
    <span className={'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ' +
      (isNeutral ? 'bg-slate-100 text-slate-500' :
       isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')
    }>
      {isNeutral ? <Minus size={10} /> : pct > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(pct)}%
    </span>
  );
}

export function PnLClient() {
  const [period, setPeriod] = useState<Period>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandExpenses, setExpandExpenses] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        if (customFrom) params.set('from', customFrom);
        if (customTo) params.set('to', customTo);
      }
      const res = await fetch('/api/reports/pnl?' + params.toString());
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
    } catch {
      setError('Could not load financial data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle size={24} className="mx-auto text-red-400 mb-2" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { current: c, previous: p, months, isPm, snapshot } = data;
  const maxBar = Math.max(...months.map((m) => Math.max(m.revenue, m.expenses)), 1);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {period === 'custom' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">From</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">To</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none" />
              </div>
            </div>
          </>
        )}
        {loading && <Loader2 size={16} className="animate-spin text-slate-400 mb-2" />}
      </div>

      {/* Hero KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Revenue</span>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCompact(c.revenue.total)}</div>
          <ChangeBadge current={c.revenue.total} previous={p.revenue.total} />
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Costs</span>
            <Receipt size={14} className="text-red-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCompact(c.expenses.total)}</div>
          <ChangeBadge current={c.expenses.total} previous={p.expenses.total} invert />
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Net Income</span>
            <DollarSign size={14} className={c.netIncome >= 0 ? 'text-emerald-500' : 'text-red-500'} />
          </div>
          <div className={'text-xl font-bold ' + (c.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700')}>
            {formatCompact(c.netIncome)}
          </div>
          <ChangeBadge current={c.netIncome} previous={p.netIncome} />
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Profit Margin</span>
            <Briefcase size={14} className="text-slate-400" />
          </div>
          <div className={'text-xl font-bold ' + (c.profitMargin >= 0 ? 'text-emerald-700' : 'text-red-700')}>
            {c.profitMargin}%
          </div>
          {p.profitMargin !== c.profitMargin && (
            <span className="text-[11px] text-slate-400">was {p.profitMargin}%</span>
          )}
        </div>
      </div>

      {/* P&L Statement */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">Profit & Loss Statement</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {new Date(data.period.start).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' — '}
            {new Date(data.period.end).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="divide-y">
          {/* REVENUE */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-700">Revenue</h3>
              <span className="text-sm font-bold text-emerald-700">{formatNaira(c.revenue.total)}</span>
            </div>
            <div className="space-y-2">
              {c.revenue.payments > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Users size={14} className="text-slate-400" />
                    Customer Payments
                    <span className="text-[11px] text-slate-400">({c.revenue.paymentCount})</span>
                  </span>
                  <span className="font-semibold text-slate-900">{formatNaira(c.revenue.payments)}</span>
                </div>
              )}
              {c.revenue.sales > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <ShoppingBag size={14} className="text-slate-400" />
                    Sales Revenue
                    <span className="text-[11px] text-slate-400">({c.revenue.salesCount})</span>
                  </span>
                  <span className="font-semibold text-slate-900">{formatNaira(c.revenue.sales)}</span>
                </div>
              )}
              {isPm && c.revenue.rent > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Home size={14} className="text-slate-400" />
                    Rent Income
                    <span className="text-[11px] text-slate-400">({c.revenue.rentCount})</span>
                  </span>
                  <span className="font-semibold text-slate-900">{formatNaira(c.revenue.rent)}</span>
                </div>
              )}
              {c.revenue.total === 0 && (
                <p className="text-xs text-slate-400 italic">No revenue recorded this period</p>
              )}
            </div>
          </div>

          {/* EXPENSES */}
          <div className="px-6 py-4">
            <button onClick={() => setExpandExpenses(!expandExpenses)}
              className="flex w-full items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-red-600">Costs & Expenses</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-red-600">{formatNaira(c.expenses.total)}</span>
                {expandExpenses ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </div>
            </button>
            {expandExpenses && (
              <div className="space-y-2">
                {c.expenses.categories.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 capitalize">{cat.category}</span>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-red-400 h-full rounded-full"
                          style={{ width: Math.max((cat.amount / (c.expenses.total || 1)) * 100, 2) + '%' }} />
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums w-24 text-right">{formatNaira(cat.amount)}</span>
                    </div>
                  </div>
                ))}
                {c.expenses.payroll > 0 && (
                  <div className="flex items-center justify-between text-sm border-t pt-2">
                    <span className="flex items-center gap-2 text-slate-600">
                      <Briefcase size={14} className="text-slate-400" />
                      Payroll
                      <span className="text-[11px] text-slate-400">({c.expenses.payrollCount} payments)</span>
                    </span>
                    <span className="font-semibold text-slate-900">{formatNaira(c.expenses.payroll)}</span>
                  </div>
                )}
                {c.expenses.total === 0 && (
                  <p className="text-xs text-slate-400 italic">No expenses recorded this period</p>
                )}
              </div>
            )}
          </div>

          {/* NET INCOME */}
          <div className={'px-6 py-4 ' + (c.netIncome >= 0 ? 'bg-emerald-50' : 'bg-red-50')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={'text-sm font-bold ' + (c.netIncome >= 0 ? 'text-emerald-800' : 'text-red-800')}>
                  Net Income
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Revenue minus all costs</p>
              </div>
              <div className="text-right">
                <div className={'text-xl font-bold ' + (c.netIncome >= 0 ? 'text-emerald-800' : 'text-red-800')}>
                  {formatNaira(c.netIncome)}
                </div>
                <ChangeBadge current={c.netIncome} previous={p.netIncome} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">6-Month Trend</h2>
        </div>
        <div className="p-6">
          {/* Chart */}
          <div className="space-y-3">
            {months.map((m) => (
              <div key={m.label} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-600 w-12">{m.label}</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-emerald-600 font-semibold">{formatCompact(m.revenue)}</span>
                    <span className="text-red-500 font-semibold">{formatCompact(m.expenses)}</span>
                    <span className={'font-bold w-16 text-right ' + (m.net >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                      {m.net >= 0 ? '+' : ''}{formatCompact(m.net)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 h-3">
                  <div className="bg-emerald-400 rounded-full transition-all"
                    style={{ width: Math.max((m.revenue / maxBar) * 100, 0.5) + '%' }} />
                  <div className="bg-red-300 rounded-full transition-all"
                    style={{ width: Math.max((m.expenses / maxBar) * 100, 0.5) + '%' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 mt-4 pt-3 border-t text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-300" /> Expenses</span>
          </div>
        </div>
      </div>

      {/* Outstanding debts snapshot */}
      {snapshot.outstandingDebts > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">Outstanding Receivables</h3>
              <p className="text-sm text-amber-700 mt-1">
                You have <strong>{formatNaira(snapshot.outstandingDebts)}</strong> in unpaid debts across{' '}
                <strong>{snapshot.debtCount}</strong> open {snapshot.debtCount === 1 ? 'account' : 'accounts'}.
                Collecting these would increase your revenue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
