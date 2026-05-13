import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail } from '@/lib/api-response';

/** GET /api/customers/[id]/notes, list notes for a customer */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const notes = await prisma.customerNote.findMany({
      where: { customerId: ctx.params.id, userId: auth.owner.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return ok(notes);
  });

/** POST /api/customers/[id]/notes, add a note to a customer */
export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const note = (body.note || '').trim();
    if (!note || note.length < 2) {
      return fail('Note is too short', 400);
    }

    // Verify ownership
    const customer = await prisma.customer.findFirst({
      where: { id: ctx.params.id, userId: auth.owner.id },
    });
    if (!customer) {
      return fail('Customer not found', 404);
    }

    const created = await prisma.customerNote.create({
      data: {
        customerId: ctx.params.id,
        userId: auth.owner.id,
        note,
      },
    });
    return ok(created);
  });
