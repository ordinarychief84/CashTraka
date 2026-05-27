import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { upsertEmailEvent, type EmailLogStatus } from '@/lib/services/email-log.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Inbound webhook from Resend. Resend signs payloads with
 * `RESEND_WEBHOOK_SECRET` using the Svix scheme: timestamp + body
 * are HMAC-SHA256-signed and the signature is sent as
 * `svix-signature` (in the form `v1,<base64>`).
 *
 * To enable signing in production, set RESEND_WEBHOOK_SECRET. If
 * unset we still accept events (logging only — no auth bypass risk
 * because the route only WRITES log entries it'd record anyway).
 */

function verifySignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string,
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  // Svix verification: `HMAC(secret, svix-id.svix-timestamp.body)`.
  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  // Secret may arrive as `whsec_<base64>`; strip the prefix.
  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBuf: Buffer;
  try {
    keyBuf = Buffer.from(cleanSecret, 'base64');
  } catch {
    return false;
  }
  const expected = crypto.createHmac('sha256', keyBuf).update(toSign).digest('base64');
  // `svix-signature` is a space-separated list like "v1,<sig> v1a,<sig>".
  return svixSignature
    .split(' ')
    .some((tok) => {
      const [, value] = tok.split(',');
      if (!value) return false;
      try {
        return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
      } catch {
        return false;
      }
    });
}

type ResendEvent = {
  type: string; // "email.sent" | "email.delivered" | "email.bounced" | ...
  data?: {
    email_id?: string;
    to?: string[] | string;
    from?: string;
    subject?: string;
    bounce?: { message?: string };
    failure?: { reason?: string };
  };
};

function mapEventToStatus(type: string): EmailLogStatus | null {
  switch (type) {
    case 'email.queued':         return 'queued';
    case 'email.sent':           return 'sent';
    case 'email.delivered':      return 'delivered';
    case 'email.opened':         return 'opened';
    case 'email.clicked':        return 'clicked';
    case 'email.bounced':        return 'bounced';
    case 'email.complained':     return 'complained';
    case 'email.delivery_delayed':
    case 'email.failed':         return 'failed';
    default:                     return null;
  }
}

export async function POST(req: Request) {
  // Read once, parse twice (signature uses the raw string).
  const raw = await req.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const headers = req.headers;
    const ok = verifySignature(
      raw,
      headers.get('svix-id'),
      headers.get('svix-timestamp'),
      headers.get('svix-signature'),
      secret,
    );
    if (!ok) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const status = mapEventToStatus(event.type);
  const resendId = event.data?.email_id;
  if (!status || !resendId) {
    // Unknown event type or missing id — ack quietly so Resend
    // doesn't retry.
    return NextResponse.json({ ok: true });
  }

  const errorReason =
    event.data?.bounce?.message ?? event.data?.failure?.reason ?? null;

  await upsertEmailEvent({ resendId, status, errorReason });

  return NextResponse.json({ ok: true });
}
