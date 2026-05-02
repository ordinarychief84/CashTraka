/**
 * Lightweight per-document audit writer. Every state change on an
 * invoice / receipt / credit note / delivery note / offer / order
 * confirmation calls into this from its service layer so we have a
 * verifiable trail without any one route having to remember.
 *
 * This is distinct from the existing admin-only `AuditLog` model which
 * tracks platform-admin actions. This one tracks seller actions on
 * their own documents.
 */

import { prisma } from '@/lib/prisma';

export type DocumentEntity =
  | 'INVOICE'
  | 'RECEIPT'
  | 'CREDIT_NOTE'
  | 'DELIVERY_NOTE'
  | 'OFFER'
  | 'ORDER_CONFIRMATION'
  | 'RECURRING_RULE';

export type DocumentAction =
  | 'CREATED'
  | 'UPDATED'
  | 'SENT'
  | 'VIEWED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'CANCELLED'
  | 'CREDITED'
  | 'REMINDER_SENT'
  | 'REMINDER_FAILED'
  | 'XML_GENERATED'
  | 'FIRS_SUBMITTED'
  | 'FIRS_ACCEPTED'
  | 'FIRS_REJECTED'
  | 'CONVERTED'
  | 'RECURRING_GENERATED'
  | 'PUBLIC_PAYMENT_INIT';

export const documentAudit = {
  /**
   * Best-effort write. Failures here must never break the originating
   * action. We swallow errors and only log to console in dev.
   */
  async log(args: {
    userId: string;
    actorId?: string | null;
    entityType: DocumentEntity;
    entityId: string;
    action: DocumentAction;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await prisma.documentAuditLog.create({
        data: {
          userId: args.userId,
          actorId: args.actorId ?? null,
          entityType: args.entityType,
          entityId: args.entityId,
          action: args.action,
          metadata: args.metadata ? JSON.stringify(args.metadata) : null,
        },
      });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[document-audit] write failed', e);
      }
    }
  },

  /** Mirror an entry into the DocumentArchive index when a document gets a PDF. */
  async archive(args: {
    userId: string;
    documentType: DocumentEntity;
    documentId: string;
    documentNumber?: string | null;
    pdfUrl?: string | null;
    xmlUrl?: string | null;
    retentionUntil?: Date | null;
  }): Promise<void> {
    try {
      await prisma.documentArchive.upsert({
        where: {
          documentType_documentId: {
            documentType: args.documentType,
            documentId: args.documentId,
          },
        },
        update: {
          documentNumber: args.documentNumber ?? undefined,
          pdfUrl: args.pdfUrl ?? undefined,
          xmlUrl: args.xmlUrl ?? undefined,
          retentionUntil: args.retentionUntil ?? undefined,
        },
        create: {
          userId: args.userId,
          documentType: args.documentType,
          documentId: args.documentId,
          documentNumber: args.documentNumber ?? null,
          pdfUrl: args.pdfUrl ?? null,
          xmlUrl: args.xmlUrl ?? null,
          retentionUntil: args.retentionUntil ?? null,
        },
      });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[document-archive] write failed', e);
      }
    }
  },
};
