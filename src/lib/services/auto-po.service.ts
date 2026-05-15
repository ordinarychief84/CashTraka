import { prisma } from '@/lib/prisma';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * Auto-PO drafting — closes the operational loop on materials.
 *
 * Trigger (cron, ~8am):
 *   1. Find every RawMaterial at/below reorder level that has a
 *      supplierId set (auto-PO needs a destination supplier).
 *   2. Group those materials by supplier — one DRAFT PO per supplier.
 *   3. Skip materials that already have an open DRAFT/SENT/ORDERED PO
 *      with the same supplier in the last 14 days (dedupe so a daily
 *      cron doesn't drown the owner in duplicate drafts).
 *   4. Compute per-line quantity: enough to refill to 2× reorder level,
 *      respecting `minimumPurchaseQuantity` when set.
 *   5. Create each PO via the existing purchaseOrdersService.create
 *      (audit log + numbering all handled).
 *
 * Returns a per-user summary the cron can email to the owner.
 *
 * Never auto-SENDS — the PO is left in DRAFT for the owner to review,
 * adjust quantity, and tap "Send". This matches Nigerian SME workflow
 * where the owner usually has a relationship with the supplier and
 * wants to confirm by WhatsApp first.
 */

const DEDUPE_WINDOW_DAYS = 14;

export type AutoPoSummary = {
  userId: string;
  draftsCreated: number;
  materialsCovered: number;
  pos: {
    id: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    totalKobo: number;
    lineCount: number;
  }[];
  skippedDeduped: number;
  skippedNoSupplier: number;
};

export const autoPoService = {
  /**
   * Build one user's auto-PO batch and return a summary.
   * Does NOT send any emails — the caller (cron) handles outbound.
   */
  async runForUser(userId: string): Promise<AutoPoSummary> {
    const summary: AutoPoSummary = {
      userId,
      draftsCreated: 0,
      materialsCovered: 0,
      pos: [],
      skippedDeduped: 0,
      skippedNoSupplier: 0,
    };

    // 1. low-stock materials (already de-duped by inventoryService).
    const lowMaterials = await inventoryService.computeLowStockMaterials(userId);
    if (lowMaterials.length === 0) return summary;

    // 2. partition by supplier presence + filter recent-PO dedupe.
    const bySupplier = new Map<
      string,
      {
        supplier: { id: string; name: string };
        materials: typeof lowMaterials;
      }
    >();

    const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 86_400_000);

    for (const m of lowMaterials) {
      if (!m.supplierId || !m.supplier) {
        summary.skippedNoSupplier++;
        continue;
      }

      // Skip if a recent open PO already covers this material from this supplier.
      const recentPoCount = await prisma.purchaseOrderItem.count({
        where: {
          materialId: m.id,
          purchaseOrder: {
            userId,
            deletedAt: null,
            supplierId: m.supplierId,
            status: { in: ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
            createdAt: { gte: dedupeSince },
          },
        },
      });
      if (recentPoCount > 0) {
        summary.skippedDeduped++;
        continue;
      }

      const entry = bySupplier.get(m.supplierId) ?? {
        supplier: { id: m.supplierId, name: m.supplier.name },
        materials: [] as typeof lowMaterials,
      };
      entry.materials.push(m);
      bySupplier.set(m.supplierId, entry);
    }

    // 3. draft one PO per supplier via the canonical create() service.
    for (const [supplierId, entry] of bySupplier.entries()) {
      const items = entry.materials.map((m) => {
        // Refill target = 2× reorderLevel. Quantity needed = target - onHand.
        // Floor at minimumPurchaseQuantity (when set) so we never under-order.
        const target = Math.max(1, m.reorderLevel * 2);
        const need = Math.max(1, target - m.stock);
        const moq = m.minimumPurchaseQuantity ?? 0;
        const quantity = Math.max(need, moq);
        return {
          materialId: m.id,
          quantity,
          unitCostKobo: m.unitCostKobo ?? 0,
        };
      });

      // Expected delivery = today + supplier-aware lead time (rough).
      const leadDays = Math.max(
        ...entry.materials.map((m) => m.expectedLeadTimeDays ?? 0),
        0,
      );
      const expectedAt = leadDays > 0
        ? new Date(Date.now() + leadDays * 86_400_000)
        : null;

      try {
        const po = await purchaseOrdersService.create(userId, {
          supplierId,
          items,
          expectedAt,
          notes: `Auto-drafted from low-stock alerts on ${new Date().toLocaleDateString(
            'en-NG',
            { day: 'numeric', month: 'short' },
          )}. Review quantities + send when ready.`,
        });
        summary.draftsCreated++;
        summary.materialsCovered += entry.materials.length;
        summary.pos.push({
          id: po.id,
          poNumber: po.poNumber,
          supplierId,
          supplierName: entry.supplier.name,
          totalKobo: po.totalKobo,
          lineCount: po.items.length,
        });
      } catch (err) {
        // Don't fail the whole batch on one bad supplier — log + continue.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[auto-po] draft failed for supplier', supplierId, err);
        }
      }
    }

    return summary;
  },

  /**
   * Render the summary as a one-paragraph WhatsApp message the owner
   * can forward to a partner or just keep as a recap.
   */
  toWhatsAppText(businessName: string | null | undefined, summary: AutoPoSummary): string {
    const naira = (k: number) => '₦' + Math.round(k / 100).toLocaleString('en-NG');
    const lines: string[] = [];
    lines.push(`*CashTraka — auto-drafted POs*`);
    if (businessName) lines.push(businessName);
    lines.push('');
    lines.push(`${summary.draftsCreated} draft purchase order${summary.draftsCreated === 1 ? '' : 's'} ready to send.`);
    if (summary.pos.length > 0) {
      lines.push('');
      for (const p of summary.pos) {
        lines.push(`• ${p.poNumber} → ${p.supplierName} (${p.lineCount} item${p.lineCount === 1 ? '' : 's'}, ${naira(p.totalKobo)})`);
      }
    }
    if (summary.skippedNoSupplier > 0) {
      lines.push('');
      lines.push(`${summary.skippedNoSupplier} material${summary.skippedNoSupplier === 1 ? ' has' : 's have'} no supplier assigned — set one to auto-draft next time.`);
    }
    return lines.join('\n');
  },
};
