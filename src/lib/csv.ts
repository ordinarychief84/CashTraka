// Minimal CSV serializer. RFC 4180-ish: quote if value contains comma, quote, or newline.
//
// Two APIs exist:
//   * `toCsv(rows[][])`  — original positional row-arrays API used by
//                          the legacy /api/export/[kind] routes.
//   * `csvEscape(v)` + `toCsvFromRecords(records, columns)` —
//                          object-record API used by the newer
//                          /api/settings/data-export/[type] route.
//
// Both share the same security-hardened escape (`csvCell` /
// `csvEscape`) which protects against CSV-injection by prefixing
// formula-leading characters with a single quote. See csv.test.ts
// for the full rule table.
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // CSV-injection mitigation: leading =, +, -, @ are evaluated as
  // formulas by Excel and Google Sheets when the cell opens. Prefix
  // with a single quote so the spreadsheet renders the literal text.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * Escape a single value for safe inclusion in a CSV cell. Same rules
 * as `csvCell` above — exported so callers building CSV manually can
 * apply the security hardening uniformly.
 */
export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'string' ? v : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build a CSV document from a row set + explicit column order.
 * Header row is emitted first; trailing newline only when there's
 * at least one body row.
 */
export function toCsvFromRecords(
  rows: Record<string, unknown>[],
  columns: string[],
): string {
  const header = columns.map(csvEscape).join(',');
  const body = rows
    .map((r) => columns.map((c) => csvEscape(r[c])).join(','))
    .join('\n');
  return header + '\n' + body + (body ? '\n' : '');
}

export function csvResponse(body: string, filename: string): Response {
  // BOM so Excel reads UTF-8 Naira sign correctly.
  return new Response('\uFEFF' + body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
