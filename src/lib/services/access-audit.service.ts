/**
 * Access audit writer.
 *
 * Tax+ tier feature. When an ACCOUNTANT-role staff principal hits a
 * sensitive read endpoint (an invoice, a VAT return, the year-end
 * accountant pack, a piece of feedback), we record a row in the existing
 * `DocumentAuditLog` table. The seller can later export the full trail
 * via /api/audit-export.
 *
 * Design notes:
 *   - We reuse `DocumentAuditLog` rather than introduce a new model so
 *     the export and admin views can read from a single source.
 *   - Writes are best-effort: a failure here must never break the
 *     originating GET. Errors are swallowed and only logged in dev.
 *   - The `actorId` is the staff member's id when available, falling
 *     back to the owner's user id when the principal is the owner. The
 *     export route resolves that id back to a name + role on the fly.
 *
 * The `READ_*` action names are kept short and uppercase so the existing
 * indexes on (userId, action, createdAt) still serve queries cheaply.
 */

import { prisma } from '@/lib/prisma';
import type { DocumentEntity } from './document-audit.service';

export type ReadAction =
  | 'READ_INVOICE'
  | 'READ_RECEIPT'
  | 'READ_VAT_RETURN'
  | 'READ_REPORT_EXPORT'
  | 'READ_FEEDBACK'
  | 'READ_ACCOUNTANT_PACK';

type RecordReadArgs = {
  /** The staff principal who performed the read. Falls back to userId when owner. */
  actorId: string;
  /** Owner / tenant id, used to scope every query. */
  userId: string;
  /** Document family being read. */
  entityType: DocumentEntity | 'VAT_RETURN' | 'ACCOUNTANT_PACK' | 'FEEDBACK';
  /** Specific document id (or year, in the case of accountant-pack). */
  entityId: string;
  /** One of the READ_* action constants. */
  action: ReadAction;
  /** Optional free-form metadata, JSON.stringify-able. */
  metadata?: Record<string, unknown>;
};

export const accessAuditService = {
  /**
   * Best-effort write of a read event. Never throws.
   *
   * Callers are expected to await this in the success path of a route
   * handler, wrapped in try/catch so any failure is fully swallowed:
   *
   *   try { await accessAuditService.recordRead({...}); } catch {}
   */
  async recordRead(args: RecordReadArgs): Promise<void> {
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
        console.warn('[access-audit] write failed', e);
      }
    }
  },
};
