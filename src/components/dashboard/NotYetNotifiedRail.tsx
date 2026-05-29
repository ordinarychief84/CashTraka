import Link from 'next/link';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { whatsappSendService } from '@/lib/services/whatsapp-send.service';

/**
 * Dashboard rail (Decision 5 of 5).
 *
 * Counts customer touchpoints where the wa.me link was generated but the
 * owner never confirmed "Yes, sent". Surfaces the gap so the dashboard
 * picks it up at a glance instead of waiting for the owner to scroll
 * through individual orders. Renders nothing when the count is zero.
 */
export async function NotYetNotifiedRail({ userId }: { userId: string }) {
  const counts = await whatsappSendService.unsentCounts(userId);
  if (counts.total === 0) return null;

  return (
    <Link
      href="/orders"
      className="flex items-center justify-between gap-3 rounded-xl border border-owed-200 bg-owed-50 px-4 py-3 transition hover:bg-owed-100"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-owed-700">
          <MessageCircle size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-owed-900">
            {counts.total} customer {counts.total === 1 ? 'touchpoint' : 'touchpoints'} not yet sent
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-owed-800/80">
            {counts.orderConfirmed > 0 ? `${counts.orderConfirmed} confirmation` : null}
            {counts.orderConfirmed > 0 && (counts.productionDone > 0 || counts.invoiceIssued > 0)
              ? ' · '
              : null}
            {counts.productionDone > 0 ? `${counts.productionDone} ready-for-pickup` : null}
            {counts.productionDone > 0 && counts.invoiceIssued > 0 ? ' · ' : null}
            {counts.invoiceIssued > 0 ? `${counts.invoiceIssued} invoice` : null}
          </div>
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-owed-700" />
    </Link>
  );
}
