import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { addressesService } from '@/lib/services/company-book.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  street: z.string().trim().max(200).nullable().optional(),
  street2: z.string().trim().max(200).nullable().optional(),
  postcode: z.string().trim().max(20).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().max(120).nullable().optional(),
  attention: z.string().trim().max(120).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner } = await requireAuth();
    const rows = await addressesService.listForUser(owner.id);
    return ok({ addresses: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await addressesService.create(owner.id, body);
    return ok({ address: created }, 201);
  });
}
