import { Check, Clock3, MessageCircle, Wallet } from 'lucide-react';

/**
 * A small, non-interactive preview of the CashTraka dashboard.
 * Pure markup — no data, no JS. Used in the hero to anchor the headline.
 */
export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm md:max-w-md">
      {/* Phone frame */}
      <div className="relative rounded-[2rem] border border-slate-200 bg-white p-3 shadow-xl">
        <div className="rounded-[1.5rem] bg-slate-50 p-4">
          {/* Fake status bar */}
          <div className="mb-3 flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span>9:41</span>
            <span>CashTraka</span>
          </div>

          {/* Greeting */}
          <div className="mb-3">
            <div className="text-xs text-slate-500">Hello, Ada 👋</div>
            <div className="text-sm font-bold text-slate-900">Your money today</div>
          </div>

          {/* Stats */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <StatMini label="Received" value="₦28,500" tone="brand" />
            <StatMini label="Owed" value="₦27,500" tone="danger" />
          </div>

          {/* Recent activity */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <Row
              icon={<Wallet size={14} />}
              iconTone="brand"
              title="Amaka Nwosu"
              meta="Paid · just now"
              amount="₦8,500"
              amountTone="brand"
            />
            <Row
              icon={<Clock3 size={14} />}
              iconTone="danger"
              title="Chidi Okafor"
              meta="Owes · 2 days"
              amount="₦7,500"
              amountTone="danger"
            />
            <Row
              icon={<MessageCircle size={14} />}
              iconTone="wa"
              title="Tolu Bello"
              meta="Reminder sent"
              amount="WhatsApp"
              amountTone="neutral"
              last
            />
          </div>

          {/* Success pill */}
          <div className="mt-3 flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-700">
            <Check size={12} /> You recovered ₦12,000 this week
          </div>
        </div>
      </div>
      {/* Soft glow */}
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-brand-200/40 blur-3xl" />
    </div>
  );
}

function StatMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'brand' | 'danger';
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
      <div
        className={
          tone === 'brand'
            ? 'text-sm font-bold text-brand-600'
            : 'text-sm font-bold text-owed-600'
        }
      >
        {value}
      </div>
    </div>
  );
}

function Row({
  icon,
  iconTone,
  title,
  meta,
  amount,
  amountTone,
  last,
}: {
  icon: React.ReactNode;
  iconTone: 'brand' | 'danger' | 'wa';
  title: string;
  meta: string;
  amount: string;
  amountTone: 'brand' | 'danger' | 'neutral';
  last?: boolean;
}) {
  const iconClass =
    iconTone === 'brand'
      ? 'bg-brand-50 text-brand-600'
      : iconTone === 'danger'
      ? 'bg-owed-50 text-owed-600'
      : 'bg-[#25D366]/15 text-[#128C7E]';
  const amountClass =
    amountTone === 'brand'
      ? 'text-success-700'
      : amountTone === 'danger'
      ? 'text-owed-600'
      : 'text-slate-500';
  return (
    <div
      className={
        'flex items-center gap-2 px-3 py-2 ' + (last ? '' : 'border-b border-slate-100')
      }
    >
      <span
        className={
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full ' + iconClass
        }
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold text-slate-900">{title}</div>
        <div className="text-[10px] text-slate-500">{meta}</div>
      </div>
      <div className={'text-[11px] font-bold ' + amountClass}>{amount}</div>
    </div>
  );
}
