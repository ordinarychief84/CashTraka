'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { SalesReceiptView, type ReceiptSaleData } from '@/components/SalesReceiptView';
import { cn } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  trackStock: boolean;
};

type LineItem = {
  key: string;
  productId: string;
  description: string;
  unitPrice: number;
  quantity: number;
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', short: 'Cash' },
  { value: 'TRANSFER', label: 'Transfer', short: 'Transfer' },
  { value: 'POS', label: 'POS', short: 'POS' },
  { value: 'CARD', label: 'Card', short: 'Card' },
];

export function RecordSaleForm({ businessName }: { businessName?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showCustomer, setShowCustomer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discount, setDiscount] = useState(0);
  const [showDiscount, setShowDiscount] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<ReceiptSaleData | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => null);
  }, []);

  useEffect(() => { nameInputRef.current?.focus(); }, []);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const itemCount = items.length;
  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  function addItemFromProduct(product: Product) {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems((prev) => prev.map((i) => (i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setItems((prev) => [...prev, { key: crypto.randomUUID(), productId: product.id, description: product.name, unitPrice: product.price, quantity: 1 }]);
    }
    setProductSearch('');
    setShowPicker(false);
  }

  function addManualItem() {
    const name = manualName.trim();
    const price = parseInt(manualPrice) || 0;
    const qty = Math.max(1, parseInt(manualQty) || 1);
    if (!name || price <= 0) return;
    setItems((prev) => [...prev, { key: crypto.randomUUID(), productId: '', description: name, unitPrice: price, quantity: qty }]);
    setManualName('');
    setManualPrice('');
    setManualQty('1');
    nameInputRef.current?.focus();
  }

  function removeItem(key: string) { setItems((prev) => prev.filter((i) => i.key !== key)); }

  function updateQty(key: string, delta: number) {
    setItems((prev) => prev.map((i) => i.key !== key ? i : { ...i, quantity: Math.max(1, i.quantity + delta) }));
  }

  async function handleSubmit() {
    if (items.length === 0) { setError('Add at least one item.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod,
        discount,
        note: note.trim() || undefined,
        sendReceipt: false,
        items: items.map((i) => ({ productId: i.productId || undefined, description: i.description, unitPrice: i.unitPrice, quantity: i.quantity })),
      };
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to record sale'); return; }
      const receipt: ReceiptSaleData = {
        id: json.id, saleNumber: json.saleNumber,
        customerName: customerName.trim() || null, customerPhone: customerPhone.trim() || null, customerEmail: customerEmail.trim() || null,
        items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.unitPrice * i.quantity })),
        subtotal, discount, tax: 0, total: json.total, paymentMethod, note: note.trim() || null,
        soldAt: new Date().toISOString(), businessName: businessName || 'CashTraka',
      };
      setCompletedSale(receipt);
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  }

  function resetForm() {
    setCompletedSale(null); setItems([]); setManualName(''); setManualPrice(''); setManualQty('1');
    setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setDiscount(0); setShowDiscount(false);
    setNote(''); setShowCustomer(false); setError(null);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }

  if (completedSale) {
    return <SalesReceiptView sale={completedSale} onRecordAnother={resetForm} />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

      {/* Quick Add Item */}
      <div className="card p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Add items</h3>

        {products.length > 0 && (
          <div className="mb-3">
            <button type="button" onClick={() => setShowPicker(!showPicker)} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/40 px-3 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50">
              <Search size={15} />
              Pick from your products
              {showPicker ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
            </button>
            {showPicker && (
              <div className="mt-2 rounded-lg border border-border bg-white shadow-sm">
                <div className="border-b border-border p-2">
                  <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="input text-sm" autoFocus />
                </div>
                <ul className="max-h-48 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <li className="px-3 py-4 text-center text-xs text-slate-400">No products match</li>
                  ) : filteredProducts.slice(0, 20).map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => addItemFromProduct(p)} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-slate-50">
                        <span className="font-medium text-ink">{p.name}</span>
                        <span className="flex items-center gap-2">
                          {p.trackStock && <span className="text-[11px] text-slate-400">{p.stock} left</span>}
                          <span className="num font-semibold text-brand-700">{formatNaira(p.price)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <input ref={nameInputRef} type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualItem(); } }} placeholder="Item name" className="input flex-1 text-sm" />
            <input type="number" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualItem(); } }} placeholder="Price" className="input w-24 text-sm" min={0} inputMode="numeric" />
          </div>
          <div className="flex gap-2">
            <input type="number" value={manualQty} onChange={(e) => setManualQty(e.target.value)} placeholder="Qty" className="input w-20 text-sm" min={1} inputMode="numeric" />
            <button type="button" onClick={addManualItem} disabled={!manualName.trim() || !parseInt(manualPrice)} className="btn-primary flex-1 justify-center text-sm disabled:opacity-40">
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Cart */}
      {items.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-border bg-slate-50/60 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cart &middot; {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          </div>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-ink">{item.description}</span>
                  <div className="mt-0.5 text-xs text-slate-400">{formatNaira(item.unitPrice)} each</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => updateQty(item.key, -1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-xs font-bold text-slate-500 hover:bg-slate-50">&minus;</button>
                  <span className="num w-7 text-center text-sm font-bold text-ink">{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.key, 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-xs font-bold text-slate-500 hover:bg-slate-50">+</button>
                </div>
                <span className="num w-20 text-right text-sm font-bold text-ink">{formatNaira(item.unitPrice * item.quantity)}</span>
                <button type="button" onClick={() => removeItem(item.key)} className="ml-1 p-1 text-slate-300 transition hover:text-red-500"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Customer info */}
      <div className="card p-0 overflow-hidden">
        <button type="button" onClick={() => setShowCustomer(!showCustomer)} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Customer info
            {customerName && <span className="ml-2 normal-case tracking-normal text-ink font-semibold">&mdash; {customerName}</span>}
          </span>
          {showCustomer ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        {showCustomer && (
          <div className="border-t border-border p-4 space-y-3">
            <div>
              <label className="label">Name</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="input text-sm" />
            </div>
            <div>
              <label className="label">Phone (for WhatsApp receipt)</label>
              <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08012345678" className="input text-sm" inputMode="tel" />
            </div>
            <div>
              <label className="label">Email (for email receipt)</label>
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@email.com" className="input text-sm" inputMode="email" />
            </div>
          </div>
        )}
      </div>

      {/* Payment method */}
      <div className="card p-4">
        <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Payment</h3>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)} className={cn(
              'flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition',
              paymentMethod === m.value ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500/30' : 'border-border bg-white text-slate-600 hover:bg-slate-50'
            )}>
              {m.short}
            </button>
          ))}
        </div>
        <div className="mt-3">
          {!showDiscount ? (
            <button type="button" onClick={() => setShowDiscount(true)} className="text-xs font-medium text-brand-600 hover:underline">+ Add discount</button>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 shrink-0">Discount N</label>
              <input type="number" value={discount || ''} onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))} className="input flex-1 text-sm" min={0} inputMode="numeric" autoFocus />
              <button type="button" onClick={() => { setDiscount(0); setShowDiscount(false); }} className="p-1 text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Total + Submit */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-white px-4 pb-5 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] sm:relative sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:shadow-none">
        <div className="card p-4">
          <div className="space-y-1">
            {discount > 0 && (
              <>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="num">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-owed-600">
                  <span>Discount</span>
                  <span className="num">-{formatNaira(discount)}</span>
                </div>
              </>
            )}
            <div className={cn('flex justify-between text-xl font-black text-ink', discount > 0 && 'border-t border-border pt-2')}>
              <span>Total</span>
              <span className="num">{formatNaira(total)}</span>
            </div>
          </div>
          <button type="button" onClick={handleSubmit} disabled={submitting || items.length === 0} className="btn-primary mt-3 w-full justify-center text-base disabled:opacity-40">
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Recording...
              </span>
            ) : (
              <><ShoppingBag size={18} /> Complete Sale &mdash; {formatNaira(total)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
