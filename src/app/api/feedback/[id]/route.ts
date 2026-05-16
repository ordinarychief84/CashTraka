/**
 * Service Check was retired. Per-feedback owner actions (resolve, delete, etc.)
 * return HTTP 410 Gone. Existing rows in the DB are preserved but immutable
 * via the API.
 */

const body = JSON.stringify({
  error: 'gone',
  message: 'The Service Check feature has been retired.',
});

const headers = { 'Content-Type': 'application/json' } as const;

export function GET() {
  return new Response(body, { status: 410, headers });
}

export function PATCH() {
  return new Response(body, { status: 410, headers });
}

export function DELETE() {
  return new Response(body, { status: 410, headers });
}
