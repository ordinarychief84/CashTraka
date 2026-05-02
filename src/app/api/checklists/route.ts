import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireFeature } from '@/lib/gate';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional().or(z.literal('')),
  category: z
    .enum(['daily_opening', 'delivery', 'inspection', 'custom'])
    .default('custom'),
  items: z
    .array(z.object({ label: z.string().trim().min(1, 'Item label required') }))
    .min(1, 'At least one item is required'),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.businessType === 'property_manager') {
    return NextResponse.json(
      { error: 'Checklists are not available for property managers' },
      { status: 403 },
    );
  }
  const feature = requireFeature(user, 'checklists');
  if (feature) return feature;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const { name, description, category, items } = parsed.data;

  const checklist = await prisma.$transaction(async (tx) => {
    const cl = await tx.checklist.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description || null,
        category,
      },
    });

    for (let i = 0; i < items.length; i++) {
      await tx.checklistItem.create({
        data: {
          checklistId: cl.id,
          label: items[i].label.trim(),
          sortOrder: i,
        },
      });
    }

    return cl;
  });

  return NextResponse.json({ id: checklist.id });
}
