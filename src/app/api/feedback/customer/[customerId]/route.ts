/**
 * Service Check was retired. Per-customer feedback history endpoint returns
 * HTTP 410 Gone. Existing rows in the DB are preserved.
 */

const body = JSON.stringify({
  error: 'gone',
  message: 'The Service Check feature has been retired.',
});

const headers = { 'Content-Type': 'application/json' } as const;

export function GET() {
  return new Response(body, { status: 410, headers });
}
