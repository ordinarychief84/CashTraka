import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { documentAudit } from '@/lib/services/document-audit.service';

export type SupplierCreateInput = {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  supplierCategory?: string | null;
  materialsSupplied?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  minimumOrderQuantity?: number | null;
  deliveryMethod?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  notes?: string | null;
};

export type SupplierUpdateInput = Partial<SupplierCreateInput>;

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

export const suppliersService = {
  async listForUser(
    userId: string,
    opts?: { q?: string; take?: number; skip?: number; includeDeleted?: boolean },
  ) {
    const take = Math.min(opts?.take ?? 50, 200);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const q = (opts?.q ?? '').trim();
    const where = {
      userId,
      ...(opts?.includeDeleted ? {} : { deletedAt: null }),
      ...(q
        ? { name: { contains: q, mode: 'insensitive' as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        take,
        skip,
      }),
      prisma.supplier.count({ where }),
    ]);
    return { rows, total };
  },

  async getForUser(userId: string, supplierId: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        rawMaterials: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
        purchaseOrders: {
          where: { deletedAt: null, status: { in: ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!supplier || supplier.userId !== userId) throw Err.notFound('Supplier not found');
    return supplier;
  },

  async create(userId: string, input: SupplierCreateInput, actorId?: string | null) {
    const supplier = await prisma.supplier.create({
      data: {
        userId,
        name: input.name.trim(),
        contactPerson: cleanStr(input.contactPerson),
        phone: cleanStr(input.phone),
        whatsappNumber: cleanStr(input.whatsappNumber),
        email: cleanStr(input.email?.toLowerCase()),
        address: cleanStr(input.address),
        supplierCategory: cleanStr(input.supplierCategory),
        materialsSupplied: cleanStr(input.materialsSupplied),
        paymentTerms: cleanStr(input.paymentTerms),
        leadTimeDays: input.leadTimeDays ?? null,
        minimumOrderQuantity: input.minimumOrderQuantity ?? null,
        deliveryMethod: cleanStr(input.deliveryMethod),
        status: input.status ?? 'ACTIVE',
        notes: cleanStr(input.notes),
      },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'SUPPLIER',
      entityId: supplier.id,
      action: 'CREATED',
      metadata: { name: supplier.name },
    });
    return supplier;
  },

  async update(
    userId: string,
    supplierId: string,
    patch: SupplierUpdateInput,
    actorId?: string | null,
  ) {
    const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Supplier not found');
    }
    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.contactPerson !== undefined
          ? { contactPerson: cleanStr(patch.contactPerson) }
          : {}),
        ...(patch.phone !== undefined ? { phone: cleanStr(patch.phone) } : {}),
        ...(patch.whatsappNumber !== undefined
          ? { whatsappNumber: cleanStr(patch.whatsappNumber) }
          : {}),
        ...(patch.email !== undefined
          ? { email: cleanStr(patch.email?.toLowerCase()) }
          : {}),
        ...(patch.address !== undefined ? { address: cleanStr(patch.address) } : {}),
        ...(patch.supplierCategory !== undefined
          ? { supplierCategory: cleanStr(patch.supplierCategory) }
          : {}),
        ...(patch.materialsSupplied !== undefined
          ? { materialsSupplied: cleanStr(patch.materialsSupplied) }
          : {}),
        ...(patch.paymentTerms !== undefined
          ? { paymentTerms: cleanStr(patch.paymentTerms) }
          : {}),
        ...(patch.leadTimeDays !== undefined ? { leadTimeDays: patch.leadTimeDays ?? null } : {}),
        ...(patch.minimumOrderQuantity !== undefined
          ? { minimumOrderQuantity: patch.minimumOrderQuantity ?? null }
          : {}),
        ...(patch.deliveryMethod !== undefined
          ? { deliveryMethod: cleanStr(patch.deliveryMethod) }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.notes !== undefined ? { notes: cleanStr(patch.notes) } : {}),
      },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'SUPPLIER',
      entityId: supplier.id,
      action: 'UPDATED',
    });
    return supplier;
  },

  /**
   * Called after a PurchaseOrder is fully received. Updates the rolling
   * supplier-performance fields: lastPurchase*, onTimeDeliveryRating,
   * qualityRating. Cheap rolling computation — no separate analytics
   * table needed.
   */
  async recordPurchaseReceived(
    userId: string,
    supplierId: string,
    args: {
      receivedOnTime: boolean;
      rejectedRatio: number; // 0..1, fraction of received qty rejected
      totalKobo: number;
    },
  ) {
    const existing = await prisma.supplier.findFirst({
      where: { id: supplierId, userId, deletedAt: null },
    });
    if (!existing) return null;

    // Simple rolling formula: new = 0.7 × prev + 0.3 × this. Stored as 0–100.
    const otdNow = args.receivedOnTime ? 100 : 0;
    const otd =
      existing.onTimeDeliveryRating == null
        ? otdNow
        : Math.round(existing.onTimeDeliveryRating * 0.7 + otdNow * 0.3);

    const qualityNow = Math.round((1 - Math.min(1, Math.max(0, args.rejectedRatio))) * 100);
    const quality =
      existing.qualityRating == null
        ? qualityNow
        : Math.round(existing.qualityRating * 0.7 + qualityNow * 0.3);

    return prisma.supplier.update({
      where: { id: supplierId },
      data: {
        lastPurchaseAt: new Date(),
        lastPurchaseAmountKobo: args.totalKobo,
        onTimeDeliveryRating: otd,
        qualityRating: quality,
      },
    });
  },

  async softDelete(userId: string, supplierId: string, actorId?: string | null) {
    const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Supplier not found');
    }
    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: { deletedAt: new Date() },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'SUPPLIER',
      entityId: supplier.id,
      action: 'CANCELLED',
    });
    return supplier;
  },
};
