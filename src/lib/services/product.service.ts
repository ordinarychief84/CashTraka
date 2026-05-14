import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { nairaToKobo } from '@/lib/money';
import { documentAudit } from './document-audit.service';

/**
 * Product service. Owns finished-goods CRUD + stock-status derivation.
 *
 * Existing code paths (api/products/route.ts, ProductForm) still talk to
 * Prisma directly — this service is the single canonical entry point as
 * the codebase migrates over. New features should use these methods.
 */

export type CreateProductInput = {
  name: string;
  price: number;
  cost?: number | null;
  stock?: number;
  trackStock?: boolean;
  lowStockAt?: number;
  safetyStock?: number | null;
  note?: string | null;
  images?: string[];
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  unitOfSale?: string | null;
  minimumSellingQuantity?: number | null;
  defaultBatchSize?: number | null;
  defaultProductionLeadTimeDays?: number | null;
  canBeProduced?: boolean;
  batchTracking?: boolean;
  expiryTracking?: boolean;
  barcodeValue?: string | null;
  nafdacNumber?: string | null;
  shelfLifeDays?: number | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
};

export type UpdateProductInput = Partial<CreateProductInput> & {
  archived?: boolean;
  stockDelta?: number;
};

/**
 * Derive the cached `status` field from current numbers. Called whenever
 * stock or settings change so list pages can filter on a single column
 * instead of joining computed values.
 */
function deriveStatus(args: {
  trackStock: boolean;
  stock: number;
  lowStockAt: number;
  currentStatus: string;
}): 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' {
  // DISCONTINUED is operator-set; never auto-promoted out of it.
  if (args.currentStatus === 'DISCONTINUED') return 'DISCONTINUED';
  if (args.currentStatus === 'INACTIVE') return 'INACTIVE';
  return 'ACTIVE';
}

function cleanString(v: string | null | undefined): string | null {
  if (v == null) return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

export const productService = {
  async listForUser(
    userId: string,
    opts?: {
      includeArchived?: boolean;
      status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
      category?: string;
      canBeProduced?: boolean;
      take?: number;
    },
  ) {
    const where: Prisma.ProductWhereInput = {
      userId,
      ...(opts?.includeArchived ? {} : { archived: false }),
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.category ? { category: opts.category } : {}),
      ...(opts?.canBeProduced != null
        ? { canBeProduced: opts.canBeProduced }
        : {}),
    };
    const take = Math.min(opts?.take ?? 500, 1000);
    return prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      take,
    });
  },

  async getForUser(userId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) throw Err.notFound('Product not found');
    return product;
  },

  async create(
    userId: string,
    input: CreateProductInput,
    actorId?: string | null,
  ) {
    if (!input.name.trim()) throw Err.validation('Name is required.');
    if (input.price <= 0) {
      throw Err.validation('Price must be greater than 0.');
    }
    const stock = input.stock ?? 0;
    const lowStockAt = input.lowStockAt ?? 3;
    const trackStock = input.trackStock ?? true;
    const status = deriveStatus({
      trackStock,
      stock,
      lowStockAt,
      currentStatus: input.status ?? 'ACTIVE',
    });

    const product = await prisma.product.create({
      data: {
        userId,
        name: input.name.trim(),
        price: input.price,
        priceKobo: nairaToKobo(input.price),
        cost: input.cost ?? null,
        costKobo: input.cost == null ? null : nairaToKobo(input.cost),
        stock,
        trackStock,
        lowStockAt,
        safetyStock: input.safetyStock ?? null,
        note: cleanString(input.note),
        images: input.images ?? [],
        sku: cleanString(input.sku),
        description: cleanString(input.description),
        category: cleanString(input.category),
        unitOfSale: cleanString(input.unitOfSale),
        minimumSellingQuantity: input.minimumSellingQuantity ?? null,
        defaultBatchSize: input.defaultBatchSize ?? null,
        defaultProductionLeadTimeDays:
          input.defaultProductionLeadTimeDays ?? null,
        canBeProduced: input.canBeProduced ?? false,
        batchTracking: input.batchTracking ?? false,
        expiryTracking: input.expiryTracking ?? false,
        barcodeValue: cleanString(input.barcodeValue),
        nafdacNumber: cleanString(input.nafdacNumber),
        shelfLifeDays: input.shelfLifeDays ?? null,
        status,
      },
    });

    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'PRODUCT' as any,
        entityId: product.id,
        action: 'CREATED' as any,
        metadata: {
          name: product.name,
          sku: product.sku,
          canBeProduced: product.canBeProduced,
        },
      })
      .catch(() => {});

    return product;
  },

  async update(
    userId: string,
    productId: string,
    input: UpdateProductInput,
    actorId?: string | null,
  ) {
    const product = await this.getForUser(userId, productId);

    let nextStock = input.stock ?? product.stock;
    if (typeof input.stockDelta === 'number') {
      nextStock = Math.max(product.stock + input.stockDelta, 0);
    }

    const nextPrice = input.price ?? product.price;
    const nextCost =
      input.cost === undefined ? product.cost : input.cost ?? null;
    const nextTrackStock = input.trackStock ?? product.trackStock;
    const nextLowStockAt = input.lowStockAt ?? product.lowStockAt;
    const status = deriveStatus({
      trackStock: nextTrackStock,
      stock: nextStock,
      lowStockAt: nextLowStockAt,
      currentStatus: input.status ?? product.status,
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name?.trim() ?? product.name,
        price: nextPrice,
        priceKobo: nairaToKobo(nextPrice),
        cost: nextCost,
        costKobo: nextCost == null ? null : nairaToKobo(nextCost),
        stock: nextStock,
        trackStock: nextTrackStock,
        lowStockAt: nextLowStockAt,
        safetyStock:
          input.safetyStock === undefined
            ? product.safetyStock
            : input.safetyStock ?? null,
        note:
          input.note === undefined ? product.note : cleanString(input.note),
        archived: input.archived ?? product.archived,
        images: input.images ?? undefined,
        sku: input.sku === undefined ? product.sku : cleanString(input.sku),
        description:
          input.description === undefined
            ? product.description
            : cleanString(input.description),
        category:
          input.category === undefined
            ? product.category
            : cleanString(input.category),
        unitOfSale:
          input.unitOfSale === undefined
            ? product.unitOfSale
            : cleanString(input.unitOfSale),
        minimumSellingQuantity:
          input.minimumSellingQuantity === undefined
            ? product.minimumSellingQuantity
            : input.minimumSellingQuantity ?? null,
        defaultBatchSize:
          input.defaultBatchSize === undefined
            ? product.defaultBatchSize
            : input.defaultBatchSize ?? null,
        defaultProductionLeadTimeDays:
          input.defaultProductionLeadTimeDays === undefined
            ? product.defaultProductionLeadTimeDays
            : input.defaultProductionLeadTimeDays ?? null,
        canBeProduced:
          input.canBeProduced === undefined
            ? product.canBeProduced
            : input.canBeProduced,
        batchTracking:
          input.batchTracking === undefined
            ? product.batchTracking
            : input.batchTracking,
        expiryTracking:
          input.expiryTracking === undefined
            ? product.expiryTracking
            : input.expiryTracking,
        barcodeValue:
          input.barcodeValue === undefined
            ? product.barcodeValue
            : cleanString(input.barcodeValue),
        nafdacNumber:
          input.nafdacNumber === undefined
            ? product.nafdacNumber
            : cleanString(input.nafdacNumber),
        shelfLifeDays:
          input.shelfLifeDays === undefined
            ? product.shelfLifeDays
            : input.shelfLifeDays ?? null,
        status,
      },
    });

    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'PRODUCT' as any,
        entityId: productId,
        action: 'UPDATED' as any,
        metadata: { delta: input.stockDelta ?? undefined, status },
      })
      .catch(() => {});

    return this.getForUser(userId, productId);
  },

  async archive(userId: string, productId: string, actorId?: string | null) {
    const product = await this.getForUser(userId, productId);
    await prisma.product.update({
      where: { id: productId },
      data: { archived: true, status: 'DISCONTINUED' },
    });
    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'PRODUCT' as any,
        entityId: productId,
        action: 'ARCHIVED' as any,
        metadata: { name: product.name },
      })
      .catch(() => {});
    return { ok: true };
  },
};
