import { ok, handled } from '@/lib/api-response';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';

/** GET /api/promises/public/[token] — get public promise data */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  return handled(async () => {
    const promise = await promiseToPayService.getByToken(params.token);
    // Strip sensitive fields
    return ok({
      id: promise.id,
      customerName: promise.customerNameSnapshot,
      originalAmount: promise.originalAmount,
      remainingAmount: promise.remainingAmount,
      status: promise.status,
      note: promise.note,
      publicToken: promise.publicToken,
      commitments: promise.commitments,
      payments: promise.payments.map((p: any) => ({
        amount: p.amount,
        status: p.status,
        paidAt: p.paidAt,
      })),
      business: {
        name: promise.user.businessName || promise.user.name,
        bankName: promise.user.bankName,
        bankAccountNumber: promise.user.bankAccountNumber,
        bankAccountName: promise.user.bankAccountName,
        logoUrl: promise.user.logoUrl,
      },
      createdAt: promise.createdAt,
    });
  });
}
