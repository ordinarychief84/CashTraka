import {
  ShoppingCart,
  Factory,
  FileText,
  Banknote,
  Boxes,
  Receipt,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from './DashboardCard';

/**
 * Recent Activities — last 8 DocumentAuditLog rows, rendered as a
 * timeline with a coloured icon + sentence + time ago. Each entity
 * type maps to a sensible icon + tone.
 */
export async function RecentActivitiesCard({ userId }: { userId: string }) {
  const logs = await prisma.documentAuditLog
    .findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    .catch(() => [] as never[]);

  return (
    <DashboardCard title="Recent Activities" viewAllHref="/admin/document-audit">
      {logs.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">
          Activity from new orders, production runs, and payments will appear
          here.
        </p>
      ) : (
        <ul className="space-y-3">
          {logs.map((l) => {
            const { Icon, tone, sentence } = describeLog(l);
            return (
              <li key={l.id} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-700">{sentence}</div>
                  <div className="text-[10px] text-slate-400">
                    {timeAgoShort(l.createdAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}

const ENTITY_ICON: Record<
  string,
  { Icon: LucideIcon; tone: string }
> = {
  PURCHASE_ORDER: { Icon: ShoppingCart, tone: 'bg-brand-50 text-brand-700' },
  PRODUCTION_ORDER: { Icon: Factory, tone: 'bg-success-100 text-success-700' },
  INVOICE: { Icon: FileText, tone: 'bg-owed-50 text-owed-700' },
  PAYMENT: { Icon: Banknote, tone: 'bg-success-100 text-success-700' },
  RAW_MATERIAL: { Icon: Boxes, tone: 'bg-brand-50 text-brand-700' },
  RECEIPT: { Icon: Receipt, tone: 'bg-brand-50 text-brand-700' },
  CUSTOMER_ORDER: { Icon: ShoppingCart, tone: 'bg-brand-50 text-brand-700' },
};

function describeLog(l: {
  entityType: string;
  entityId: string;
  action: string;
  metadata?: unknown;
}): { Icon: LucideIcon; tone: string; sentence: string } {
  const cfg = ENTITY_ICON[l.entityType] ?? {
    Icon: Activity,
    tone: 'bg-slate-100 text-slate-700',
  };
  const action = l.action.toLowerCase().replace(/_/g, ' ');
  const subject =
    l.entityType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) =>
      c.toUpperCase(),
    );
  const idTail = l.entityId.slice(-6).toUpperCase();
  return {
    ...cfg,
    sentence: `${subject} ${idTail} ${action}`,
  };
}

function timeAgoShort(date: Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}
