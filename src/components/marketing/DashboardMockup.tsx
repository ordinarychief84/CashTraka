import {
  Calendar,
  ShoppingBag,
  Factory,
  Boxes,
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  Home,
  ClipboardList,
  Package,
  PackageSearch,
  Truck,
  Users,
  FileText,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Marketing dashboard mockup. Renders a static visual of the CashTraka
 * desktop dashboard so visitors can see what the product looks like.
 * Every number / row / label is illustrative copy — nothing is wired
 * to live data. Uses the same brand tokens as the real app.
 */
export function DashboardMockup() {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-2xl">
      {/* Top window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
        <div className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-owed-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-success-300" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[150px] shrink-0 border-r border-border bg-slate-50/60 px-3 py-4">
          {/* Brand */}
          <div className="mb-5 flex items-center gap-1.5 px-1">
            <BrandMark />
            <span className="text-[12px] font-bold text-ink">CashTraka</span>
          </div>

          <nav className="space-y-0.5">
            <NavItem icon={Home} label="Dashboard" active />
            <NavItem icon={ClipboardList} label="Orders" />
            <NavItem icon={Factory} label="Production" />
            <NavItem icon={Package} label="Products" />
            <NavItem icon={Boxes} label="Materials" />
            <NavItem icon={PackageSearch} label="Inventory" />
            <NavItem icon={Truck} label="Purchases" />
            <NavItem icon={Users} label="Suppliers" />
            <NavItem icon={FileText} label="Invoices" />
            <NavItem icon={Receipt} label="Receipts" />
            <NavItem icon={BarChart3} label="Reports" />
            <NavItem icon={SettingsIcon} label="Settings" />
          </nav>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 p-4">
          {/* Page header */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-ink">Dashboard</h3>
              <p className="text-[10px] text-slate-500">
                Overview of your business operations
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700">
              <Calendar size={11} className="text-slate-400" />
              May 25 – May 31, 2025
            </div>
          </div>

          {/* 4 metric cards */}
          <div className="mb-4 grid grid-cols-4 gap-2.5">
            <MetricCard
              icon={ShoppingBag}
              label="Orders Pending"
              value="24"
              delta="12% this week"
              tone="brand"
            />
            <MetricCard
              icon={Factory}
              label="Production In Progress"
              value="12"
              delta="8% this week"
              tone="brand"
            />
            <MetricCard
              icon={Boxes}
              label="Low Materials"
              value="7"
              delta="15% this week"
              tone="owed"
            />
            <MetricCard
              icon={TrendingUp}
              label="Revenue This Week"
              value="₦1,250,000"
              delta="18% this week"
              tone="success"
            />
          </div>

          {/* Production Overview + Shortage Alerts */}
          <div className="grid grid-cols-2 gap-3">
            {/* Production Overview */}
            <div className="rounded-xl border border-border bg-white p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Production Overview
              </div>
              <div className="flex items-center gap-3">
                <DonutChart />
                <div className="flex-1 space-y-1.5">
                  <LegendRow
                    color="bg-brand-500"
                    label="Planned"
                    primary="18"
                    secondary="(32%)"
                  />
                  <LegendRow
                    color="bg-brand-300"
                    label="In Production"
                    primary="12"
                    secondary="(21%)"
                  />
                  <LegendRow
                    color="bg-success-500"
                    label="Completed"
                    primary="20"
                    secondary="(36%)"
                  />
                  <LegendRow
                    color="bg-owed-500"
                    label="Delayed"
                    primary="6"
                    secondary="(11%)"
                  />
                </div>
              </div>
            </div>

            {/* Shortage Alerts */}
            <div className="rounded-xl border border-border bg-white p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Material Shortage Alerts
              </div>
              <ul className="space-y-2">
                <ShortageRow
                  name="Shea Butter"
                  detail="Short by 5kg"
                  severity="Critical"
                />
                <ShortageRow
                  name="Fragrance Oil"
                  detail="Short by 2L"
                  severity="High"
                />
                <ShortageRow
                  name="Packaging Bottle (250ml)"
                  detail="Short by 100"
                  severity="Medium"
                />
              </ul>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-semibold text-brand-700">
                  View all shortages →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-md"
      style={{
        background:
          'linear-gradient(135deg, var(--tw-color-brand-500, #00B8E8) 0%, var(--tw-color-success-500, #8BD91E) 100%)',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
        <path d="M3 4l5-2 5 2v8l-5 2-5-2V4z" fill="white" />
      </svg>
    </span>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium ${
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-slate-600'
      }`}
    >
      <Icon size={12} className={active ? 'text-brand-700' : 'text-slate-400'} />
      <span>{label}</span>
    </div>
  );
}

const TONE_ICON_BG: Record<'brand' | 'success' | 'owed', string> = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  owed: 'bg-owed-50 text-owed-700',
};

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: string;
  tone: 'brand' | 'success' | 'owed';
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="num mt-1 text-lg font-black text-ink">{value}</div>
          <div className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-success-700">
            <ArrowUpRight size={10} />
            {delta}
          </div>
        </div>
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE_ICON_BG[tone]}`}
        >
          <Icon size={13} />
        </div>
      </div>
    </div>
  );
}

function DonutChart() {
  // 4-segment donut using conic-gradient. Percentages match the legend:
  // Planned 32% (brand-500), In Production 21% (brand-300),
  // Completed 36% (success-500), Delayed 11% (owed-500).
  const gradient = `conic-gradient(
    #00B8E8 0% 32%,
    #45CBF2 32% 53%,
    #8BD91E 53% 89%,
    #F59E0B 89% 100%
  )`;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: gradient }}
      />
      <div className="absolute inset-[18%] rounded-full bg-white" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[14px] font-black leading-none text-ink">56</div>
        <div className="mt-0.5 text-[7px] font-medium uppercase tracking-wide text-slate-500">
          Total
        </div>
        <div className="text-[7px] font-medium uppercase tracking-wide text-slate-500">
          Orders
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  primary,
  secondary,
}: {
  color: string;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
      <span className="flex-1 text-slate-600">{label}</span>
      <span className="num font-semibold text-ink">{primary}</span>
      <span className="text-slate-400">{secondary}</span>
    </div>
  );
}

function ShortageRow({
  name,
  detail,
  severity,
}: {
  name: string;
  detail: string;
  severity: 'Critical' | 'High' | 'Medium';
}) {
  const tone = {
    Critical: 'bg-rose-100 text-rose-700',
    High: 'bg-owed-100 text-owed-800',
    Medium: 'bg-slate-200 text-slate-700',
  }[severity];
  const iconTone = {
    Critical: 'bg-rose-50 text-rose-600',
    High: 'bg-owed-50 text-owed-700',
    Medium: 'bg-slate-100 text-slate-600',
  }[severity];
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconTone}`}
        >
          <AlertTriangle size={12} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold text-ink">{name}</div>
          <div className="text-[9px] text-slate-500">{detail}</div>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${tone}`}
      >
        {severity}
      </span>
    </li>
  );
}

/**
 * Two small "secondary cards" that visually peek out from the bottom-left
 * of the dashboard frame in the marketing hero (Recent Orders + Purchase
 * Orders). Exported separately so the hero can position them with absolute
 * coords without nesting them inside the main mockup card.
 */
export function DashboardSecondaryCards() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-border bg-white p-3 shadow-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-ink">Recent Orders</span>
          <span className="text-[9px] font-semibold text-brand-700">
            View all →
          </span>
        </div>
        <ul className="space-y-1.5">
          <OrderRow id="ORD-00124" name="Shea Body Cream" qty="100 pcs" tag="In Production" tone="brand" />
          <OrderRow id="ORD-00123" name="Face Serum" qty="50 pcs" tag="Planned" tone="slate" />
          <OrderRow id="ORD-00122" name="Body Lotion" qty="80 pcs" tag="Ready" tone="success" />
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-white p-3 shadow-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-ink">Purchase Orders</span>
          <span className="text-[9px] font-semibold text-brand-700">
            View all →
          </span>
        </div>
        <ul className="space-y-1.5">
          <POrderRow id="PO-00056" name="Shea Butter" qty="50kg" tag="Ordered" tone="brand" />
          <POrderRow id="PO-00055" name="Fragrance Oil" qty="10L" tag="Partially Received" tone="owed" />
          <POrderRow id="PO-00054" name="Bottle (250ml)" qty="500 pcs" tag="Received" tone="success" />
        </ul>
      </div>
    </div>
  );
}

const TAG_TONE: Record<string, string> = {
  brand: 'bg-brand-100 text-brand-800',
  slate: 'bg-slate-100 text-slate-700',
  success: 'bg-success-100 text-success-800',
  owed: 'bg-owed-100 text-owed-800',
};

function OrderRow({
  id,
  name,
  qty,
  tag,
  tone,
}: {
  id: string;
  name: string;
  qty: string;
  tag: string;
  tone: 'brand' | 'slate' | 'success' | 'owed';
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-[10px]">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] text-brand-700">{id}</div>
        <div className="truncate font-semibold text-ink">{name}</div>
        <div className="text-[8px] text-slate-500">{qty}</div>
      </div>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${TAG_TONE[tone]}`}
      >
        {tag}
      </span>
    </li>
  );
}

function POrderRow({
  id,
  name,
  qty,
  tag,
  tone,
}: {
  id: string;
  name: string;
  qty: string;
  tag: string;
  tone: 'brand' | 'slate' | 'success' | 'owed';
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-[10px]">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] text-brand-700">{id}</div>
        <div className="truncate font-semibold text-ink">{name}</div>
        <div className="text-[8px] text-slate-500">{qty}</div>
      </div>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${TAG_TONE[tone]}`}
      >
        {tag}
      </span>
    </li>
  );
}
