'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  User,
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
import {
  BUSINESS_EXPENSE_CATEGORIES,
  PERSONAL_EXPENSE_CATEGORIES,
} from '@/lib/validators';
import { cn } from '@/lib/utils';

type Kind = 'business' | 'personal';
type PayMethod = 'cash' | 'transfer' | 'card' | 'pos' | 'other';

type Initial = {
  id?: string;
  amount?: number;
  category?: string;
  note?: string;
  incurredOn?: string;
  kind?: Kind;
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

/* ── Searchable Category Combobox ─────────────────────────────── */
function CategoryCombobox({
  categories,
  value,
  onChange,
}: {
  categories: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const q = query.toLowerCase();
  const filtered = categories.filter((c) => c.toLowerCase().includes(q));

  function select(cat: string) {
    onChange(cat);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'input flex w-full items-center justify-between text-left',
          !value && 'text-slate-400',
        )}
      >
        <span className="truncate">{value || 'Select a category'}</span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-slate-400 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Hidden native input for form data */}
      <input type="hidden" name="category" value={value} />

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {/* Search */}
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
                  value === cat
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                {cat}
                {value === cat && (
                  <Check size={14} className="shrink-0 text-brand-500" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3.5 py-4 text-center text-sm text-slate-400">
                No match — pick the closest one
              </p>
            )}
          </div>
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
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'business');
  const [payMethod, setPayMethod] = useState<PayMethod | ''>(
    initial?.paymentMethod ?? '',
  );
  const [isRecurring, setIsRecurring] = useState(initial?.isRecurring ?? false);
  const [taxDeductible, setTaxDeductible] = useState(
    initial?.taxDeductible ?? false,
  );
  const [category, setCategory] = useState(
    initial?.category ?? (initial?.kind === 'personal' ? PERSONAL_EXPENSE_CATEGORIES[0] : BUSINESS_EXPENSE_CATEGORIES[0]),
  );

  const categories =
    kind === 'business'
      ? BUSINESS_EXPENSE_CATEGORIES
      : PERSONAL_EXPENSE_CATEGORIES;

  // Reset category when switching kind (if current isn't in new list)
  useEffect(() => {
    const list = kind === 'business' ? BUSINESS_EXPENSE_CATEGORIES : PERSONAL_EXPENSE_CATEGORIES;
    if (!(list as readonly string[]).includes(category)) {
      setCategory(list[0]);
    }
  }, [kind, category]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      amount: Number(form.get('amount') || 0),
      category: category || 'Miscellaneous',
      note: String(form.get('note') || ''),
      incurredOn: String(form.get('incurredOn') || ''),
      vendor: String(form.get('vendor') || ''),
      receiptRef: String(form.get('receiptRef') || ''),
      kind,
      paymentMethod: payMethod || undefined,
      isRecurring,
      taxDeductible: kind === 'business' ? taxDeductible : false,
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
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Kind picker ── */}
      <div>
        <span className="label">What type of expense?</span>
        <div className="grid grid-cols-2 gap-2">
          <KindButton
            active={kind === 'business'}
            onClick={() => setKind('business')}
            icon={<Briefcase size={16} />}
            label="Business"
            sub="Operational cost — affects your P&L"
            color="blue"
          />
          <KindButton
            active={kind === 'personal'}
            onClick={() => setKind('personal')}
            icon={<User size={16} />}
            label="Personal"
            sub="Your own spending — tracked separately"
            color="amber"
          />
        </div>
      </div>

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

      {/* ── Category (searchable combobox) ── */}
      <div>
        <label className="label">Category</label>
        <CategoryCombobox
          categories={categories}
          value={category}
          onChange={setCategory}
          key={kind}
        />
      </div>

      {/* ── Vendor / Payee ── */}
      <div>
        <label htmlFor="vendor" className="label">
          {kind === 'business' ? 'Vendor / Supplier' : 'Paid to'}{' '}
          <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="vendor"
          name="vendor"
          className="input"
          placeholder={
            kind === 'business'
              ? 'e.g. Dangote Cement, MTN'
              : 'e.g. Shoprite, Uber'
          }
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
          placeholder={
            kind === 'personal'
              ? 'e.g. Weekly grocery run, fuel top-up'
              : 'e.g. Restocked 50 units of product X'
          }
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

        {kind === 'business' && (
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
        )}
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

function KindButton({
  active,
  onClick,
  icon,
  label,
  sub,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: 'blue' | 'amber';
}) {
  const colorClasses =
    color === 'amber'
      ? {
          border: 'border-owed-400 ring-1 ring-owed-400',
          bg: 'bg-owed-50',
          iconBg: 'bg-owed-500 text-white',
          text: 'text-owed-700',
        }
      : {
          border: 'border-brand-500 ring-1 ring-brand-500',
          bg: 'bg-brand-50',
          iconBg: 'bg-brand-500 text-white',
          text: 'text-brand-700',
        };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition',
        active
          ? `${colorClasses.border} ${colorClasses.bg}`
          : 'border-border bg-white hover:border-brand-300',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md',
          active ? colorClasses.iconBg : 'bg-slate-100 text-slate-600',
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          'text-sm font-semibold',
          active ? colorClasses.text : 'text-ink',
        )}
      >
        {label}
      </span>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </button>
  );
}