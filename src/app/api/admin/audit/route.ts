import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** GET /api/admin/audit — List audit logs with pagination */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const adminId = url.searchParams.get('adminId');
    const action = url.searchParams.get('action');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('perPage') || '50', 10);

    const skip = (page - 1) * perPage;

    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const total = await prisma.auditLog.count({ where });

    return NextResponse.json(
      {
        success: true,
        data: logs,
        pagination: {
          page,
          perPage,
          total,
          pages: Math.ceil(total / perPage),
        },
      },
      { status: 200 },
    );
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in GET /api/admin/audit:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
