import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { documentAudit } from '@/lib/services/document-audit.service';
import { inventoryService } from '@/lib/services/inventory.service';
import { emailService } from '@/lib/services/email.service';
import { lowStockSupplierPingLink } from '@/lib/whatsapp.util';
import { nextPurchaseOrderNumber } from '@/lib/op-numbers';

export type PurchaseOrderCreateItem = {
  materialId: string;
  quantity: number;
  unitCostKobo?: number;
};

export type PurchaseOrderCreateInput = {
  supplierId: string;
  expectedAt?: Date | null;
  notes?: string | null;
  items: PurchaseOrderCreateItem[];
};

export type PurchaseOrderReceiveLine = {
  itemId: string;
  quantity: number;
};

type PurchaseStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

const TERMINAL: PurchaseStatus[] = ['RECEIVED', 'CANCELLED'];

export const purchaseOrdersService = {
  async listForUser(
    userId: string,
    opts?: {
      status?: PurchaseStatus | PurchaseStatus[];
      supplierId?: string;
      take?: number;
      skip?: number;
    },
  ) {
    const take = Math.min(opts?.take ?? 50, 200);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const statusFilter = Array.isArray(opts?.status)
      ? { in: opts!.status }
      : opts?.status
        ? { equals: opts.status }
        : undefined;
    const where = {
      userId,
      deletedAt: null,
      ...(opts?.supplierId ? { supplierId: opts.supplierId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true, phone: true, email: true } },
          items: {
            include: {
              material: { select: { id: true, name: true, unit: true } },
            },
          },
        },
        take,
        skip,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    return { rows, total };
  },

  async getForUser(userId: string, purchaseOrderId: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        supplier: true,
        items: { include: { material: true } },
      },
    });
    if (!po || po.userId !== userId) {
      throw Err.notFound('Purchase order not found');
    }
    return po;
  },

  async create(
    userId: string,
    input: PurchaseOrderCreateInput,
    actorId?: string | null,
  ) {
    // Empty items allowed for drafts created from the Rackbeat-style
    // dialog. Materials get added on the detail page, and `/send` /
    // `/receive` guard against shipping a PO with zero lines.
    const supplier = await prisma.supplier.findUnique({
      where: { id: input.supplierId },
    });
    if (!supplier || supplier.userId !== userId || supplier.deletedAt) {
      throw Err.validation('Supplier not found.');
    }
    const materialIds = Array.from(new Set(input.items.map((i) => i.materialId)));
    if (input.items.length > 0 && materialIds.length !== input.items.length) {
      throw Err.validation('Each material can appear only once per PO.');
    }
    const materials = materialIds.length
      ? await prisma.rawMaterial.findMany({
          where: { id: { in: materialIds }, userId, deletedAt: null },
        })
      : [];
    if (materials.length !== materialIds.length) {
      throw Err.validation('One or more materials are unavailable.');
    }
    const materialById = new Map(materials.map((m) => [m.id, m]));

    const lines = input.items.map((i) => {
      const m = materialById.get(i.materialId)!;
      const unitCostKobo = i.unitCostKobo ?? m.unitCostKobo ?? 0;
      const quantity = Math.max(1, Math.floor(i.quantity));
      return {
        materialId: i.materialId,
        quantity,
        unitCostKobo,
        totalKobo: unitCostKobo * quantity,
      };
    });
    const totalKobo = lines.reduce((sum, l) => sum + l.totalKobo, 0);

    const poNumber = await nextPurchaseOrderNumber(userId);

    const po = await prisma.purchaseOrder.create({
      data: {
        userId,
        supplierId: input.supplierId,
        poNumber,
        status: 'DRAFT',
        expectedAt: input.expectedAt ?? null,
        notes: input.notes?.trim() || null,
        totalKobo,
        items: { create: lines },
      },
      include: {
        supplier: true,
        items: { include: { material: true } },
      },
    });

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      action: 'CREATED',
      metadata: { poNumber: po.poNumber, totalKobo, supplierId: po.supplierId },
    });

    return po;
  },

  /**
   * One-click "draft a PO from a shortage row".
   *
   * Takes a single materialId — picks the material's supplier (errors
   * if the material has no supplier assigned), computes the shortage
   * across all active production runs via `inventoryService`, and drafts
   * a PO for `shortBy` units. Quantity rounds up so we never under-buy.
   *
   * Returns the new PO. Caller can redirect to /purchase-orders/[id].
   */
  async createFromShortage(
    userId: string,
    materialId: string,
    actorId?: string | null,
  ) {
    const material = await prisma.rawMaterial.findFirst({
      where: { id: materialId, userId, deletedAt: null },
    });
    if (!material) throw Err.notFound('Material not found');
    if (!material.supplierId) {
      throw Err.validation(
        `${material.name} has no supplier assigned. Open the material and set one before drafting a PO.`,
      );
    }
    // Reuse the shortage engine so the quantity we draft is exactly
    // what's needed for the active production runs, not a guess.
    const { inventoryService } = await import('./inventory.service');
    const shortages = await inventoryService.computeShortages(userId);
    const row = shortages.find((s) => s.materialId === materialId);
    // If no shortage today, default to topping back up to reorderLevel
    // so users can still draft a PO proactively when they spot a low row.
    const quantity =
      row && row.shortBy > 0
        ? Math.max(1, row.shortBy)
        : Math.max(1, material.reorderLevel - material.stock);
    if (quantity <= 0) {
      throw Err.validation(
        `${material.name} is already at or above its reorder level. Nothing to order.`,
      );
    }
    return this.create(
      userId,
      {
        supplierId: material.supplierId,
        items: [{ materialId, quantity }],
        notes: `Auto-drafted from shortage: ${quantity} ${material.unit} of ${material.name}.`,
      },
      actorId,
    );
  },

  /**
   * Flip a DRAFT to SENT. Returns the wa.me link (if supplier phone known)
   * and fires a Resend email (best-effort) if the supplier has one. The
   * caller chooses how to surface either to the user.
   */
  async send(userId: string, purchaseOrderId: string, actorId?: string | null) {
    const po = await this.getForUser(userId, purchaseOrderId);
    if (po.status !== 'DRAFT') {
      throw Err.conflict(`Cannot send a PO in status ${po.status}.`);
    }
    if (po.items.length === 0) {
      throw Err.validation('Add at least one material before sending this PO.');
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'SENT' },
    });

    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, name: true },
    });
    const businessName = owner?.businessName || owner?.name || 'CashTraka';

    const whatsappLink = po.supplier.phone
      ? lowStockSupplierPingLink({
          phone: po.supplier.phone,
          supplierName: po.supplier.name,
          businessName,
          poNumber: po.poNumber,
          items: po.items.map((it) => ({
            materialName: it.material.name,
            unit: it.material.unit,
            quantity: it.quantity,
          })),
          totalKobo: po.totalKobo,
          pdfUrl: po.pdfUrl,
          expectedAt: po.expectedAt,
        })
      : null;

    let emailResult: { ok: boolean; id?: string; error?: string } | null = null;
    if (po.supplier.email) {
      emailResult = await emailService.sendPurchaseOrderToSupplier({
        to: po.supplier.email,
        supplierName: po.supplier.name,
        businessName,
        poNumber: po.poNumber,
        expectedAt: po.expectedAt,
        notes: po.notes,
        items: po.items.map((it) => ({
          materialName: it.material.name,
          unit: it.material.unit,
          quantity: it.quantity,
          unitCostKobo: it.unitCostKobo,
        })),
        totalKobo: po.totalKobo,
        pdfUrl: po.pdfUrl,
      });
    }

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      action: 'SENT',
      metadata: {
        email: po.supplier.email ? (emailResult?.ok ? 'sent' : emailResult?.error || 'failed') : null,
        whatsappLinkGenerated: Boolean(whatsappLink),
      },
    });

    return { order: updated, whatsappLink, emailResult };
  },

  /**
   * Receive items against the PO. Writes one PURCHASE_RECEIVE StockMovement
   * per line in a single transaction; transitions status accordingly.
   */
  async receive(
    userId: string,
    purchaseOrderId: string,
    received: PurchaseOrderReceiveLine[],
    actorId?: string | null,
  ) {
    const po = await this.getForUser(userId, purchaseOrderId);
    if (TERMINAL.includes(po.status as PurchaseStatus) && po.status !== 'RECEIVED') {
      throw Err.conflict(`Cannot receive against a PO in status ${po.status}.`);
    }
    if (po.status === 'RECEIVED') {
      throw Err.conflict('This PO is already fully received.');
    }

    const itemById = new Map(po.items.map((it) => [it.id, it]));
    for (const r of received) {
      const item = itemById.get(r.itemId);
      if (!item) throw Err.validation(`Unknown line item ${r.itemId}.`);
      if (r.quantity <= 0) throw Err.validation('Receive quantity must be positive.');
      const remaining = item.quantity - item.quantityReceived;
      if (r.quantity > remaining) {
        throw Err.validation(
          `Cannot receive ${r.quantity} ${item.material.unit} of ${item.material.name} — only ${remaining} outstanding.`,
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const r of received) {
        const item = itemById.get(r.itemId)!;
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: { increment: r.quantity } },
        });
        await inventoryService.recordMovement(
          {
            userId,
            itemType: 'MATERIAL',
            itemId: item.materialId,
            reason: 'PURCHASE_RECEIVE',
            delta: r.quantity,
            refType: 'PURCHASE_ORDER',
            refId: po.id,
          },
          tx,
        );
        // Refresh unitCostKobo on the material if this PO has a new cost.
        if (item.unitCostKobo > 0) {
          await tx.rawMaterial.update({
            where: { id: item.materialId },
            data: { unitCostKobo: item.unitCostKobo },
          });
        }
      }

      // Recompute totals to decide the new status.
      const refreshed = await tx.purchaseOrder.findUnique({
        where: { id: po.id },
        include: { items: true },
      });
      const fullyReceived = (refreshed?.items ?? []).every(
        (it) => it.quantityReceived >= it.quantity,
      );
      const anyReceived = (refreshed?.items ?? []).some((it) => it.quantityReceived > 0);
      const nextStatus: PurchaseStatus = fullyReceived
        ? 'RECEIVED'
        : anyReceived
          ? 'PARTIALLY_RECEIVED'
          : 'ORDERED';

      return tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: nextStatus,
          ...(fullyReceived ? { receivedAt: new Date() } : {}),
        },
        include: {
          supplier: true,
          items: { include: { material: true } },
        },
      });
    });

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      action: result.status === 'RECEIVED' ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
      metadata: {
        lines: received.length,
        quantity: received.reduce((s, r) => s + r.quantity, 0),
      },
    });

    // Roll supplier performance metrics when a PO is fully received.
    if (result.status === 'RECEIVED' && result.supplierId) {
      try {
        const { suppliersService } = await import('./suppliers.service');
        const totalReceived = result.items.reduce(
          (s, it) => s + it.quantityReceived,
          0,
        );
        const totalRejected = result.items.reduce(
          (s, it) => s + (it.quantityRejected ?? 0),
          0,
        );
        const onTime = po.expectedAt
          ? new Date() <= new Date(po.expectedAt)
          : true;
        await suppliersService.recordPurchaseReceived(
          userId,
          result.supplierId,
          {
            receivedOnTime: onTime,
            rejectedRatio:
              totalReceived === 0 ? 0 : totalRejected / totalReceived,
            totalKobo: result.totalKobo,
          },
        );
      } catch (e) {
        console.warn('[purchase-orders] supplier rating update failed', e);
      }
    }

    return result;
  },

  async cancel(
    userId: string,
    purchaseOrderId: string,
    reason: string | null | undefined,
    actorId?: string | null,
  ) {
    const po = await this.getForUser(userId, purchaseOrderId);
    if (po.status === 'RECEIVED') {
      throw Err.conflict('Received POs cannot be cancelled.');
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'CANCELLED', deletedAt: new Date() },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      action: 'CANCELLED',
      metadata: reason ? { reason } : undefined,
    });
    return updated;
  },
};
