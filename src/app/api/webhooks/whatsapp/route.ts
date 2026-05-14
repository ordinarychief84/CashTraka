import { NextResponse } from 'next/server';
import {
  handleInboundMessage,
  verifyWhatsappSignature,
} from '@/lib/services/whatsapp-intake.service';
import { isFeatureEnabled } from '@/lib/feature-flags';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * WhatsApp Business API webhook.
 *
 * Meta sends two kinds of traffic here:
 *
 *  GET  — verification challenge sent when you save the webhook URL in
 *         Meta's app dashboard. Meta passes the verify token you
 *         configured there as `hub.verify_token`; if it matches our
 *         env var we echo back `hub.challenge` so they accept the URL.
 *
 *  POST — every inbound customer message (and delivery receipts we
 *         currently ignore). Signed with the app secret in the
 *         `X-Hub-Signature-256` header.
 *
 * The route is gated by the `feature.whatsapp_business_api` flag from
 * the existing flag registry. While the flag is OFF, both verbs return
 * 503 so Meta never enables our number against a half-wired backend.
 *
 * Going live still requires:
 *   - WhatsApp Business app approved in Meta dashboard
 *   - Phone number registered + green-checked
 *   - WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET,
 *     WHATSAPP_PHONE_NUMBER_ID set in Vercel env
 *   - feature.whatsapp_business_api toggled ON in /admin/feature-flags
 *
 * Until then the route is wired but inert.
 */

export async function GET(req: Request) {
  if (!(await isFeatureEnabled('feature.whatsapp_business_api'))) {
    return NextResponse.json({ error: 'Disabled' }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: Request) {
  if (!(await isFeatureEnabled('feature.whatsapp_business_api'))) {
    return NextResponse.json({ error: 'Disabled' }, { status: 503 });
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  // Need the raw body for signature verification — re-parse JSON after.
  const rawBody = await req.text();
  const ok = verifyWhatsappSignature(
    rawBody,
    req.headers.get('x-hub-signature-256'),
    appSecret,
  );
  if (!ok) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
  }

  // Meta's payload shape:
  //   entry[].changes[].value.messages[] — incoming messages
  //   entry[].changes[].value.statuses[] — delivery receipts (ignore)
  type WhatsappMessage = { from: string; type: string; text?: { body: string } };
  const messages: WhatsappMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        messages.push(msg);
      }
    }
  }

  // Meta retries the webhook if we don't 200 within ~30 s, so we ack
  // quickly + process in the background. Sequential per message — the
  // inbound rate from a single business number is low.
  const replies: Array<{ to: string; body: string }> = [];
  for (const msg of messages) {
    if (msg.type !== 'text' || !msg.text?.body) continue;
    try {
      const result = await handleInboundMessage({
        fromPhone: msg.from,
        body: msg.text.body,
      });
      if (result.reply) {
        replies.push({ to: msg.from, body: result.reply });
      }
    } catch (e) {
      // Never let a single bad message stop the rest of the batch.
      // eslint-disable-next-line no-console
      console.warn('[whatsapp-intake] error', e);
    }
  }

  // Fire the replies via the WhatsApp Cloud API. Phone-number-id +
  // bearer token come from env. We don't wait for each reply to land
  // before acking Meta — they only care about the webhook 200.
  if (replies.length > 0) {
    const sendId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const sendToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
    if (sendId && sendToken) {
      void Promise.allSettled(
        replies.map((r) =>
          fetch(`https://graph.facebook.com/v18.0/${sendId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sendToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: r.to,
              type: 'text',
              text: { body: r.body },
            }),
          }).catch(() => null),
        ),
      );
    }
  }

  return NextResponse.json({ ok: true, processed: messages.length });
}
