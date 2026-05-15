import {
  Bell,
  ShoppingBag,
  Factory,
  Boxes,
  TrendingUp,
  Plus,
  Package,
  ScanLine,
  AlertTriangle,
  Home,
  ClipboardList,
  PackageSearch,
  MoreHorizontal,
} from 'lucide-react';

/**
 * Marketing iPhone mockup. Renders a static visual representation of the
 * CashTraka mobile dashboard so visitors can see the product runs on
 * their phone. Not interactive — every value here is illustrative copy.
 */
export function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[280px]">
      {/* Phone frame */}
      <div className="relative rounded-[2.5rem] bg-ink p-[6px] shadow-2xl">
        <div className="relative overflow-hidden rounded-[2.1rem] bg-white">
          {/* Status notch */}
          <div className="absolute left-1/2 top-1.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />

          {/* Top fake status bar */}
          <div className="h-7 bg-white" />

          {/* Header */}
          <div className="flex items-start justify-between px-4 pb-3 pt-2">
            <div>
              <div className="text-[15px] font-bold text-ink">Hello, Tunde</div>
              <div className="text-[10px] text-slate-500">
                Here&apos;s what&apos;s happening today
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Bell size={14} />
              </div>
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-400 to-success-400" />
            </div>
          </div>

          {/* Metric stack */}
          <div className="space-y-2 px-3 pb-3">
            <MetricRow
              icon={<ShoppingBag size={14} />}
              label="Orders Pending"
              value="24"
              tone="brand"
            />
            <MetricRow
              icon={<Factory size={14} />}
              label="Production In Progress"
              value="12"
              tone="brand"
            />
            <MetricRow
              icon={<Boxes size={14} />}
              label="Low Materials"
              value="7"
              tone="owed"
            />
            <MetricRow
              icon={<TrendingUp size={14} />}
              label="Revenue This Week"
              value="₦1,250,000"
              tone="success"
            />
          </div>

          {/* Quick Actions */}
          <div className="px-4 pb-3">
            <div className="mb-2 text-[10px] font-bold text-slate-700">
              Quick Actions
            </div>
            <div className="grid grid-cols-4 gap-2">
              <QuickAction icon={<Plus size={14} />} label="New Order" />
              <QuickAction icon={<Factory size={14} />} label="New Production" />
              <QuickAction icon={<Package size={14} />} label="Add Material" />
              <QuickAction icon={<ScanLine size={14} />} label="Scan Barcode" />
            </div>
          </div>

          {/* Shortage Alerts */}
          <div className="px-4 pb-4">
            <div className="mb-2 text-[10px] font-bold text-slate-700">
              Shortage Alerts
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700">
                  <AlertTriangle size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-ink">
                    Shea Butter
                  </div>
                  <div className="text-[9px] text-slate-500">Short by 5kg</div>
                </div>
                <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                  Critical
                </span>
              </div>
            </div>
          </div>

          {/* Bottom tab nav */}
          <div className="flex items-center justify-around border-t border-border bg-white px-2 py-2">
            <TabIcon icon={<Home size={15} />} label="Dashboard" active />
            <TabIcon icon={<ClipboardList size={15} />} label="Orders" />
            <TabIcon icon={<Factory size={15} />} label="Production" />
            <TabIcon icon={<PackageSearch size={15} />} label="Inventory" />
            <TabIcon icon={<MoreHorizontal size={15} />} label="More" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'brand' | 'owed' | 'success';
}) {
  const toneCls = {
    brand: 'border-brand-100 bg-brand-50/40',
    owed: 'border-owed-200 bg-owed-50/40',
    success: 'border-success-200 bg-success-50/40',
  }[tone];
  const iconCls = {
    brand: 'bg-brand-100 text-brand-700',
    owed: 'bg-owed-100 text-owed-700',
    success: 'bg-success-100 text-success-700',
  }[tone];
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${toneCls}`}
    >
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="num mt-0.5 text-base font-black text-ink">{value}</div>
      </div>
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconCls}`}
      >
        {icon}
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-slate-50 text-brand-700">
        {icon}
      </div>
      <div className="text-center text-[8px] font-semibold text-slate-600">
        {label}
      </div>
    </div>
  );
}

function TabIcon({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 ${
        active ? 'text-brand-700' : 'text-slate-400'
      }`}
    >
      {icon}
      <div className="text-[8px] font-medium">{label}</div>
    </div>
  );
}
