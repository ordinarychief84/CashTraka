import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import {
  customFieldsService,
  ENTITY_TYPES,
  FIELD_TYPES,
  type EntityType,
} from '@/lib/services/custom-fields.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  fieldType: z.enum(FIELD_TYPES),
  name: z.string().trim().min(1).max(80),
  availableInLayouts: z.boolean().optional(),
});

export async function GET(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const url = new URL(req.url);
    const entityType = url.searchParams.get('entityType') as EntityType | null;
    const rows = await customFieldsService.listForUser(
      owner.id,
      entityType && ENTITY_TYPES.includes(entityType) ? entityType : undefined,
    );
    return ok({ customFields: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await customFieldsService.create(owner.id, body);
    return ok({ customField: created }, 201);
  });
}
