/**
 * Service Check (customer feedback) was retired. This public submission URL —
 * the one existing wa.me links shared with customers point at — returns
 * HTTP 410 Gone with a friendly HTML body, so existing shared links fail
 * loudly rather than silently 404. Existing Feedback table rows in the DB
 * are preserved; only the UI / API surface was removed.
 *
 * The route handler replaces the prior page.tsx so the response carries the
 * correct status code (Next.js page components cannot set non-2xx statuses).
 */

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Feedback link expired · CashTraka</title>
  <style>
    body { margin:0; background:#F7F9F8; font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color:#1A1A1A; }
    main { max-width: 28rem; margin: 4rem auto; padding: 0 1rem; }
    .card { background:#FFFFFF; border:1px solid #E5E7EB; border-radius:16px; padding:2rem; text-align:center; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
    h1 { margin:0 0 12px; font-size:1.25rem; font-weight:700; color:#0F172A; }
    p { margin:0; font-size:0.95rem; line-height:1.55; color:#475569; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>This feedback link has been retired.</h1>
      <p>The Service Check feature is no longer available. If you need to reach the business, please contact them directly.</p>
    </div>
  </main>
</body>
</html>`;

const headers = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
} as const;

export function GET() {
  return new Response(HTML, { status: 410, headers });
}

export function POST() {
  return new Response(HTML, { status: 410, headers });
}
