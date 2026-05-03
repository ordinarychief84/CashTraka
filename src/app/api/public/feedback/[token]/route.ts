import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { feedbackPublicService } from '@/lib/services/feedback-public.service';
import { feedbackPublicSubmitSchema } from '@/lib/feedback-validators';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/public/feedback/[token]
 *
 * Public, no-auth read of a feedback request by its non-guessable token.
 * Returns ONLY safe fields. Mirrors /api/public/invoice/[token] in shape.
 */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  // Rate limit per-IP per-token to mitigate scrapers.
  const ip = clientIp(req);
  const rl = rateLimit(`public-feedback:${token}`, ip, { max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const view = await feedbackPublicService.getPublicFeedback(token);
  if (!view) {
    return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: view });
}

/**
 * POST /api/public/feedback/[token]
 *
 * Submits the customer's rating. Rate limited 30/min per IP per token to
 * make brute submissions impractical.
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`public-feedback-submit:${token}`, ip, {
    max: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  let parsed;
  try {
    parsed = feedbackPublicSubmitSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message ?? 'Invalid input';
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const result = await feedbackPublicService.submitPublicFeedback(token, {
    rating: parsed.rating,
    reason: parsed.reason,
    comment: parsed.comment || undefined,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.code });
  }
  return NextResponse.json({ success: true, data: { ok: true } });
}
