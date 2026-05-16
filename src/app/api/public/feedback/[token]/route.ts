/**
 * Service Check was retired. This public submission endpoint (no auth, called
 * by the customer's browser from a wa.me link) returns HTTP 410 Gone so
 * existing shared links fail loudly rather than silently 404 or 500.
 * Feedback table rows in the DB are preserved.
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

export function PATCH() {
  return new Response(body, { status: 410, headers });
}
