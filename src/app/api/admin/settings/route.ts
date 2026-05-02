import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** GET /api/admin/settings, Return all SystemSetting rows as key-value pairs */
export async function GET() {
  try {
    await requireAdmin();

    const settings = await prisma.systemSetting.findMany();
    const keyValuePairs = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return NextResponse.json({ success: true, data: keyValuePairs }, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in GET /api/admin/settings:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}

/** PATCH /api/admin/settings, Update settings with upsert into SystemSetting table */
export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const { key, value } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'key is required and must be a string' },
        { status: 400 },
      );
    }

    if (value === undefined || typeof value !== 'string') {
      return NextResponse.json(
        { success: false, error: 'value is required and must be a string' },
        { status: 400 },
      );
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'settings.update',
        targetId: setting.id,
        details: JSON.stringify({ key, value }),
      },
    });

    return NextResponse.json({ success: true, data: setting }, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in PATCH /api/admin/settings:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
