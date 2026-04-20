import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';

const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(50),
  description: z.string().trim().max(200).optional().default(''),
  baseRole: z.enum(['MANAGER', 'CASHIER', 'VIEWER']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

/** GET /api/team/roles — list all custom roles for this user */
export async function GET() {
  try {
    const user = await requireUser();
    const roles = await prisma.customRole.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { staffMembers: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ data: roles });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST /api/team/roles — create a new custom role */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }

    const { name, description, baseRole, color } = parsed.data;

    // Check for duplicate role name
    const existing = await prisma.customRole.findUnique({
      where: { userId_name: { userId: user.id, name } },
    });
    if (existing) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 });
    }

    const role = await prisma.customRole.create({
      data: {
        userId: user.id,
        name,
        description: description || null,
        baseRole,
        color: color || null,
      },
      include: {
        _count: { select: { staffMembers: true } },
      },
    });

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('CREATE_ROLE_ERROR:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
