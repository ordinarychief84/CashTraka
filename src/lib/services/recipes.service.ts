import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { documentAudit } from '@/lib/services/document-audit.service';

export type RecipeUpsertItem = {
  materialId: string;
  quantity: number;
  notes?: string | null;
};

export type RecipeUpsertInput = {
  yieldQty?: number;
  notes?: string | null;
  items: RecipeUpsertItem[];
};

export const recipesService = {
  async listForUser(userId: string, opts?: { take?: number; skip?: number }) {
    const take = Math.min(opts?.take ?? 100, 200);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const [rows, total] = await Promise.all([
      prisma.recipe.findMany({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, archived: true } },
          items: { include: { material: { select: { id: true, name: true, unit: true } } } },
        },
        take,
        skip,
      }),
      prisma.recipe.count({ where: { userId, deletedAt: null } }),
    ]);
    return { rows, total };
  },

  async getForProduct(userId: string, productId: string) {
    const recipe = await prisma.recipe.findUnique({
      where: { productId },
      include: {
        product: true,
        items: {
          include: { material: true },
          orderBy: { quantity: 'desc' },
        },
      },
    });
    if (!recipe || recipe.userId !== userId || recipe.deletedAt) return null;
    return recipe;
  },

  /**
   * Atomic upsert: replace all items in one transaction. The product must
   * belong to the same user. Validates every material is owned by the user
   * and not soft-deleted.
   */
  async upsertForProduct(
    userId: string,
    productId: string,
    input: RecipeUpsertInput,
    actorId?: string | null,
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true },
    });
    if (!product || product.userId !== userId) {
      throw Err.notFound('Product not found');
    }

    const uniqueMaterialIds = Array.from(new Set(input.items.map((i) => i.materialId)));
    if (uniqueMaterialIds.length !== input.items.length) {
      throw Err.validation('Each material can appear only once in a recipe.');
    }
    const materials = await prisma.rawMaterial.findMany({
      where: { id: { in: uniqueMaterialIds }, userId, deletedAt: null },
      select: { id: true },
    });
    if (materials.length !== uniqueMaterialIds.length) {
      throw Err.validation('One or more materials are unavailable for this account.');
    }

    const yieldQty = Math.max(1, Math.floor(input.yieldQty ?? 1));

    const recipe = await prisma.$transaction(async (tx) => {
      const existing = await tx.recipe.findUnique({ where: { productId } });
      const saved = existing
        ? await tx.recipe.update({
            where: { productId },
            data: {
              yieldQty,
              notes: input.notes?.trim() || null,
              deletedAt: null,
            },
          })
        : await tx.recipe.create({
            data: {
              userId,
              productId,
              yieldQty,
              notes: input.notes?.trim() || null,
            },
          });

      if (existing) {
        await tx.recipeItem.deleteMany({ where: { recipeId: saved.id } });
      }
      await tx.recipeItem.createMany({
        data: input.items.map((item) => ({
          recipeId: saved.id,
          materialId: item.materialId,
          quantity: Math.max(1, Math.floor(item.quantity)),
          notes: item.notes?.trim() || null,
        })),
      });

      return saved;
    });

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'RECIPE',
      entityId: recipe.id,
      action: 'UPDATED',
      metadata: { productId, items: input.items.length, yieldQty },
    });

    return prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: {
        product: true,
        items: { include: { material: true } },
      },
    });
  },

  async softDelete(userId: string, productId: string, actorId?: string | null) {
    const recipe = await prisma.recipe.findUnique({ where: { productId } });
    if (!recipe || recipe.userId !== userId || recipe.deletedAt) {
      throw Err.notFound('Recipe not found');
    }
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { deletedAt: new Date() },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'RECIPE',
      entityId: recipe.id,
      action: 'CANCELLED',
    });
  },
};
