/**
 * Service Check was retired. The create endpoint (used by SendServiceCheckButton
 * to mint a feedback request token + WhatsApp link) returns HTTP 410 Gone.
 */

const body = JSON.stringify({
  error: 'gone',
  message: 'The Service Check feature has been retired.',
});

const headers = { 'Content-Type': 'application/json' } as const;

export function POST() {
  return new Response(body, { status: 410, headers });
}
