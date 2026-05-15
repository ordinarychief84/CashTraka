import { requireAuth } from '@/lib/auth';
import { handled, ok, fail } from '@/lib/api-response';
import { autoPoService } from '@/lib/services/auto-po.service';
import { hasFeature } from '@/lib/gate';

/**
 * POST /api/auto-po/run
 *
 * Manual trigger for auto-PO drafting. Runs the same logic as the
 * daily cron, but synchronously for the calling user. Useful when the
 * owner is at the workshop, adds a couple of materials below reorder,
 * and wants the PO drafts immediately rather than at 8am tomorrow.
 *
 * Gated to the `autoPurchaseOrders` plan feature.
 */
export const POST = () =>
  handled(async () => {
    const auth = await requireAuth();
    if (!hasFeature(auth.owner, 'autoPurchaseOrders')) {
      return fail('Auto-drafted POs are on the Pro plan. Upgrade to use this.', 403);
    }
    const summary = await autoPoService.runForUser(auth.owner.id);
    return ok({
      draftsCreated: summary.draftsCreated,
      materialsCovered: summary.materialsCovered,
      skippedDeduped: summary.skippedDeduped,
      skippedNoSupplier: summary.skippedNoSupplier,
      pos: summary.pos,
    });
  });
