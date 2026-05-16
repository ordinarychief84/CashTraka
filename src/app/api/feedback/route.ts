/**
 * Service Check was retired. Owner-facing feedback list / CSV endpoint
 * returns HTTP 410 Gone. Existing Feedback rows in the DB are preserved
 * but are no longer accessible via this API.
 */

const body = JSON.stringify({
  error: 'gone',
  message: 'The Service Check feature has been retired.',
});

const headers = { 'Content-Type': 'application/json' } as const;

export function GET() {
  return new Response(body, { status: 410, headers });
}

export function POST() {
  return new Response(body, { status: 410, headers });
}
