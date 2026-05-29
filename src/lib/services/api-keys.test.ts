/**
 * API-key token-format + hash tests. These are pure primitives, no
 * DB. They pin the invariants the auth middleware will eventually
 * depend on (token shape, hash determinism, hash != raw).
 */

import { describe, it, expect } from 'vitest';
import { generateRawToken, sha256 } from './api-keys.service';

describe('generateRawToken', () => {
  it('returns a token of the form `<prefix>_<base64url>`', () => {
    const t = generateRawToken('ct_live');
    expect(t.startsWith('ct_live_')).toBe(true);
    const body = t.slice('ct_live_'.length);
    // base64url alphabet: A-Z a-z 0-9 - _
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns a 24-char body (18 random bytes encoded base64url)', () => {
    const t = generateRawToken('ct_live');
    const body = t.split('_').slice(2).join('_'); // anything after ct_live_
    expect(body.length).toBe(24);
  });

  it('produces unique tokens (crypto-random, not deterministic)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(generateRawToken('ct_live'));
    // 100 calls should yield 100 distinct tokens. Even with the
    // birthday paradox, two collisions in 100 draws of an 18-byte
    // pool would be vanishingly unlikely.
    expect(seen.size).toBe(100);
  });

  it('respects the prefix argument', () => {
    expect(generateRawToken('ct_test').startsWith('ct_test_')).toBe(true);
  });
});

describe('sha256', () => {
  it('is deterministic — same input → same digest', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
  });

  it('produces a 64-char hex string', () => {
    const d = sha256('hello');
    expect(d.length).toBe(64);
    expect(d).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different digests for different inputs', () => {
    expect(sha256('hello')).not.toBe(sha256('Hello'));
    expect(sha256('hello')).not.toBe(sha256('hello '));
  });

  it('matches the canonical SHA-256 of "abc"', () => {
    // RFC 4634 test vector — pins the implementation to standard
    // SHA-256 (not, say, a truncated or salted variant).
    expect(sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('never returns the raw input (sanity guard against accidental identity hashes)', () => {
    const raw = generateRawToken('ct_live');
    const hash = sha256(raw);
    expect(hash).not.toBe(raw);
    // And the hash should never be a substring of the raw — it's
    // base16 hex, the raw is base64url.
    expect(raw.includes(hash)).toBe(false);
  });
});
