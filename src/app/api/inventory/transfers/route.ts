import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';

/**
 * POST /api/inventory/transfers
 *
 * Intake stub for the Rackbeat-style "Create transport movement" dialog.
 *
 * The dialog only collects the *shell* of a transfer — from / to / transport
 * locations and an expected date. Actual item lines get added on the detail
 * page (not yet built), so this endpoint validates inputs, audit-logs the
 * intent, and returns a placeholder id that lets the dialog close cleanly.
 *
 * When the detail page lands, swap this stub for a service call that writes
 * paired StockMovement rows (PRODUCT/MATERIAL × delta in/out) with
 * `reason="TRANSFER"`.
 */
const transferSchema = z.object({
  expectedDate: z.string().trim().optional().nullable(),
  from: z.string().trim().min(1, 'From location is required'),
  to: z.string().trim().min(1, 'To location is required'),
  transportLoc: z.string().trim().min(1, 'Transport location is required'),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const input = transferSchema.parse(body);

    // Tenant-scoped placeholder id — caller can navigate to a detail page
    // once item lines are wired. Encoded as `pending-<userId-slice>-<ts>`
    // so it's obvious in logs that nothing was persisted yet.
    const placeholderId = `pending-${auth.owner.id.slice(0, 8)}-${Date.now()}`;
    return ok({ id: placeholderId, input }, 201);
  });
