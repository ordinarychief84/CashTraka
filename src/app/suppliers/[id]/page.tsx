import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Boxes,
  FileText,
  MessageCircle,
  Mail,
  Phone,
  CalendarCheck,
  Star,
  ShieldCheck,
  History,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { SupplierForm } from '@/components/ops/SupplierForm';
import { suppliersService } from '@/lib/services/suppliers.service';
import { formatKobo, formatDate, timeAgo } from '@/lib/format';
import { whatsappLink, normalizeNigerianPhone } from '@/lib/whatsapp.util';
import type { LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-blue-100 text-blue-700',
  ORDERED: 'bg-amber-100 text-amber-700',
  PARTIALLY_RECEIVED: 'bg-violet-100 text-violet-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const SUPPLIER_STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-700',
  BLACKLISTED: 'bg-rose-100 text-rose-700',
};

export default async function SupplierDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const user = await guard();
  let supplier;
  try {
    supplier = await suppliersService.getForUser(user.id, params.id);
  } catch {
    notFound();
  }

  // Pull full PO history (completed + cancelled) for the "Recent purchases" panel.
  const recentHistory = await prisma.purchaseOrder.findMany({
    where: {
      supplierId: supplier.id,
      userId: user.id,
      deletedAt: null,
      status: { in: ['RECEIVED', 'CANCELLED'] },
    },
    orderBy: { receivedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      poNumber: true,
      status: true,
      receivedAt: true,
      createdAt: true,
      totalKobo: true,
    },
  });

  const totalSpentKobo = recentHistory
    .filter((po) => po.status === 'RECEIVED')
    .reduce((s, po) => s + po.totalKobo, 0);

  const waPhone = normalizeNigerianPhone(
    supplier.whatsappNumber ?? supplier.phone ?? '',
  );
  const waLink =
    waPhone && supplier.phone
      ? whatsappLink(
          waPhone,
          `Hi ${supplier.contactPerson ?? supplier.name}, this is ${user.businessName ?? user.name} on CashTraka.`,
        )
      : null;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title={supplier.name}
        subtitle={supplier.supplierCategory ?? 'Supplier'}
        backHref="/suppliers"
        action={
          <div className="flex items-center gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            )}
            <Link
              href={`/purchase-orders/new?supplierId=${supplier.id}`}
              className="btn-pill-primary"
            >
              <FileText size={14} />
              New PO
            </Link>
          </div>
        }
      />
      {/* Performance strip — only shows once we've recorded at least one PO. */}
      {(supplier.onTimeDeliveryRating != null ||
        supplier.qualityRating != null ||
        supplier.lastPurchaseAt != null) && (
        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <StatTile
            icon={CalendarCheck}
            label="On-time delivery"
            value={
              supplier.onTimeDeliveryRating != null
                ? `${supplier.onTimeDeliveryRating}%`
                : '—'
            }
            tone="emerald"
          />
          <StatTile
            icon={ShieldCheck}
            label="Quality"
            value={
              supplier.qualityRating != null ? `${supplier.qualityRating}%` : '—'
            }
            tone="brand"
          />
          <StatTile
            icon={History}
            label="Last purchase"
            value={
              supplier.lastPurchaseAt
                ? timeAgo(supplier.lastPurchaseAt)
                : 'No purchases yet'
            }
            tone="slate"
          />
          <StatTile
            icon={Star}
            label="Total spent"
            value={totalSpentKobo > 0 ? formatKobo(totalSpentKobo) : '—'}
            tone="amber"
          />
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-3 flex items-center justify-between gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <span>Details</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  SUPPLIER_STATUS_TONE[supplier.status ?? 'ACTIVE'] ??
                  'bg-slate-100 text-slate-700'
                }`}
              >
                {(supplier.status ?? 'ACTIVE').toLowerCase()}
              </span>
            </h2>
            <SupplierForm initial={supplier} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <Boxes size={14} /> Materials supplied
            </h2>
            {supplier.rawMaterials.length === 0 ? (
              <p className="text-sm text-slate-500">
                No materials linked to this supplier yet.{' '}
                <Link
                  href="/materials/new"
                  className="text-brand-500 hover:underline"
                >
                  Add one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {supplier.rawMaterials.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <Link
                      href={`/materials/${m.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-500"
                    >
                      {m.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {m.stock} {m.unit}
                      {m.reorderLevel > 0 && (
                        <span
                          className={
                            m.stock <= m.reorderLevel
                              ? 'ml-2 text-rose-600'
                              : 'ml-2 text-slate-400'
                          }
                        >
                          (reorder at {m.reorderLevel})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Contact card */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Contact
            </h2>
            <dl className="space-y-2 text-sm">
              {supplier.contactPerson && (
                <ContactRow label="Person" value={supplier.contactPerson} />
              )}
              {supplier.phone && (
                <ContactRow
                  icon={Phone}
                  label="Phone"
                  value={
                    <a href={`tel:${supplier.phone}`} className="hover:underline">
                      {supplier.phone}
                    </a>
                  }
                />
              )}
              {supplier.whatsappNumber &&
                supplier.whatsappNumber !== supplier.phone && (
                  <ContactRow
                    icon={MessageCircle}
                    label="WhatsApp"
                    value={supplier.whatsappNumber}
                  />
                )}
              {supplier.email && (
                <ContactRow
                  icon={Mail}
                  label="Email"
                  value={
                    <a
                      href={`mailto:${supplier.email}`}
                      className="hover:underline"
                    >
                      {supplier.email}
                    </a>
                  }
                />
              )}
              {supplier.address && (
                <ContactRow label="Address" value={supplier.address} />
              )}
              {supplier.paymentTerms && (
                <ContactRow label="Payment" value={supplier.paymentTerms} />
              )}
              {supplier.leadTimeDays != null && (
                <ContactRow
                  label="Lead time"
                  value={`${supplier.leadTimeDays} day${supplier.leadTimeDays === 1 ? '' : 's'}`}
                />
              )}
              {supplier.minimumOrderQuantity != null && (
                <ContactRow
                  label="MOQ"
                  value={String(supplier.minimumOrderQuantity)}
                />
              )}
            </dl>
          </div>

          {/* Active POs */}
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <FileText size={14} /> Active purchase orders
            </h2>
            {supplier.purchaseOrders.length === 0 ? (
              <p className="text-sm text-slate-500">No open POs.</p>
            ) : (
              <ul className="space-y-2">
                {supplier.purchaseOrders.map((po) => (
                  <li key={po.id}>
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-mono font-semibold text-slate-900">
                        {po.poNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          STATUS_TONE[po.status] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {po.status.replace(/_/g, ' ')}
                      </span>
                    </Link>
                    <p className="num text-xs text-slate-500">
                      {formatKobo(po.totalKobo)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent purchases */}
          {recentHistory.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <History size={14} /> Recent purchases
              </h2>
              <ul className="space-y-2 text-xs">
                {recentHistory.map((po) => (
                  <li
                    key={po.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="font-mono font-semibold text-slate-700 hover:underline"
                    >
                      {po.poNumber}
                    </Link>
                    <span className="text-slate-500">
                      {po.receivedAt
                        ? formatDate(po.receivedAt)
                        : formatDate(po.createdAt)}
                    </span>
                    <span className="num font-semibold text-ink">
                      {formatKobo(po.totalKobo)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: 'emerald' | 'brand' | 'amber' | 'slate';
}) {
  const toneCls =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'brand'
        ? 'text-brand-700'
        : tone === 'amber'
          ? 'text-amber-700'
          : 'text-slate-700';
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Icon size={12} />
        {label}
      </div>
      <div className={`mt-1 text-lg font-black ${toneCls}`}>{value}</div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="inline-flex items-center gap-1 text-xs text-slate-500">
        {Icon ? <Icon size={12} className="text-slate-400" /> : null}
        {label}
      </dt>
      <dd className="text-right text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}
