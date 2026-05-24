import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { customerService } from '@/lib/services/customer.service';
import { prisma } from '@/lib/prisma';
import { handled, ok } from '@/lib/api-response';

/** GET /api/customers, paginated list / search. */
export const GET = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await customerService.forUser(user.id, { q, take, skip });
    return ok(result);
  });

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: z.string().trim().max(30).optional().default(''),
  active: z.boolean().optional().default(true),
  address: z.string().trim().max(400).optional(),
  email: z.string().trim().email('Invalid email').max(200).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  webPage: z.string().trim().max(300).optional(),
  taxId: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

/** POST /api/customers — create a customer directly from the intake form. */
export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }
    const d = parsed.data;
    // phone is required by the @@unique constraint — use empty string when not supplied
    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        name: d.name,
        phone: d.phone || '',
        address: d.address || null,
        email: d.email || null,
        city: d.city || null,
        state: d.state || null,
        country: d.country || null,
        postalCode: d.postalCode || null,
        webPage: d.webPage || null,
        taxId: d.taxId || null,
        notes: d.notes || null,
      },
    });
    return ok({ id: customer.id });
  });
