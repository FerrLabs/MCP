import { describe, it, expect } from 'vitest';
import { trimTrailing } from '../trim.js';

describe('trimTrailing', () => {
  it.each([
    ['https://auth.example.com///', '/', 'https://auth.example.com'],
    ['https://auth.example.com', '/', 'https://auth.example.com'],
    ['a/b/', '/', 'a/b'],
    ['code\n\n\n', '\n', 'code'],
    ['/////', '/', ''],
    ['', '/', ''],
  ])('trims %j of %j', (value, char, expected) => {
    expect(trimTrailing(value, char)).toBe(expected);
  });

  it('is linear on a long run of the trimmed character', () => {
    const start = performance.now();
    expect(trimTrailing(`${'/'.repeat(200_000)}x${'/'.repeat(200_000)}`, '/').length).toBe(200_001);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
