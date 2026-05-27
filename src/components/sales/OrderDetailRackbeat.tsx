'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, Download, ArrowUpDown, X } from 'lucide-react';

const inputCls =
  'h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const labelCls = 'mb-0.5 block text-[11px] font-medium text-slate-500';

export interface OrderDetailData {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  customerId: string | null;
  dueAt: string | null;
  notes: string | null;
  totalKobo: number;
  createdAt: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceKobo: number;
    totalKobo: number;
    product: { id: string; name: string; sku: string | null } | null;
  }>;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  } | null;
  productionOrder: { id: string; productionNumber: string; status: string } | null;
  invoice: { id: string; invoiceNumber: string; status: string } | null;
}

interface Props {
  order: OrderDetailData;
}

function fmtAmount(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function formatDateDisplay(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function OrderDetailRackbeat({ order }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Editable fields (references / notes panel)
  const [ourRef, setOurRef] = useState('');
  const [generalDiscount, setGeneralDiscount] = useState('0.00');
  const [deliveryResponsible, setDeliveryResponsible] = useState('');
  const [attention, setAttention] = useState('');
  const [theirRef, setTheirRef] = useState('');
  const [otherRef, setOtherRef] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [currencyRate, setCurrencyRate] = useState('1.00000');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [heading, setHeading] = useState('');
  const [orderDate, setOrderDate] = useState(isoToDateInput(order.createdAt));
  const [deliveryDate, setDeliveryDate] = useState(isoToDateInput(order.dueAt));
  const [note, setNote] = useState(order.notes ?? '');

  const canConfirm = order.status === 'NEW';
  const isCancelled = order.status === 'CANCELLED';

  async function handleConfirm() {
    if (!canConfirm) return;
    setConfirming(true);
    try {
      await fetch(`/api/customer-orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      router.refresh();
    } finally {
      setConfirming(false);
    }
  }

  // Parse address string into lines for display
  const addressLines = order.customer?.address
    ? order.customer.address.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header ── */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/orders" className="text-[13px] text-slate-400 hover:text-slate-600">
              ← Orders
            </Link>
            <h1 className="text-[18px] font-bold text-slate-900">
              Order{' '}
              <span className="text-slate-500">#{order.orderNumber}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {canConfirm && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {confirming ? 'Confirming…' : 'Confirm'}
              </button>
            )}
            {!canConfirm && !isCancelled && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                {order.status.replace('_', ' ')}
              </span>
            )}
            {isCancelled && (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-[12px] font-semibold text-rose-700">
                Cancelled
              </span>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActionsOpen((p) => !p)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Actions <ChevronDown size={13} />
              </button>
              {actionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {order.productionOrder && (
                      <Link
                        href={`/production/${order.productionOrder.id}`}
                        className="block px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                        onClick={() => setActionsOpen(false)}
                      >
                        View production
                      </Link>
                    )}
                    {order.invoice && (
                      <Link
                        href={`/invoices/${order.invoice.id}`}
                        className="block px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                        onClick={() => setActionsOpen(false)}
                      >
                        View invoice
                      </Link>
                    )}
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50"
                      onClick={() => setActionsOpen(false)}
                    >
                      Cancel order
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab */}
        <div className="flex px-6">
          <button
            type="button"
            className="border-b-2 border-brand-600 pb-2 pr-4 text-[13px] font-semibold text-brand-700"
          >
            Information
          </button>
        </div>
      </div>

      {/* ── Three-column body ── */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-3 gap-5 items-start">

          {/* ── Col 1: Customer ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-[13px] font-semibold text-slate-800">Customer</p>

            {/* Customer field */}
            <div className="mb-4">
              <label className={labelCls}>Customer</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={order.customerName}
                  className={inputCls + ' pr-8 bg-slate-50'}
                />
                <ArrowUpDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Billing address */}
            <div className="mb-4">
              <p className="mb-1 text-[11px] font-semibold text-slate-600">Billing address</p>
              <div className="space-y-0.5 text-[12px] text-slate-600">
                <p>{order.customerName}</p>
                {addressLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                {order.customer?.phone && <p>{order.customer.phone}</p>}
              </div>
            </div>

            {/* Delivery address */}
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold text-slate-600">Delivery address</p>
              <div className="space-y-0.5 text-[12px] text-slate-600">
                <p>{order.customerName}</p>
                {addressLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                {order.customer?.phone && <p>{order.customer.phone}</p>}
              </div>
            </div>

            {order.customerId && (
              <Link
                href={`/customers/${order.customerId}`}
                className="text-[12px] text-brand-600 hover:underline"
              >
                Edit
              </Link>
            )}
          </div>

          {/* ── Col 2: References ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-[13px] font-semibold text-slate-800">References</p>
            <div className="space-y-3">

              {/* Our reference + General discount — 2-col */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Our reference</label>
                  <div className="relative">
                    <input type="text" value={ourRef} onChange={e => setOurRef(e.target.value)} className={inputCls + ' pr-12'} />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <ArrowUpDown size={10} className="text-slate-300" />
                      {ourRef && <button type="button" onClick={() => setOurRef('')}><X size={10} className="text-slate-300 hover:text-slate-500" /></button>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>General discount (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={generalDiscount}
                      onChange={e => setGeneralDiscount(e.target.value)}
                      className={inputCls + ' pr-5'}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* Delivery responsible */}
              <div>
                <label className={labelCls}>Delivery responsible</label>
                <div className="relative">
                  <input type="text" value={deliveryResponsible} onChange={e => setDeliveryResponsible(e.target.value)} className={inputCls + ' pr-8'} />
                  <ArrowUpDown size={10} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>

              {/* Attention */}
              <div>
                <label className={labelCls}>Attention</label>
                <div className="relative">
                  <input type="text" value={attention} onChange={e => setAttention(e.target.value)} className={inputCls + ' pr-8'} />
                  <ArrowUpDown size={10} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>

              {/* Their reference + Other reference — 2-col */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Their reference</label>
                  <div className="relative">
                    <input type="text" value={theirRef} onChange={e => setTheirRef(e.target.value)} className={inputCls + ' pr-8'} />
                    <ArrowUpDown size={10} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Other reference</label>
                  <input type="text" value={otherRef} onChange={e => setOtherRef(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Currency + Currency rate — 2-col */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Currency</label>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 pr-7 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                    >
                      <option>NGN</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Currency rate</label>
                  <input type="text" value={currencyRate} onChange={e => setCurrencyRate(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Payment terms + Delivery terms — 2-col */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Payment terms</label>
                  <div className="relative">
                    <select
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 pr-7 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                    >
                      <option value="" />
                      <option>Net 30</option>
                      <option>Net 60</option>
                      <option>Immediate</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Delivery terms</label>
                  <div className="relative">
                    <select
                      value={deliveryTerms}
                      onChange={e => setDeliveryTerms(e.target.value)}
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 pr-7 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                    >
                      <option value="" />
                      <option>EXW</option>
                      <option>FOB</option>
                      <option>CIF</option>
                      <option>DDP</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Col 3: Notes ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-[13px] font-semibold text-slate-800">Notes</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Heading</label>
                <input type="text" value={heading} onChange={e => setHeading(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Order date</label>
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Delivery date</label>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Note</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={5}
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300 resize-none"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Be careful not to add personal information to this field without a clear purpose.
                </p>
              </div>
            </div>

            {/* Linked records */}
            {(order.productionOrder || order.invoice) && (
              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                {order.productionOrder && (
                  <div>
                    <span className="text-[11px] text-slate-400">Production: </span>
                    <Link
                      href={`/production/${order.productionOrder.id}`}
                      className="text-[11px] font-medium text-brand-600 hover:underline"
                    >
                      {order.productionOrder.productionNumber}
                    </Link>
                  </div>
                )}
                {order.invoice && (
                  <div>
                    <span className="text-[11px] text-slate-400">Invoice: </span>
                    <Link
                      href={`/invoices/${order.invoice.id}`}
                      className="text-[11px] font-medium text-brand-600 hover:underline"
                    >
                      {order.invoice.invoiceNumber}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Lines section ── */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-white">
          {/* Lines header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100">
            <span className="text-[13px] font-semibold text-slate-800">Lines</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700"
            >
              <Plus size={12} /> Item line
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700"
            >
              <Plus size={12} /> Text line
            </button>
            <button
              type="button"
              className="text-[12px] font-medium text-brand-600 hover:text-brand-700"
            >
              Add collection
            </button>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-700"
            >
              <Download size={12} /> Download
            </button>
          </div>

          {/* Lines table */}
          {order.items.length === 0 ? (
            <div className="py-16 text-center text-[14px] text-slate-400">None found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-semibold text-slate-500">
                    <th className="px-5 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="w-8 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{item.description}</p>
                        {item.product && (
                          <p className="text-[11px] text-slate-400">
                            {item.product.name}
                            {item.product.sku ? ` · ${item.product.sku}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {fmtAmount(item.unitPriceKobo)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {fmtAmount(item.totalKobo)}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/50">
                    <td colSpan={3} className="px-5 py-2.5 text-right text-[12px] font-semibold text-slate-600">
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right text-[13px] font-bold text-slate-900">
                      {fmtAmount(order.totalKobo)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Agreement number */}
        <p className="mt-4 text-[11px] text-slate-400">
          Agreement number {order.id.slice(0, 8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}
