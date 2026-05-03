import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { handled } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';

export const runtime = 'nodejs';

/**
 * GET /api/audit-export?from=YYYY-MM-DD&to=YYYY-MM-DD&entityType=&format=csv
 *
 * Owner-scoped export of the per-document audit trail. Pulls from
 * `DocumentAuditLog`, which holds both the existing document state-change
 * rows and the new `READ_*` rows written by access-audit.service.
 *
 * Resolves the actor id back to a name + role on the fly:
 *   - if the actor matches the owner's User id → owner row
 *   - otherwise look it up in StaffMember
 *   - otherwise emit "(unknown)"
 *
 * Tax+ tier only (gated on `multiUserAudit`).
 */

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseDate(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

export async function GET(req: Request) {
  return handled(async () => {
    const user = await requireUser();

    const feature = await requireFeature(user, 'multiUserAudit');
    if (feature) return feature;

    const url = new URL(req.url);
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const from = parseDate(url.searchParams.get('from'), oneYearAgo);
    const to = parseDate(url.searchParams.get('to'), now);
    const entityType = url.searchParams.get('entityType')?.trim() || undefined;
    const format = (url.searchParams.get('format') || 'csv').toLowerCase();
    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Only csv format is supported.' },
        { status: 400 },
      );
    }

    // Pull a generous window. The `DocumentAuditLog_action_idx` and
    // `DocumentAuditLog_entity_idx` indexes both lead with `userId`, so
    // this is a cheap range scan.
    const rows = await prisma.documentAuditLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: from, lte: to },
        ...(entityType ? { entityType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });

    // Resolve actor ids to names + roles in a single batch.
    const actorIds = Array.from(
      new Set(rows.map((r) => r.actorId).filter((v): v is string => Boolean(v))),
    );
    const staffActors = actorIds.length
      ? await prisma.staffMember.findMany({
          where: { id: { in: actorIds }, userId: user.id },
          select: { id: true, name: true, accessRole: true },
        })
      : [];
    const staffById = new Map(staffActors.map((s) => [s.id, s]));

    const header = [
      'timestamp',
      'actor',
      'role',
      'entity_type',
      'entity_id',
      'action',
      'metadata',
    ];
    const lines = [header.join(',')];

    for (const r of rows) {
      let actor = '(system)';
      let role = '';
      if (r.actorId) {
        if (r.actorId === user.id) {
          actor = user.name || user.email || '(owner)';
          role = 'OWNER';
        } else {
          const staff = staffById.get(r.actorId);
          if (staff) {
            actor = staff.name;
            role = staff.accessRole;
          } else {
            actor = '(unknown)';
          }
        }
      }
      lines.push(
        [
          escapeCsv(r.createdAt.toISOString()),
          escapeCsv(actor),
          escapeCsv(role),
          escapeCsv(r.entityType),
          escapeCsv(r.entityId),
          escapeCsv(r.action),
          escapeCsv(r.metadata ?? ''),
        ].join(','),
      );
    }

    const csv = lines.join('\n');
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const filename = `audit-trail-${fromStr}-${toStr}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  });
}
