import { describe, it, expect } from 'vitest';
import { generatePkcePair } from '../oauth.js';
import { createHash } from 'node:crypto';

describe('generatePkcePair', () => {
  it('returns a verifier between 43 and 128 chars (RFC 7636)', () => {
    const { verifier } = generatePkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it('returns a challenge that is SHA-256(verifier) base64url-encoded', () => {
    const { verifier, challenge } = generatePkcePair();
    const expected = createHash('sha256').update(verifier).digest('base64url');
    expect(challenge).toBe(expected);
  });

  it('returns different verifier+challenge pairs each call', () => {
    const a = generatePkcePair();
    const b = generatePkcePair();
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.challenge).not.toBe(b.challenge);
  });

  it('returns base64url-encoded values (no +, /, =)', () => {
    const { verifier, challenge } = generatePkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
