import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { documentAudit } from '@/lib/services/document-audit.service';
import { inventoryService, type StockMovementReason } from '@/lib/services/inventory.service';

export type RawMaterialCreateInput = {
  name: string;
  sku?: string | null;
  unit?: string | null;
  stock?: number;
  reorderLevel?: number;
  unitCostKobo?: number;
  supplierId?: string | null;
  expiresAt?: Date | null;
  notes?: string | null;
};

export type RawMaterialUpdateInput = Partial<RawMaterialCreateInput>;

export type AdjustStockInput = {
  delta: number;
  reason?: StockMovementReason; // defaults to ADJUSTMENT
  notes?: string | null;
};

export const rawMaterialsService = {
  async listForUser(
    userId: string,
    opts?: {
      q?: string;
      lowStockOnly?: boolean;
      supplierId?: string;
      take?: number;
      skip?: number;
      includeDeleted?: boolean;
    },
  ) {
    const take = Math.min(opts?.take ?? 50, 200);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const q = (opts?.q ?? '').trim();
    const where = {
      userId,
      ...(opts?.includeDeleted ? {} : { deletedAt: null }),
      ...(opts?.supplierId ? { supplierId: opts.supplierId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { sku: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    // When `lowStockOnly` is set we have to filter in app code (Prisma
    // can't compare two columns in a where). Total per tenant is small.
    if (opts?.lowStockOnly) {
      const all = await prisma.rawMaterial.findMany({
        where,
        orderBy: [{ stock: 'asc' }, { name: 'asc' }],
        include: { supplier: true },
      });
      const filtered = all.filter((m) => m.stock <= m.reorderLevel);
      return { rows: filtered.slice(skip, skip + take), total: filtered.length };
    }

    const [rows, total] = await Promise.all([
      prisma.rawMaterial.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { supplier: true },
        take,
        skip,
      }),
      prisma.rawMaterial.count({ where }),
    ]);
    return { rows, total };
  },

  async getForUser(userId: string, materialId: string) {
    const material = await prisma.rawMaterial.findUnique({
      where: { id: materialId },
      include: { supplier: true },
    });
    if (!material || material.userId !== userId) {
      throw Err.notFound('Material not found');
    }
    return material;
  },

  async create(userId: string, input: RawMaterialCreateInput, actorId?: string | null) {
    if (input.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
      if (!supplier || supplier.userId !== userId || supplier.deletedAt) {
        throw Err.validation('Supplier not found for this account.');
      }
    }
    const material = await prisma.rawMaterial.create({
      data: {
        userId,
        name: input.name.trim(),
        sku: input.sku?.trim() || null,
        unit: input.unit?.trim() || 'unit',
        stock: input.stock ?? 0,
        reorderLevel: input.reorderLevel ?? 0,
        unitCostKobo: input.unitCostKobo ?? 0,
        supplierId: input.supplierId ?? null,
        expiresAt: input.expiresAt ?? null,
        notes: input.notes?.trim() || null,
      },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'RAW_MATERIAL',
      entityId: material.id,
      action: 'CREATED',
      metadata: { name: material.name, unit: material.unit },
    });
    return material;
  },

  async update(
    userId: string,
    materialId: string,
    patch: RawMaterialUpdateInput,
    actorId?: string | null,
  ) {
    const existing = await prisma.rawMaterial.findUnique({ where: { id: materialId } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Material not found');
    }
    if (patch.supplierId !== undefined && patch.supplierId !== null) {
      const supplier = await prisma.supplier.findUnique({ where: { id: patch.supplierId } });
      if (!supplier || supplier.userId !== userId || supplier.deletedAt) {
        throw Err.validation('Supplier not found for this account.');
      }
    }
    const material = await prisma.rawMaterial.update({
      where: { id: materialId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.sku !== undefined ? { sku: patch.sku?.trim() || null } : {}),
        ...(patch.unit !== undefined ? { unit: patch.unit?.trim() || 'unit' } : {}),
        ...(patch.reorderLevel !== undefined ? { reorderLevel: patch.reorderLevel } : {}),
        ...(patch.unitCostKobo !== undefined ? { unitCostKobo: patch.unitCostKobo } : {}),
        ...(patch.supplierId !== undefined ? { supplierId: patch.supplierId } : {}),
        ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
      },
    });
    // NOTE: `stock` is intentionally NOT updated here. Use `adjustStock` so
    // every change goes through the StockMovement ledger.
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'RAW_MATERIAL',
      entityId: material.id,
      action: 'UPDATED',
    });
    return material;
  },

  async softDelete(userId: string, materialId: string, actorId?: string | null) {
    const existing = await prisma.rawMaterial.findUnique({ where: { id: materialId } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Material not found');
    }
    const material = await prisma.rawMaterial.update({
      where: { id: materialId },
      data: { deletedAt: new Date() },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'RAW_MATERIAL',
      entityId: material.id,
      action: 'CANCELLED',
    });
    return material;
  },

  /**
   * Adjust the stock level by a delta. Writes a single StockMovement row.
   * For business-event-driven changes (purchase receive, production
   * consume/produce) use the production / purchase services directly so
   * the ref* fields point at the source doc.
   */
  async adjustStock(
    userId: string,
    materialId: string,
    input: AdjustStockInput,
    actorId?: string | null,
  ) {
    const movement = await inventoryService.recordMovement({
      userId,
      itemType: 'MATERIAL',
      itemId: materialId,
      reason: input.reason ?? 'ADJUSTMENT',
      delta: input.delta,
      notes: input.notes ?? null,
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'RAW_MATERIAL',
      entityId: materialId,
      action: 'STOCK_ADJUSTED',
      metadata: { delta: input.delta, reason: movement.reason, balanceAfter: movement.balanceAfter },
    });
    return movement;
  },
};
