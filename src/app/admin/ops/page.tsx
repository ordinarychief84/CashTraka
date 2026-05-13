import Link from 'next/link';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import { formatKobo, timeAgo } from '@/lib/format';
import {
  Boxes,
  Factory,
  PackageOpen,
  Truck,
  Layers,
  ScrollText,
  AlertTriangle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Cross-tenant Operations records browser. Surfaces the small-batch ops
 * entities (customer orders, production runs, materials, suppliers,
 * purchase orders, stock movements) globally so admins can spot a stuck
 * order or a tenant in trouble without needing to know which user it is.
 *
 * Read-only by design. To edit, click "Impersonate" on the owner.
 */
export default async function AdminOpsPage() {
  const admin = await requireAdminSection('ops');

  const recencyCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    orderCount,
    productionCount,
    materialCount,
    supplierCount,
    poCount,
    movementCount,
    activeShortageCount,
  ] = await Promise.all([
    prisma.customerOrder.count({ where: { deletedAt: null } }),
    prisma.productionOrder.count({ where: { deletedAt: null } }),
    prisma.rawMaterial.count({ where: { deletedAt: null } }),
    prisma.supplier.count({ where: { deletedAt: null } }),
    prisma.purchaseOrder.count({ where: { deletedAt: null } }),
    prisma.stockMovement.count({ where: { createdAt: { gte: recencyCutoff } } }),
    prisma.productionOrder.count({
      where: { status: 'MATERIALS_NEEDED', deletedAt: null },
    }),
  ]);

  const [recentOrders, recentProduction, lowMaterials, recentPOs, recentMovements] =
    await Promise.all([
      prisma.customerOrder.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, email: true, businessName: true } } },
      }),
      prisma.productionOrder.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, email: true, businessName: true } } },
      }),
      prisma.rawMaterial.findMany({
        where: {
          deletedAt: null,
          stock: { lte: prisma.rawMaterial.fields.reorderLevel },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, email: true, businessName: true } } },
      }),
      prisma.purchaseOrder.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, email: true, businessName: true } },
          supplier: { select: { name: true } },
        },
      }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: { select: { id: true, email: true, businessName: true } } },
      }),
    ]);

  return (
    <AdminShell adminName={admin.name} activePath="/admin/ops" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Operations records</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cross-tenant snapshot. Read-only — to edit, impersonate the owner from
          the user detail page.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Counter icon={PackageOpen} label="Customer orders" value={orderCount} />
        <Counter icon={Factory} label="Production runs" value={productionCount} />
        <Counter icon={Boxes} label="Raw materials" value={materialCount} />
        <Counter icon={Truck} label="Suppliers" value={supplierCount} />
        <Counter icon={Layers} label="Purchase orders" value={poCount} />
        <Counter icon={ScrollText} label="Stock moves (30d)" value={movementCount} />
        <Counter
          icon={AlertTriangle}
          label="Awaiting materials"
          value={activeShortageCount}
          warn={activeShortageCount > 0}
        />
      </div>

      <Section
        title="Recent customer orders"
        empty="No customer orders captured yet."
        href="/admin/users"
      >
        {recentOrders.map((o) => (
          <Row
            key={o.id}
            ownerEmail={o.user.email}
            ownerId={o.user.id}
            ownerLabel={o.user.businessName || o.user.email}
            primary={`${o.orderNumber} · ${o.customerName}`}
            secondary={`${o.status} · due ${o.dueAt ? new Date(o.dueAt).toLocaleDateString() : '—'}`}
            amount={formatKobo(o.totalKobo)}
            createdAt={o.createdAt}
          />
        ))}
      </Section>

      <Section
        title="Recent production runs"
        empty="No production runs scheduled yet."
        href="/admin/users"
      >
        {recentProduction.map((p) => (
          <Row
            key={p.id}
            ownerEmail={p.user.email}
            ownerId={p.user.id}
            ownerLabel={p.user.businessName || p.user.email}
            primary={`${p.productionNumber}`}
            secondary={p.status}
            amount=""
            createdAt={p.createdAt}
          />
        ))}
      </Section>

      <Section
        title="Materials at/below reorder level"
        empty="Nothing low across all tenants."
        href="/admin/users"
        warn={lowMaterials.length > 0}
      >
        {lowMaterials.map((m) => (
          <Row
            key={m.id}
            ownerEmail={m.user.email}
            ownerId={m.user.id}
            ownerLabel={m.user.businessName || m.user.email}
            primary={m.name}
            secondary={`stock ${m.stock} ${m.unit} (reorder at ${m.reorderLevel})`}
            amount=""
            createdAt={m.updatedAt}
          />
        ))}
      </Section>

      <Section
        title="Recent purchase orders"
        empty="No purchase orders yet."
        href="/admin/users"
      >
        {recentPOs.map((po) => (
          <Row
            key={po.id}
            ownerEmail={po.user.email}
            ownerId={po.user.id}
            ownerLabel={po.user.businessName || po.user.email}
            primary={`${po.poNumber} · ${po.supplier?.name ?? '—'}`}
            secondary={po.status}
            amount={formatKobo(po.totalKobo)}
            createdAt={po.createdAt}
          />
        ))}
      </Section>

      <Section
        title="Recent stock movements"
        empty="No stock movements in the last 30 days."
        href="/admin/users"
      >
        {recentMovements.map((mv) => (
          <Row
            key={mv.id}
            ownerEmail={mv.user.email}
            ownerId={mv.user.id}
            ownerLabel={mv.user.businessName || mv.user.email}
            primary={`${mv.reason} · ${mv.itemType} ${mv.itemId.slice(-6)}`}
            secondary={`${mv.delta > 0 ? '+' : ''}${mv.delta} (balance ${mv.balanceAfter})`}
            amount=""
            createdAt={mv.createdAt}
          />
        ))}
      </Section>
    </AdminShell>
  );
}

function Counter({
  icon: Icon,
  label,
  value,
  warn,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div
      className={
        'rounded-xl border bg-white p-4 shadow-sm ' +
        (warn ? 'border-amber-300' : 'border-border')
      }
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className={warn ? 'text-amber-600' : 'text-slate-500'} />
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
      </div>
      <div className={'mt-1 text-2xl font-bold ' + (warn ? 'text-amber-700' : 'text-slate-900')}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  empty,
  warn,
}: {
  title: string;
  children: React.ReactNode;
  empty: string;
  href?: string;
  warn?: boolean;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  const isEmpty = items.length === 0 || (items.length === 1 && !items[0]);
  return (
    <section className="mb-6 rounded-xl border border-border bg-white">
      <div
        className={
          'flex items-center justify-between border-b px-4 py-3 ' +
          (warn ? 'border-amber-200 bg-amber-50/50' : 'border-border')
        }
      >
        <h2 className={'text-sm font-bold ' + (warn ? 'text-amber-800' : 'text-ink')}>{title}</h2>
      </div>
      {isEmpty ? (
        <div className="px-4 py-6 text-center text-xs text-slate-500">{empty}</div>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </section>
  );
}

function Row({
  ownerEmail,
  ownerId,
  ownerLabel,
  primary,
  secondary,
  amount,
  createdAt,
}: {
  ownerEmail: string;
  ownerId: string;
  ownerLabel: string;
  primary: string;
  secondary: string;
  amount: string;
  createdAt: Date;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink">{primary}</div>
        <div className="mt-0.5 text-xs text-slate-500">{secondary}</div>
        <Link
          href={`/admin/users/${ownerId}`}
          className="mt-1 inline-block text-[11px] font-medium text-brand-600 hover:underline"
          title={ownerEmail}
        >
          {ownerLabel}
        </Link>
      </div>
      <div className="flex shrink-0 flex-col items-end text-right">
        {amount ? <span className="text-sm font-bold text-ink">{amount}</span> : null}
        <span className="text-[10px] text-slate-400">{timeAgo(createdAt)}</span>
      </div>
    </li>
  );
}
