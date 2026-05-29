/**
 * Password policy tests — security-critical. The policy guards every
 * signup, every staff invite acceptance, and the Settings > Users
 * "Change password" flow.
 *
 * These tests pin both the must-pass rules (the policy doesn't
 * accidentally accept weak passwords) AND the must-reject specifics
 * we care about (CashTraka-relevant words, sequential digits, etc).
 */

import { describe, it, expect } from 'vitest';
import {
  checkPasswordComplexity,
  checkPasswordRules,
  isWeakPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from './password-policy';

describe('checkPasswordRules — individual rules', () => {
  it('detects missing lowercase', () => {
    expect(checkPasswordRules('ABCDEFG1!').lower).toBe(false);
    expect(checkPasswordRules('abcdefg1!').lower).toBe(true);
  });

  it('detects missing uppercase', () => {
    expect(checkPasswordRules('abcdefg1!').upper).toBe(false);
    expect(checkPasswordRules('Abcdefg1!').upper).toBe(true);
  });

  it('detects missing special character', () => {
    expect(checkPasswordRules('Abcdefg1').special).toBe(false);
    expect(checkPasswordRules('Abcdefg1!').special).toBe(true);
  });

  it('enforces the minimum length', () => {
    expect(checkPasswordRules('A'.repeat(PASSWORD_MIN_LENGTH - 1)).min).toBe(false);
    expect(checkPasswordRules('A'.repeat(PASSWORD_MIN_LENGTH)).min).toBe(true);
  });

  it('enforces the maximum length', () => {
    expect(checkPasswordRules('A'.repeat(PASSWORD_MAX_LENGTH)).max).toBe(true);
    expect(checkPasswordRules('A'.repeat(PASSWORD_MAX_LENGTH + 1)).max).toBe(false);
  });
});

describe('checkPasswordComplexity — overall verdict', () => {
  it('returns null for a password that satisfies every rule', () => {
    expect(checkPasswordComplexity('CashTrakaPwd!9')).toBeNull();
  });

  it('returns a human-readable error for short passwords', () => {
    const err = checkPasswordComplexity('Aa1!');
    expect(err).not.toBeNull();
    expect(err).toMatch(/Password must/);
  });

  it('returns an error if no special character is present', () => {
    expect(checkPasswordComplexity('Abcdefg1')).toMatch(/special/i);
  });

  it('returns an error if no uppercase letter is present', () => {
    expect(checkPasswordComplexity('abcdefg1!')).toMatch(/upper/i);
  });

  it('returns an error if no lowercase letter is present', () => {
    expect(checkPasswordComplexity('ABCDEFG1!')).toMatch(/lower/i);
  });
});

describe('isWeakPassword — common-password list', () => {
  it.each([
    'password',
    'Password',          // case-insensitive match
    'PASSWORD',
    'qwerty123',
    'cashtraka',         // CashTraka-relevant
    'naija',
    'lagos',
    'whatsapp',
    'admin',
    'admin123',
  ])('rejects %s as a common password', (pw) => {
    expect(isWeakPassword(pw)).toBe(true);
  });

  it('rejects a single repeated character', () => {
    expect(isWeakPassword('aaaaaaaa')).toBe(true);
    expect(isWeakPassword('11111111')).toBe(true);
  });

  it('rejects sequential digits', () => {
    expect(isWeakPassword('12345678')).toBe(true);
    expect(isWeakPassword('87654321')).toBe(true);
  });

  it('rejects sequential letters', () => {
    expect(isWeakPassword('abcdefgh')).toBe(true);
  });

  it('accepts a sufficiently strong password', () => {
    expect(isWeakPassword('Tigr4w!nRiver')).toBe(false);
    expect(isWeakPassword('Cap3tow#Sundown')).toBe(false);
  });
});
