import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

/**
 * Per-tenant custom fields shown under General settings > Fields.
 * Each row is scoped to one entity type and one field type. The list
 * is filtered server-side by `entityType` so the UI's Item/Customer/
 * Supplier sub-tabs can ask for exactly what they need.
 */

export const ENTITY_TYPES = ['ITEM', 'CUSTOMER', 'SUPPLIER'] as const;
export const FIELD_TYPES = ['TEXT', 'TEXT_LONG', 'NUMBER', 'DATE', 'CHECKBOX'] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
export type FieldType = (typeof FIELD_TYPES)[number];

export type CustomFieldCreateInput = {
  entityType: EntityType;
  fieldType: FieldType;
  name: string;
  availableInLayouts?: boolean;
};

export const customFieldsService = {
  async listForUser(userId: string, entityType?: EntityType) {
    return prisma.customField.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(entityType ? { entityType } : {}),
      },
      orderBy: [{ entityType: 'asc' }, { createdAt: 'asc' }],
    });
  },

  async create(userId: string, input: CustomFieldCreateInput) {
    const name = input.name.trim();
    if (!name) throw Err.validation('Name is required.');
    if (name.length > 80) throw Err.validation('Name is too long (max 80 characters).');
    if (!ENTITY_TYPES.includes(input.entityType)) {
      throw Err.validation('Invalid entity type.');
    }
    if (!FIELD_TYPES.includes(input.fieldType)) {
      throw Err.validation('Invalid field type.');
    }
    // Soft duplicate-name guard within the same entity type — two
    // fields named "Reorder threshold" on an Item would be confusing.
    const existing = await prisma.customField.findFirst({
      where: {
        userId,
        deletedAt: null,
        entityType: input.entityType,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw Err.validation(`A field named "${name}" already exists for this entity.`);
    }
    return prisma.customField.create({
      data: {
        userId,
        entityType: input.entityType,
        fieldType: input.fieldType,
        name,
        availableInLayouts: !!input.availableInLayouts,
      },
    });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.customField.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Custom field not found.');
    }
    return prisma.customField.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
