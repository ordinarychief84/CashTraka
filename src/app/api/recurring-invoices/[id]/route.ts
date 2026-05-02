import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
  endDate: z.string().optional().or(z.literal('')),
  autoSend: z.boolean().optional(),
  nextRunAt: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rule = await prisma.recurringInvoiceRule.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const updated = await prisma.recurringInvoiceRule.update({
    where: { id: rule.id },
    data: {
      status: parsed.data.status ?? rule.status,
      autoSend: parsed.data.autoSend ?? rule.autoSend,
      endDate:
        parsed.data.endDate === undefined
          ? rule.endDate
          : parsed.data.endDate
            ? new Date(parsed.data.endDate)
            : null,
      nextRunAt: parsed.data.nextRunAt
        ? new Date(parsed.data.nextRunAt)
        : rule.nextRunAt,
    },
  });

  await documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'RECURRING_RULE',
    entityId: rule.id,
    action: 'UPDATED',
    metadata: { ...parsed.data },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rule = await prisma.recurringInvoiceRule.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.recurringInvoiceRule.update({
    where: { id: rule.id },
    data: { status: 'CANCELLED' },
  });
  await documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'RECURRING_RULE',
    entityId: rule.id,
    action: 'CANCELLED',
  });
  return NextResponse.json({ success: true });
}
