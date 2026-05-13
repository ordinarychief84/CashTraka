import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { documentAudit } from '@/lib/services/document-audit.service';

export type SupplierCreateInput = {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type SupplierUpdateInput = Partial<SupplierCreateInput>;

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
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
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
          ? { contactPerson: patch.contactPerson?.trim() || null }
          : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone?.trim() || null } : {}),
        ...(patch.email !== undefined
          ? { email: patch.email?.trim().toLowerCase() || null }
          : {}),
        ...(patch.address !== undefined ? { address: patch.address?.trim() || null } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
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
