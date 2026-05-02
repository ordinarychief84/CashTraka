import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, User, Banknote, Shield, ClipboardList } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminInvoiceActions } from '@/components/admin/AdminInvoiceActions';
import { prisma } from '@/lib/prisma';
import { formatNaira, formatDate, formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminInvoiceDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdminSection('invoices');

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      user: {
        select: {
          id: true, name: true, email: true, businessName: true,
          businessAddress: true, whatsappNumber: true, plan: true,
        },
      },
      customer: { select: { id: true, name: true, phone: true } },
      creditNotes: { orderBy: { createdAt: 'desc' } },
      payments: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, amount: true, status: true, createdAt: true,
          customerNameSnapshot: true, verified: true,
        },
      },
    },
  });

  if (!invoice) notFound();

  const auditEntries = await prisma.documentAuditLog.findMany({
    where: { entityType: 'INVOICE', entityId: invoice.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const creditNoteTotal = invoice.creditNotes.reduce((s, cn) => s + cn.total, 0);
  const outstanding = invoice.total - invoice.amountPaid;

  return (
    <AdminShell adminName={admin.name} activePath="/admin/invoices" adminRole={admin.adminRole}>
      <Link href="/admin/invoices" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-ink">
        <ArrowLeft size={14} /> Back to Invoices
      </Link>

      <div className="mb-6 rounded-xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-brand-600" />
              <h1 className="text-xl font-black text-ink">{invoice.invoiceNumber}</h1>
              <StatusPill status={invoice.status} />
              {invoice.firsStatus && <FirsPill status={invoice.firsStatus} />}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Created {formatDate(invoice.createdAt)}
              {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
              {invoice.paidAt && ` · Paid ${formatDate(invoice.paidAt)}`}
            </p>
          </div>

          <AdminInvoiceActions invoiceId={invoice.id} currentStatus={invoice.status} />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MC icon={Banknote} label="Total" value={formatNaira(invoice.total)} />
        <MC icon={Banknote} label="Paid" value={formatNaira(invoice.amountPaid)} color="brand" />
        <MC icon={Banknote} label="Outstanding" value={formatNaira(outstanding)} color={outstanding > 0 ? 'danger' : undefined} />
        <MC icon={Banknote} label="Credit notes" value={formatNaira(creditNoteTotal)} />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><User size={15} className="text-slate-500" /> Tenant</h3>
          <div className="space-y-2 text-sm">
            <IR label="Name" value={invoice.user.name} />
            <IR label="Business" value={invoice.user.businessName || 'Not set'} muted={!invoice.user.businessName} />
            <IR label="Email" value={invoice.user.email} />
            <IR label="WhatsApp" value={invoice.user.whatsappNumber || 'Not set'} muted={!invoice.user.whatsappNumber} />
            <IR label="Plan" value={invoice.user.plan.replace('_', ' ')} />
          </div>
          <Link
            href={`/admin/users/${invoice.user.id}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View tenant profile →
          </Link>
        </section>

        <section className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><User size={15} className="text-slate-500" /> Customer</h3>
          <div className="space-y-2 text-sm">
            <IR label="Name" value={invoice.customerName} />
            <IR label="Phone" value={invoice.customerPhone || 'Not set'} muted={!invoice.customerPhone} />
            <IR label="Email" value={invoice.customerEmail || 'Not set'} muted={!invoice.customerEmail} />
            <IR label="Buyer TIN" value={invoice.buyerTin || 'Not set'} muted={!invoice.buyerTin} />
            <IR label="Address" value={invoice.buyerAddress || 'Not set'} muted={!invoice.buyerAddress} />
          </div>
        </section>
      </div>

      <section className="mb-6 rounded-xl border border-border bg-white">
        <header className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold text-ink">Line items ({invoice.items.length})</h3>
        </header>
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50/80">
            <tr>
              <Th>Description</Th>
              <Th className="text-right">Unit price</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Line total</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-ink">{it.description}</div>
                  <div className="text-[10px] uppercase text-slate-500">{it.itemType}{it.vatExempt ? ' · vat exempt' : ''}</div>
                </td>
                <td className="px-4 py-2.5 text-right num">{formatNaira(it.unitPrice)}</td>
                <td className="px-4 py-2.5 text-right num">{it.quantity}</td>
                <td className="px-4 py-2.5 text-right num font-semibold">{formatNaira(it.unitPrice * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border bg-slate-50/40 px-4 py-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="num font-semibold">{formatNaira(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="num">-{formatNaira(invoice.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="num">{formatNaira(invoice.tax)}</span></div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span className="num">{formatNaira(invoice.total)}</span></div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Banknote size={16} className="text-brand-600" /> Payments ({invoice.payments.length})</h2>
          {invoice.payments.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">No payments recorded</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{p.customerNameSnapshot}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{timeAgo(p.createdAt)}</span>
                      <span className={cn('rounded px-1.5 py-0.5 font-bold uppercase', p.status === 'PAID' ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-600')}>{p.status}</span>
                    </div>
                  </div>
                  <div className="num text-sm font-bold text-brand-700">{formatNaira(p.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Shield size={16} className="text-purple-600" /> Credit notes ({invoice.creditNotes.length})</h2>
          {invoice.creditNotes.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">No credit notes</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {invoice.creditNotes.map((cn0) => (
                <li key={cn0.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{cn0.creditNoteNumber}</div>
                    <div className="text-[10px] text-slate-500">{timeAgo(cn0.createdAt)}{cn0.reason ? ` · ${cn0.reason}` : ''}</div>
                  </div>
                  <div className="num text-sm font-bold text-purple-700">-{formatNaira(cn0.total)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-white p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <ClipboardList size={16} className="text-slate-500" /> Document audit ({auditEntries.length})
        </h2>
        {auditEntries.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No audit entries yet</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {auditEntries.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase text-slate-700">{a.action}</div>
                  {a.metadata && <div className="mt-0.5 truncate text-[10px] text-slate-500">{a.metadata}</div>}
                </div>
                <div className="shrink-0 text-[10px] text-slate-400">{formatDateTime(a.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {invoice.firsStatus && (
        <section className="mt-4 rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Shield size={16} className="text-brand-600" /> FIRS / e-Invoicing</h2>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <IR label="Status" value={invoice.firsStatus} />
            <IR label="IRN" value={invoice.firsIrn || 'Not issued'} muted={!invoice.firsIrn} />
            <IR label="Retry count" value={String(invoice.firsRetryCount)} />
            <IR label="Submitted at" value={invoice.firsSubmittedAt ? formatDateTime(invoice.firsSubmittedAt) : 'Not submitted'} muted={!invoice.firsSubmittedAt} />
            <IR label="Last error" value={invoice.firsLastError || 'None'} muted={!invoice.firsLastError} />
          </div>
        </section>
      )}
    </AdminShell>
  );
}

function MC({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string; color?: 'brand' | 'danger' }) {
  const c = color === 'brand' ? 'text-brand-600' : color === 'danger' ? 'text-red-500' : 'text-slate-500';
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-1 flex items-center gap-2"><Icon size={16} className={c} /><span className="text-[11px] font-medium text-slate-500">{label}</span></div>
      <div className="text-lg font-black text-ink">{value}</div>
    </div>
  );
}

function IR({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={cn('text-right font-medium break-all', muted ? 'text-slate-400' : 'text-ink')}>{value}</span>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500', className)}>
      {children}
    </th>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SENT: 'bg-brand-50 text-brand-700',
    VIEWED: 'bg-indigo-50 text-indigo-700',
    PARTIALLY_PAID: 'bg-amber-50 text-amber-700',
    PAID: 'bg-success-50 text-success-700',
    OVERDUE: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-slate-200 text-slate-700',
    CREDITED: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', map[status] || 'bg-slate-100 text-slate-600')}>
      {status.replace('_', ' ')}
    </span>
  );
}

function FirsPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-brand-50 text-brand-700',
    ACCEPTED: 'bg-success-50 text-success-700',
    REJECTED: 'bg-red-50 text-red-700',
    RETRYING: 'bg-amber-50 text-amber-700',
    FAILED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', map[status] || 'bg-slate-100 text-slate-600')}>
      FIRS · {status}
    </span>
  );
}
