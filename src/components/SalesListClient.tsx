'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Eye,
  TrendingUp,
  Calendar,
  Filter,
  ArrowUpDown,
  X,
  ShoppingBag,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';

type SaleRow = {
  id: string;
  saleNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  note: string | null;
  soldAt: string;
  itemCount: number;
  itemSummary: string;
};

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  TRANSFER: 'Transfer',
  POS: 'POS',
  CARD: 'Card',
};

const METHOD_STYLE: Record<string, string> = {
  CASH: 'bg-success-50 text-success-700',
  TRANSFER: 'bg-brand-50 text-brand-700',
  POS: 'bg-purple-50 text-purple-700',
  CARD: 'bg-slate-100 text-slate-600',
};

type DateTab = 'today' | 'week' | 'month' | 'all';
type SortBy = 'newest' | 'oldest' | 'highest' | 'lowest';

export function SalesListClient({ sales }: { sales: SaleRow[] }) {
  const [dateTab, setDateTab] = useState<DateTab>('all');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = useMemo(() => {
    let result = [...sales];

    // Date filter
    if (dateTab === 'today') {
      result = result.filter((s) => new Date(s.soldAt) >= todayStart);
    } else if (dateTab === 'week') {
      result = result.filter((s) => new Date(s.soldAt) >= weekStart);
    } else if (dateTab === 'month') {
      result = result.filter((s) => new Date(s.soldAt) >= monthStart);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.saleNumber.toLowerCase().includes(q) ||
          s.customerName?.toLowerCase().includes(q) ||
          s.itemSummary.toLowerCase().includes(q) ||
          s.note?.toLowerCase().includes(q),
      );
    }

    // Payment method
    if (methodFilter) {
      result = result.filter((s) => s.paymentMethod === methodFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime();
      if (sortBy === 'oldest') return new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime();
      if (sortBy === 'highest') return b.total - a.total;
      return a.total - b.total;
    });

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, dateTab, search, methodFilter, sortBy]);

  // Summary stats for visible sales
  const totalRevenue = filtered.reduce((s, r) => s + r.total, 0);
  const todaySales = sales.filter((s) => new Date(s.soldAt) >= todayStart);
  const todayRevenue = todaySales.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      {/* ── Today summary strip ──────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-success-50 to-brand-50 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success-100">
          <TrendingUp size={16} className="text-success-600" />
        </div>
        <div className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Today
          </span>
          <div className="flex items-baseline gap-2">
            <span className="num text-lg font-black text-ink">{formatNaira(todayRevenue)}</span>
            <span className="text-xs text-slate-500">
              {todaySales.length} {todaySales.length === 1 ? 'sale' : 'sales'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total shown
          </span>
          <div className="num text-sm font-bold text-slate-700">{formatNaira(totalRevenue)}</div>
        </div>
      </div>

      {/* ── Date tabs + search + filters ─────────────────────────── */}
      <div className="space-y-2">
        {/* Date tabs */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'all', label: 'All' },
            ] as { key: DateTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDateTab(tab.key)}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-semibold transition',
                dateTab === tab.key
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + filter toggle row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sales…"
              className="input pl-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition',
              showFilters || methodFilter || sortBy !== 'newest'
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-border text-slate-500 hover:bg-slate-50',
            )}
          >
            <Filter size={13} />
            Filter
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Method:</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="rounded-md border border-border bg-white px-2 py-1 text-xs"
              >
                <option value="">All</option>
                <option value="CASH">Cash</option>
                <option value="TRANSFER">Transfer</option>
                <option value="POS">POS</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={12} className="text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded-md border border-border bg-white px-2 py-1 text-xs"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
            </div>
            {(methodFilter || sortBy !== 'newest') && (
              <button
                onClick={() => {
                  setMethodFilter('');
                  setSortBy('newest');
                }}
                className="text-[11px] font-medium text-red-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Results count ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'sale' : 'sales'}
          {dateTab !== 'all' && ` · ${dateTab}`}
        </span>
      </div>

      {/* ── Sales list ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <ShoppingBag size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No sales match your filters</p>
          <p className="mt-1 text-xs text-slate-400">
            Try changing the date range or clearing your search.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => {
            const date = new Date(s.soldAt);
            const timeStr = date.toLocaleTimeString('en-NG', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateStr = date.toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
            });
            const isToday = date >= todayStart;

            return (
              <li key={s.id}>
                <Link
                  href={`/sales/${s.id}`}
                  className="card flex items-center gap-3 p-3.5 transition hover:ring-1 hover:ring-brand-200"
                >
                  {/* Left: sale info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink">{s.saleNumber}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          METHOD_STYLE[s.paymentMethod] || 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {METHOD_LABEL[s.paymentMethod] || s.paymentMethod}
                      </span>
                    </div>

                    {s.customerName && (
                      <div className="mt-0.5 truncate text-xs font-medium text-slate-600">
                        {s.customerName}
                      </div>
                    )}

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Calendar size={11} />
                      {isToday ? `Today, ${timeStr}` : `${dateStr}, ${timeStr}`}
                      <span className="text-slate-300">·</span>
                      {s.itemCount} {s.itemCount === 1 ? 'item' : 'items'}
                      {s.itemSummary && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="truncate">{s.itemSummary}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + view icon */}
                  <div className="flex items-center gap-2">
                    <span className="num text-sm font-black text-ink">{formatNaira(s.total)}</span>
                    <Eye size={14} className="text-slate-300" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
