import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { settingsSchema } from '@/lib/validators';
import { isValidSlug, normalizeSlug } from '@/lib/slug';
import { userRepo } from '@/lib/repositories/user.repository';

/**
 * User-profile / settings operations. Auth (password, session) lives in
 * `auth.service.ts` instead.
 */

export const userService = {
  byId: (id: string) => userRepo.byId(id),

  async getProfile(userId: string) {
    const user = await userRepo.byId(userId);
    if (!user) throw Err.notFound('User not found');
    // Don't leak the hash.
    const { passwordHash, ...rest } = user;
    return rest;
  },

  /** Update the user's business profile (settings page). Returns fresh profile. */
  async updateSettings(userId: string, input: unknown) {
    const parsed = settingsSchema.parse(input);
    const {
      businessName,
      whatsappNumber,
      shopSlug,
      receiptFooter,
      bankName,
      bankAccountNumber,
      bankAccountName,
      businessType,
    } = parsed;

    let nextSlug: string | null | undefined;
    if (shopSlug !== undefined) {
      if (shopSlug && shopSlug.length > 0) {
        const normalized = normalizeSlug(shopSlug);
        if (!isValidSlug(normalized)) {
          throw Err.validation('Shop link can only contain letters, numbers and dashes');
        }
        const existing = await prisma.user.findUnique({ where: { shopSlug: normalized } });
        if (existing && existing.id !== userId) {
          throw Err.conflict('That shop link is already taken');
        }
        nextSlug = normalized;
      } else {
        nextSlug = null;
      }
    }

    const current = await userRepo.byId(userId);
    if (!current) throw Err.notFound('User not found');

    const updated = await userRepo.update(userId, {
      businessName: businessName === undefined ? current.businessName : (businessName || null),
      whatsappNumber: whatsappNumber === undefined ? current.whatsappNumber : (whatsappNumber || null),
      ...(nextSlug !== undefined ? { shopSlug: nextSlug } : {}),
      receiptFooter: receiptFooter === undefined ? current.receiptFooter : (receiptFooter || null),
      bankName: bankName === undefined ? current.bankName : (bankName || null),
      bankAccountNumber: bankAccountNumber === undefined ? current.bankAccountNumber : (bankAccountNumber || null),
      bankAccountName: bankAccountName === undefined ? current.bankAccountName : (bankAccountName || null),
      businessType: businessType ?? current.businessType,
    });
    const { passwordHash, ...rest } = updated;
    return rest;
  },

  /** Replace just the logoUrl (used by the Cloudinary upload endpoint). */
  setLogoUrl: (userId: string, logoUrl: string | null) =>
    userRepo.update(userId, { logoUrl }),
};
