import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrStaff } from '@/lib/auth';
import { adminCan } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';

export const dynamic = 'force-dynamic';

const VALID_ENTITIES = new Set([
  'INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'DELIVERY_NOTE',
  'OFFER', 'ORDER_CONFIRMATION', 'RECURRING_RULE',
]);

/** GET /api/admin/document-audit, cross-tenant DocumentAuditLog viewer. */
export async function GET(req: Request) {
  try {
    const admin = await requireAdminOrStaff();
    if (!adminCan(admin.adminRole as AdminRole, 'docAudit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const entityType = url.searchParams.get('entityType');
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const since = url.searchParams.get('since');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    const where: Record<string, unknown> = {};
    if (entityType && entityType !== 'all' && VALID_ENTITIES.has(entityType)) {
      where.entityType = entityType;
    }
    if (action) {
      where.action = action;
    }
    if (userId) {
      where.userId = userId;
    }
    if (since) {
      const dt = new Date(since);
      if (!Number.isNaN(dt.getTime())) {
        where.createdAt = { gte: dt };
      }
    }

    const [rows, total] = await Promise.all([
      prisma.documentAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.documentAuditLog.count({ where }),
    ]);

    const data = rows.map((r) => ({
      ...r,
      metadata: r.metadata ? safeParse(r.metadata) : null,
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: { limit, offset, total },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/admin/document-audit error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
