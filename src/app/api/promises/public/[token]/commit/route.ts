import { ok, handled } from '@/lib/api-response';
import { promiseCommitmentSchema } from '@/lib/validators';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';

/** POST /api/promises/public/[token]/commit, record a debtor commitment */
export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  return handled(async () => {
    const body = await req.json();
    const data = promiseCommitmentSchema.parse(body);
    const commitment = await promiseToPayService.recordCommitment({
      promiseToken: params.token,
      commitmentType: data.commitmentType,
      amount: data.amount,
      promisedDate: data.promisedDate,
      message: data.message,
    });
    return ok(commitment, 201);
  });
}
