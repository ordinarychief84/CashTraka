/**
 * CSV helper tests — RFC 4180 conformance + CSV-injection defence.
 *
 * The injection cases are the security-critical bit. If any of those
 * regress, an exported file could let an attacker execute formulas
 * when a customer opens the CSV in Excel / Google Sheets.
 */

import { describe, it, expect } from 'vitest';
import { csvEscape, toCsv, toCsvFromRecords } from './csv';

describe('csvEscape — basic types', () => {
  it('returns empty string for null and undefined', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('stringifies non-negative numbers without quoting', () => {
    expect(csvEscape(42)).toBe('42');
    expect(csvEscape(0)).toBe('0');
    expect(csvEscape(3.14)).toBe('3.14');
  });

  it('prefixes negative numbers with the injection guard', () => {
    // A bare leading "-" is a formula trigger in some Excel locales
    // (e.g. "-2+3" gets evaluated). The injection guard intentionally
    // also fires for legitimate negative numbers — Naira columns
    // are exported in absolute kobo so this is essentially a no-op
    // for CashTraka's actual datasets, but we test the rule explicitly
    // so a future "stop escaping negatives" mistake fails loud.
    expect(csvEscape(-1.5)).toBe(`'-1.5`);
  });

  it('stringifies booleans without quoting', () => {
    expect(csvEscape(true)).toBe('true');
    expect(csvEscape(false)).toBe('false');
  });

  it('passes plain text through unchanged', () => {
    expect(csvEscape('hello')).toBe('hello');
    expect(csvEscape('Lagos')).toBe('Lagos');
  });
});

describe('csvEscape — RFC 4180 quoting', () => {
  it('wraps values containing a comma in double-quotes', () => {
    expect(csvEscape('1, Marina Road')).toBe('"1, Marina Road"');
  });

  it('wraps values containing a quote in double-quotes and doubles the internal quote', () => {
    expect(csvEscape('she said "hi"')).toBe('"she said ""hi"""');
  });

  it('wraps values containing a newline', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
    expect(csvEscape('line1\r\nline2')).toBe('"line1\r\nline2"');
  });
});

describe('csvEscape — CSV-injection defence', () => {
  // Each of these characters at the start of a cell would be
  // evaluated as the start of a formula by Excel and Google Sheets.
  // The escape MUST prefix the value with a single quote so the
  // spreadsheet renders the literal text instead of executing it.
  it('prefixes leading = with a single quote', () => {
    expect(csvEscape('=SUM(A1:A99)')).toBe(`'=SUM(A1:A99)`);
  });

  it('prefixes leading + with a single quote', () => {
    expect(csvEscape('+1234567890')).toBe(`'+1234567890`);
  });

  it('prefixes leading - with a single quote', () => {
    // Negative numbers as strings (e.g. CSV columns) should also be
    // escaped — the spreadsheet would treat them as formulas because
    // the cell starts with a non-numeric context in some locales.
    expect(csvEscape('-2+3')).toBe(`'-2+3`);
  });

  it('prefixes leading @ with a single quote', () => {
    expect(csvEscape('@SUM(A1)')).toBe(`'@SUM(A1)`);
  });

  it('combines injection guard with RFC quoting when needed', () => {
    expect(csvEscape('=1,2')).toBe(`"'=1,2"`);
  });

  it('leaves regular numeric strings alone (no leading injection char)', () => {
    expect(csvEscape('123')).toBe('123');
    expect(csvEscape('1.5')).toBe('1.5');
  });
});

describe('toCsv (legacy positional API)', () => {
  it('joins rows with CRLF and trailing newline', () => {
    const out = toCsv([['a', 'b'], ['c', 'd']]);
    expect(out).toBe('a,b\r\nc,d\r\n');
  });

  it('handles null and undefined cells', () => {
    const out = toCsv([['a', null, undefined]]);
    expect(out).toBe('a,,\r\n');
  });

  it('escapes injection cells in the positional API too', () => {
    const out = toCsv([['safe', '=BAD()']]);
    expect(out).toBe(`safe,'=BAD()\r\n`);
  });
});

describe('toCsvFromRecords (object-record API)', () => {
  const rows = [
    { id: '1', name: 'Acme', revenue: 1000 },
    { id: '2', name: 'Globex', revenue: 2500 },
  ];

  it('emits header row followed by data rows', () => {
    const out = toCsvFromRecords(rows, ['id', 'name', 'revenue']);
    expect(out).toBe('id,name,revenue\n1,Acme,1000\n2,Globex,2500\n');
  });

  it('respects the columns argument order', () => {
    const out = toCsvFromRecords(rows, ['revenue', 'name']);
    expect(out).toBe('revenue,name\n1000,Acme\n2500,Globex\n');
  });

  it('emits only the header when there are no rows', () => {
    const out = toCsvFromRecords([], ['a', 'b']);
    expect(out).toBe('a,b\n');
  });

  it('escapes injection values in cells', () => {
    const out = toCsvFromRecords(
      [{ name: '=cmd|"/c calc"!A1' }],
      ['name'],
    );
    expect(out).toBe(`name\n"'=cmd|""/c calc""!A1"\n`);
  });

  it('handles missing properties as empty strings', () => {
    const out = toCsvFromRecords(
      [{ name: 'Acme' }],
      ['name', 'phone'],
    );
    expect(out).toBe('name,phone\nAcme,\n');
  });
});
