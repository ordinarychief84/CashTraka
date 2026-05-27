import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

/**
 * Shared CRUD for PaymentTermDef + DeliveryTermDef. Both tables have
 * the same shape: per-tenant, soft-deletable, with one row flagged
 * as the default. The "default" flip is mutually exclusive — setting
 * one row as default unflags every other row for that tenant in the
 * same transaction.
 *
 * We DON'T enforce hard uniqueness on (userId, name) at the DB layer
 * because Postgres partial-unique indexes (where deletedAt IS NULL)
 * aren't directly expressible in Prisma; instead we check at the
 * service layer below.
 */

export type TermCreateInput = {
  name: string;
  description?: string | null;
  /** Only meaningful for PaymentTermDef; ignored by delivery terms. */
  netDays?: number | null;
  isDefault?: boolean;
};

export type TermUpdateInput = Partial<TermCreateInput>;

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function validateName(name: string) {
  const t = name.trim();
  if (t.length < 1) throw Err.validation('Name is required.');
  if (t.length > 100) throw Err.validation('Name is too long (max 100 characters).');
  return t;
}

export const paymentTermsService = {
  async listForUser(userId: string) {
    return prisma.paymentTermDef.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  },

  async create(userId: string, input: TermCreateInput) {
    const name = validateName(input.name);
    const description = cleanStr(input.description);
    const netDays =
      typeof input.netDays === 'number' && Number.isFinite(input.netDays)
        ? Math.max(0, Math.floor(input.netDays))
        : null;

    // Soft duplicate-name guard (case-insensitive, active rows only).
    const existing = await prisma.paymentTermDef.findFirst({
      where: {
        userId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw Err.validation(`A payment term named "${name}" already exists.`);
    }

    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.paymentTermDef.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.paymentTermDef.create({
        data: {
          userId,
          name,
          description,
          netDays,
          isDefault: !!input.isDefault,
        },
      });
    });
  },

  async update(userId: string, id: string, input: TermUpdateInput) {
    const existing = await prisma.paymentTermDef.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Payment term not found.');
    }
    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = validateName(input.name);
    if ('description' in input) data.description = cleanStr(input.description);
    if ('netDays' in input) {
      data.netDays =
        typeof input.netDays === 'number' && Number.isFinite(input.netDays)
          ? Math.max(0, Math.floor(input.netDays))
          : null;
    }
    return prisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.paymentTermDef.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
        data.isDefault = true;
      } else if (input.isDefault === false) {
        data.isDefault = false;
      }
      return tx.paymentTermDef.update({ where: { id }, data });
    });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.paymentTermDef.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Payment term not found.');
    }
    return prisma.paymentTermDef.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });
  },
};

export const deliveryTermsService = {
  async listForUser(userId: string) {
    return prisma.deliveryTermDef.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  },

  async create(userId: string, input: TermCreateInput) {
    const name = validateName(input.name);
    const description = cleanStr(input.description);

    const existing = await prisma.deliveryTermDef.findFirst({
      where: {
        userId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw Err.validation(`A delivery term named "${name}" already exists.`);
    }

    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.deliveryTermDef.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.deliveryTermDef.create({
        data: {
          userId,
          name,
          description,
          isDefault: !!input.isDefault,
        },
      });
    });
  },

  async update(userId: string, id: string, input: TermUpdateInput) {
    const existing = await prisma.deliveryTermDef.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Delivery term not found.');
    }
    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = validateName(input.name);
    if ('description' in input) data.description = cleanStr(input.description);
    return prisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.deliveryTermDef.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
        data.isDefault = true;
      } else if (input.isDefault === false) {
        data.isDefault = false;
      }
      return tx.deliveryTermDef.update({ where: { id }, data });
    });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.deliveryTermDef.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Delivery term not found.');
    }
    return prisma.deliveryTermDef.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });
  },
};
