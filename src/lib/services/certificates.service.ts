import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { documentAudit } from '@/lib/services/document-audit.service';

/**
 * Vault for regulatory + trust documents a business holds (NAFDAC, CAC,
 * TIN, FDA, SON, halal, organic, etc.). Uploadcare hosts the file; we
 * keep the metadata, link it to a Product where it applies per-product,
 * and surface 30/60/90-day expiry reminders via the existing
 * `Notification` model.
 *
 * Soft-delete only: NAFDAC compliance + customer trust both want a
 * record that "this product was once certified".
 */

export type CertificateKind =
  | 'NAFDAC'
  | 'CAC'
  | 'TIN'
  | 'FDA'
  | 'SON'
  | 'HALAL'
  | 'ORGANIC'
  | 'OTHER';

export type CertificateCreateInput = {
  kind: CertificateKind | string;
  productId?: string | null;
  label: string;
  certificateNumber?: string | null;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  fileUrl: string;
  mimeType?: string | null;
  notes?: string | null;
};

function publicToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export const certificatesService = {
  async listForUser(userId: string) {
    return prisma.certificate.findMany({
      where: { userId, deletedAt: null },
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async getForUser(userId: string, id: string) {
    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!cert || cert.userId !== userId || cert.deletedAt) {
      throw Err.notFound('Certificate not found');
    }
    return cert;
  },

  async create(userId: string, input: CertificateCreateInput, actorId?: string | null) {
    if (!input.fileUrl) throw Err.validation('A file is required.');
    if (input.productId) {
      const product = await prisma.product.findFirst({
        where: { id: input.productId, userId, archived: false },
        select: { id: true },
      });
      if (!product) throw Err.validation('Product not found for this user.');
    }
    const cert = await prisma.certificate.create({
      data: {
        userId,
        kind: input.kind || 'OTHER',
        productId: input.productId ?? null,
        label: input.label.trim().slice(0, 200),
        certificateNumber: input.certificateNumber?.trim() || null,
        issuedAt: input.issuedAt ?? null,
        expiresAt: input.expiresAt ?? null,
        fileUrl: input.fileUrl,
        mimeType: input.mimeType ?? null,
        notes: input.notes?.trim() || null,
        publicToken: publicToken(),
      },
    });
    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'CERTIFICATE' as any,
        entityId: cert.id,
        action: 'CREATED' as any,
        metadata: { kind: cert.kind, expiresAt: cert.expiresAt },
      })
      .catch(() => {});
    return cert;
  },

  async update(
    userId: string,
    id: string,
    patch: Partial<CertificateCreateInput>,
    actorId?: string | null,
  ) {
    await this.getForUser(userId, id); // tenancy guard + existence
    const updated = await prisma.certificate.update({
      where: { id },
      data: {
        ...(patch.kind ? { kind: patch.kind } : {}),
        ...(patch.label != null ? { label: patch.label.trim().slice(0, 200) } : {}),
        ...(patch.certificateNumber !== undefined
          ? { certificateNumber: patch.certificateNumber?.trim() || null }
          : {}),
        ...(patch.issuedAt !== undefined ? { issuedAt: patch.issuedAt } : {}),
        ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        ...(patch.fileUrl ? { fileUrl: patch.fileUrl, mimeType: patch.mimeType ?? null } : {}),
        ...(patch.productId !== undefined ? { productId: patch.productId } : {}),
      },
    });
    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'CERTIFICATE' as any,
        entityId: id,
        action: 'UPDATED' as any,
      })
      .catch(() => {});
    return updated;
  },

  async softDelete(userId: string, id: string, actorId?: string | null) {
    await this.getForUser(userId, id);
    await prisma.certificate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'CERTIFICATE' as any,
        entityId: id,
        action: 'CANCELLED' as any,
      })
      .catch(() => {});
  },

  /**
   * Public lookup by token. Used by /c/[token] to serve a read-only
   * verification page distributors and customers can hit.
   */
  async findPublicByToken(token: string) {
    return prisma.certificate.findFirst({
      where: { publicToken: token, deletedAt: null },
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { businessName: true, name: true } },
      },
    });
  },

  /**
   * Used by the daily expiring-cert cron. Returns certs that expire
   * within `daysAhead` days from `from`, OR have already expired since
   * `from - daysBack` days (so we keep nagging for a window after).
   */
  async expiring(userId: string, daysAhead = 60, daysBack = 0) {
    const from = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    return prisma.certificate.findMany({
      where: {
        userId,
        deletedAt: null,
        expiresAt: { gte: from, lte: to },
      },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { expiresAt: 'asc' },
    });
  },
};
