import Link from 'next/link';
import {
  ClipboardList,
  Factory,
  AlertTriangle,
  Boxes,
  ShoppingCart,
  TrendingUp,
  Package,
  CheckCircle2,
  Receipt,
  CalendarX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { operationsReportService } from '@/lib/services/operations-report.service';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const SEVERITY_TONE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-rose-100 text-rose-700',
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function OperationsReportsPage() {
  const user = await guard();
  const [
    pending,
    inProgress,
    delayed,
    lowMaterials,
    lowProducts,
    expiringMats,
    movementSummary,
    salesByProduct,
    purchaseRecs,
    estVsActual,
    damaged,
    outstandingInvoices,
  ] = await Promise.all([
    operationsReportService.pendingOrders(user.id),
    operationsReportService.productionInProgress(user.id),
    operationsReportService.delayedProduction(user.id),
    operationsReportService.lowStockMaterials(user.id),
    operationsReportService.lowStockProducts(user.id),
    operationsReportService.expiringMaterials(user.id),
    operationsReportService.stockMovementSummary(user.id, 30),
    operationsReportService.salesByProduct(user.id, 30),
    operationsReportService.purchaseRecommendations(user.id),
    operationsReportService.estimatedVsActual(user.id, 90),
    operationsReportService.damagedSummary(user.id, 90),
    operationsReportService.outstandingInvoices(user.id),
  ]);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Operations reports"
        subtitle="Live operational state across orders, production, materials, and finance."
        backHref="/reports"
      />

      {/* Summary tiles */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={ClipboardList}
          label="Pending orders"
          value={pending.length}
          href="/orders"
        />
        <Tile
          icon={Factory}
          label="In production"
          value={inProgress.length}
          href="/production?status=IN_PRODUCTION"
        />
        <Tile
          icon={CalendarX}
          label="Delayed"
          value={delayed.length}
          tone={delayed.length > 0 ? 'rose' : 'slate'}
          href="/production?status=DELAYED"
        />
        <Tile
          icon={AlertTriangle}
          label="Purchase recs"
          value={purchaseRecs.length}
          tone={purchaseRecs.length > 0 ? 'amber' : 'slate'}
          href="/shortages"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pending orders */}
        <Section icon={ClipboardList} title="Pending orders" count={pending.length}>
          {pending.length === 0 ? (
            <Empty text="No orders waiting to be fulfilled." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {pending.slice(0, 10).map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <div className="truncate text-xs text-slate-500">
                      {o.customerName} ·{' '}
                      {o.items.length === 1
                        ? o.items[0].description
                        : `${o.items.length} items`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm font-semibold text-ink">
                      {formatKobo(o.totalKobo)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatDate(o.dueAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* In-production runs */}
        <Section
          icon={Factory}
          title="Production in progress"
          count={inProgress.length}
        >
          {inProgress.length === 0 ? (
            <Empty text="No active runs." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {inProgress.slice(0, 10).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div>
                    <Link
                      href={`/production/${r.id}`}
                      className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                    >
                      {r.productionNumber}
                    </Link>
                    <div className="truncate text-xs text-slate-500">
                      {r.items.map((it) => it.product.name).join(', ')}
                      {r.customerOrder
                        ? ` · ${r.customerOrder.customerName}`
                        : ''}
                    </div>
                  </div>
                  <span className="num text-xs text-slate-500">
                    {r.items.reduce((s, it) => s + it.quantity, 0)} units
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Delayed */}
        <Section icon={CalendarX} title="Delayed production" count={delayed.length}>
          {delayed.length === 0 ? (
            <Empty text="No delays. Nice." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {delayed.slice(0, 10).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div>
                    <Link
                      href={`/production/${r.id}`}
                      className="font-mono text-xs font-semibold text-rose-700 hover:underline"
                    >
                      {r.productionNumber}
                    </Link>
                    <div className="truncate text-xs text-slate-500">
                      Due {formatDate(r.plannedEndAt)} · {r.status.replace(/_/g, ' ').toLowerCase()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Low stock materials */}
        <Section icon={Boxes} title="Low-stock materials" count={lowMaterials.length}>
          {lowMaterials.length === 0 ? (
            <Empty text="No materials at or below reorder level." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {lowMaterials.slice(0, 10).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <Link
                    href={`/materials/${m.id}`}
                    className="text-sm font-medium text-slate-800 hover:text-brand-700"
                  >
                    {m.name}
                  </Link>
                  <span className="num text-xs text-slate-500">
                    {m.stock} {m.unit} · reorder at {m.reorderLevel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Out-of-stock products */}
        <Section icon={Package} title="Low-stock products" count={lowProducts.length}>
          {lowProducts.length === 0 ? (
            <Empty text="All products are in good shape." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {lowProducts.slice(0, 10).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <Link
                    href={`/products/${p.id}`}
                    className="text-sm font-medium text-slate-800 hover:text-brand-700"
                  >
                    {p.name}
                  </Link>
                  <span className="num text-xs text-slate-500">
                    {p.stock} in stock
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Expiring materials */}
        <Section
          icon={AlertTriangle}
          title="Expiring materials (30d)"
          count={expiringMats.length}
        >
          {expiringMats.length === 0 ? (
            <Empty text="Nothing expiring within 30 days." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {expiringMats.slice(0, 10).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <Link
                    href={`/materials/${m.id}`}
                    className="text-sm font-medium text-slate-800 hover:text-brand-700"
                  >
                    {m.name}
                  </Link>
                  <span className="text-xs font-semibold text-amber-700">
                    {formatDate(m.expiresAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Purchase recommendations */}
        <Section
          icon={ShoppingCart}
          title="Purchase recommendations"
          count={purchaseRecs.length}
        >
          {purchaseRecs.length === 0 ? (
            <Empty text="Nothing to buy right now." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {purchaseRecs.slice(0, 10).map((p) => (
                <li
                  key={p.materialId}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/materials/${p.materialId}`}
                      className="text-sm font-medium text-slate-800 hover:text-brand-700"
                    >
                      {p.materialName}
                    </Link>
                    <div className="text-xs text-slate-500">
                      For {p.productionRefs.length}{' '}
                      {p.productionRefs.length === 1 ? 'run' : 'runs'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        SEVERITY_TONE[p.severity] ?? 'bg-slate-100',
                      )}
                    >
                      {p.severity}
                    </span>
                    <span className="num text-sm font-semibold text-rose-700">
                      {p.totalShortage} {p.unit}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Sales by product */}
        <Section
          icon={TrendingUp}
          title="Top products (30d)"
          count={salesByProduct.length}
        >
          {salesByProduct.length === 0 ? (
            <Empty text="No fulfilled orders yet in the last 30 days." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {salesByProduct.slice(0, 10).map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">
                      {p.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.quantity} units · {p.orders} orders
                    </div>
                  </div>
                  <span className="num text-sm font-semibold text-emerald-700">
                    {formatKobo(p.revenueKobo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Estimated vs actual */}
        <Section
          icon={Factory}
          title="Recent completed runs"
          count={estVsActual.length}
        >
          {estVsActual.length === 0 ? (
            <Empty text="No completed production runs in the last 90 days." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {estVsActual.slice(0, 10).map((r) => (
                <li key={r.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/production/${r.id}`}
                      className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                    >
                      {r.productionNumber}
                    </Link>
                    <span className="num text-xs text-slate-500">
                      {formatDate(r.completedAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {r.productNames}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500">
                      {r.acceptedQuantity}/{r.plannedQuantity} units
                      {r.damagedQuantity > 0 ? ` · ${r.damagedQuantity} damaged` : ''}
                    </span>
                    <span className="num font-semibold text-emerald-700">
                      Margin {formatKobo(r.marginKobo)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Damaged summary */}
        <Section
          icon={AlertTriangle}
          title="Production yield (90d)"
          count={damaged.runs}
        >
          {damaged.runs === 0 ? (
            <Empty text="No runs completed in the last 90 days." />
          ) : (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Produced" value={damaged.totalProduced} />
              <Stat label="Damaged" value={damaged.totalDamaged} tone="rose" />
              <Stat label="Accepted" value={damaged.totalAccepted} tone="emerald" />
              <Stat
                label="Yield"
                value={damaged.yieldPct == null ? '—' : `${damaged.yieldPct}%`}
                tone="brand"
              />
            </dl>
          )}
        </Section>

        {/* Outstanding invoices */}
        <Section
          icon={Receipt}
          title="Outstanding invoices"
          count={outstandingInvoices.length}
        >
          {outstandingInvoices.length === 0 ? (
            <Empty text="Every invoice is paid or settled." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {outstandingInvoices.slice(0, 10).map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <div className="truncate text-xs text-slate-500">
                      {inv.customerName} · due {formatDate(inv.dueDate)}
                    </div>
                  </div>
                  <span className="num text-sm font-semibold text-ink">
                    {formatKobo(inv.total - (inv.amountPaid ?? 0))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Stock movements summary */}
        <Section
          icon={CheckCircle2}
          title="Stock movements (30d)"
          count={movementSummary.length}
        >
          {movementSummary.length === 0 ? (
            <Empty text="No stock movements in the last 30 days." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {movementSummary.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="text-xs text-slate-600">
                    {m.itemType} · {m.reason.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="num text-xs font-semibold text-slate-700">
                    {m.count} entries · net {m.totalDelta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  href,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  tone?: 'amber' | 'rose' | 'slate';
}) {
  const colour =
    tone === 'rose'
      ? 'text-rose-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-slate-800';
  return (
    <Link
      href={href}
      className="card flex flex-col gap-1 p-4 transition hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Icon size={12} />
        {label}
      </div>
      <div className={cn('text-3xl font-black', colour)}>{value}</div>
    </Link>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <Icon size={14} /> {title}
        </h2>
        {count > 0 && (
          <span className="num text-xs font-bold text-slate-500">{count}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-2 text-xs text-slate-500">{text}</p>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: 'rose' | 'emerald' | 'brand';
}) {
  const tones: Record<string, string> = {
    rose: 'text-rose-700 border-rose-100 bg-rose-50',
    emerald: 'text-emerald-700 border-emerald-100 bg-emerald-50',
    brand: 'text-brand-700 border-brand-100 bg-brand-50',
    default: 'text-slate-700 border-slate-200 bg-slate-50',
  };
  const cls = tones[tone ?? 'default'];
  return (
    <div className={cn('rounded-lg border p-3', cls)}>
      <dt className="text-[10px] font-bold uppercase tracking-wide">{label}</dt>
      <dd className="num mt-0.5 text-xl font-black">{value}</dd>
    </div>
  );
}
