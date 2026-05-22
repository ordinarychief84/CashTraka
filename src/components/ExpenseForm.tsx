'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CreditCard,
  Banknote,
  Smartphone,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';
import { BUSINESS_EXPENSE_CATEGORIES } from '@/lib/validators';
import { cn } from '@/lib/utils';

type PayMethod = 'cash' | 'transfer' | 'card' | 'pos' | 'other';

type Initial = {
  id?: string;
  amount?: number;
  category?: string;
  note?: string;
  incurredOn?: string;
  kind?: string;
  paymentMethod?: PayMethod | null;
  vendor?: string | null;
  isRecurring?: boolean;
  receiptRef?: string | null;
  taxDeductible?: boolean;
};

type Props = {
  redirectTo?: string;
  initial?: Initial;
};

const PAY_METHODS: { value: PayMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote size={14} /> },
  { value: 'transfer', label: 'Transfer', icon: <Smartphone size={14} /> },
  { value: 'card', label: 'Card', icon: <CreditCard size={14} /> },
  { value: 'pos', label: 'POS', icon: <ReceiptText size={14} /> },
  { value: 'other', label: 'Other', icon: null },
];

const OTHER_SENTINEL = '__other__';

/* ── Searchable Category Combobox ─────────────────────────────── */
function CategoryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const categories = BUSINESS_EXPENSE_CATEGORIES as readonly string[];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isOther, setIsOther] = useState(false);
  const [customText, setCustomText] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Detect if the initial value is a custom category (not in the predefined list)
  useEffect(() => {
    if (value && !(categories as readonly string[]).includes(value) && value !== 'Miscellaneous') {
      setIsOther(true);
      setCustomText(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (isOther) {
      setTimeout(() => customInputRef.current?.focus(), 50);
    }
  }, [isOther]);

  const q = query.toLowerCase();
  const filtered = categories
    .filter((c) => c !== 'Miscellaneous')
    .filter((c) => c.toLowerCase().includes(q));
  const showOther = !q || 'other'.includes(q);

  function select(cat: string) {
    if (cat === OTHER_SENTINEL) {
      setIsOther(true);
      setCustomText('');
      onChange('');
    } else {
      setIsOther(false);
      setCustomText('');
      onChange(cat);
    }
    setOpen(false);
    setQuery('');
  }

  function handleCustomChange(text: string) {
    setCustomText(text);
    onChange(text || 'Other');
  }

  const displayValue = isOther
    ? customText
      ? `Other: ${customText}`
      : 'Other (specify below)'
    : value || 'Select a category';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'input flex w-full items-center justify-between text-left',
          !value && !isOther && 'text-slate-400',
        )}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-slate-400 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      <input type="hidden" name="category" value={isOther ? (customText || 'Other') : value} />

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-1 focus:ring-brand-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => select(cat)}
                className={cn(
                  'flex w-full items-center justify-between px-3.5 py-2 text-sm transition-colors',
                  value === cat && !isOther
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                {cat}
                {value === cat && !isOther && (
                  <Check size={14} className="shrink-0 text-brand-500" />
                )}
              </button>
            ))}

            {showOther && (
              <>
                <div className="mx-3 my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => select(OTHER_SENTINEL)}
                  className={cn(
                    'flex w-full items-center justify-between px-3.5 py-2 text-sm transition-colors',
                    isOther
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  Other (type your own)
                  {isOther && (
                    <Check size={14} className="shrink-0 text-brand-500" />
                  )}
                </button>
              </>
            )}

            {filtered.length === 0 && !showOther && (
              <p className="px-3.5 py-4 text-center text-sm text-slate-400">
                No match found
              </p>
            )}
          </div>
        </div>
      )}

      {isOther && (
        <div className="mt-2">
          <input
            ref={customInputRef}
            type="text"
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="What was this expense for? e.g. Welding gas, packaging tape"
            className="input w-full"
            maxLength={100}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Describe what you spent on
          </p>
        </div>
      )}
    </div>
  );
}

export function ExpenseForm({ redirectTo = '/expenses', initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod | ''>(
    initial?.paymentMethod ?? '',
  );
  const [isRecurring, setIsRecurring] = useState(initial?.isRecurring ?? false);
  const [taxDeductible, setTaxDeductible] = useState(
    initial?.taxDeductible ?? false,
  );
  const [category, setCategory] = useState(
    initial?.category ?? BUSINESS_EXPENSE_CATEGORIES[0],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      amount: Number(form.get('amount') || 0),
      category: category?.trim() || 'Other',
      note: String(form.get('note') || ''),
      incurredOn: String(form.get('incurredOn') || ''),
      vendor: String(form.get('vendor') || ''),
      receiptRef: String(form.get('receiptRef') || ''),
      kind: 'business',
      paymentMethod: payMethod || undefined,
      isRecurring,
      taxDeductible,
    };
    try {
      const res = await fetch(
        editing ? `/api/expenses/${initial!.id}` : '/api/expenses',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      toast.success(editing ? 'Expense updated' : 'Expense saved');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Amount ── */}
      <div>
        <label htmlFor="amount" className="label">
          Amount spent (₦)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min={1}
          className="input"
          placeholder="e.g. 15,000"
          defaultValue={initial?.amount ?? ''}
          required
        />
      </div>

      {/* ── Category ── */}
      <div>
        <label className="label">Category</label>
        <CategoryCombobox value={category} onChange={setCategory} />
      </div>

      {/* ── Vendor / Supplier ── */}
      <div>
        <label htmlFor="vendor" className="label">
          Vendor / Supplier <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="vendor"
          name="vendor"
          className="input"
          placeholder="e.g. Dangote Cement, MTN, Shoprite"
          defaultValue={initial?.vendor ?? ''}
        />
      </div>

      {/* ── Payment method ── */}
      <div>
        <span className="label">
          Payment method <span className="text-slate-400">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PAY_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() =>
                setPayMethod(payMethod === m.value ? '' : m.value)
              }
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                payMethod === m.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-border bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Date ── */}
      <div>
        <label htmlFor="incurredOn" className="label">
          Date
        </label>
        <input
          id="incurredOn"
          name="incurredOn"
          type="date"
          className="input"
          defaultValue={initial?.incurredOn ?? today}
        />
      </div>

      {/* ── Note ── */}
      <div>
        <label htmlFor="note" className="label">
          Note <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="note"
          name="note"
          className="input"
          placeholder="e.g. Restocked 50kg flour, paid Q1 rent"
          defaultValue={initial?.note ?? ''}
        />
      </div>

      {/* ── Receipt reference ── */}
      <div>
        <label htmlFor="receiptRef" className="label">
          Receipt / Reference # <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="receiptRef"
          name="receiptRef"
          className="input"
          placeholder="e.g. INV-0042, receipt number"
          defaultValue={initial?.receiptRef ?? ''}
        />
      </div>

      {/* ── Toggles ── */}
      <div className="flex flex-wrap gap-3">
        <label
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition',
            isRecurring
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-border bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <RotateCcw size={14} />
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="sr-only"
          />
          Recurring expense
        </label>

        <label
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition',
            taxDeductible
              ? 'border-success-500 bg-success-50 text-success-700'
              : 'border-border bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <ShieldCheck size={14} />
          <input
            type="checkbox"
            checked={taxDeductible}
            onChange={(e) => setTaxDeductible(e.target.checked)}
            className="sr-only"
          />
          Tax deductible
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}
      </button>
    </form>
  );
}
