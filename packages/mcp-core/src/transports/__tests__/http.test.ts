import { describe, it, expect } from 'vitest';
import {
  unauthorizedChallenge,
  resolveAllowedOrigin,
  isHostAllowed,
  defaultBindHost,
  parseList,
} from '../http.js';

describe('unauthorizedChallenge', () => {
  const metadataUrl = 'https://mcp.ferrvault.com/.well-known/oauth-protected-resource';

  it('returns an RFC 6749 §5.2 error body where `error` is a string', () => {
    const { body } = unauthorizedChallenge(metadataUrl);
    const parsed = JSON.parse(body) as Record<string, unknown>;
    expect(typeof parsed.error).toBe('string');
    expect(parsed.error).toBe('invalid_token');
    expect(typeof parsed.error_description).toBe('string');
  });

  it('does not emit a JSON-RPC envelope that strict OAuth clients reject', () => {
    const { body } = unauthorizedChallenge(metadataUrl);
    const parsed = JSON.parse(body) as Record<string, unknown>;
    expect(parsed.jsonrpc).toBeUndefined();
    expect(typeof parsed.error).not.toBe('object');
  });

  it('builds a Bearer challenge carrying the error code and the resource metadata URL', () => {
    const { wwwAuthenticate } = unauthorizedChallenge(metadataUrl);
    expect(wwwAuthenticate.startsWith('Bearer ')).toBe(true);
    expect(wwwAuthenticate).toContain('error="invalid_token"');
    expect(wwwAuthenticate).toContain(`resource_metadata="${metadataUrl}"`);
  });
});

describe('resolveAllowedOrigin', () => {
  const allowlist = ['https://app.ferrlabs.com', 'http://localhost:5173'];

  it('echoes an origin that is on the allowlist', () => {
    expect(resolveAllowedOrigin('https://app.ferrlabs.com', allowlist)).toBe(
      'https://app.ferrlabs.com',
    );
  });

  it('refuses to reflect an origin that is not allowlisted', () => {
    expect(resolveAllowedOrigin('https://evil.test', allowlist)).toBeUndefined();
  });

  it('returns undefined when no origin header is present', () => {
    expect(resolveAllowedOrigin(undefined, allowlist)).toBeUndefined();
  });

  it('never falls back to a wildcard when the allowlist is empty', () => {
    expect(resolveAllowedOrigin('https://app.ferrlabs.com', [])).toBeUndefined();
  });
});

describe('isHostAllowed', () => {
  it('allows any host when no allowlist is configured', () => {
    expect(isHostAllowed('anything.test', [])).toBe(true);
  });

  it('matches the host ignoring port and case', () => {
    expect(isHostAllowed('MCP.ferrlabs.com:3000', ['mcp.ferrlabs.com'])).toBe(true);
  });

  it('rejects a host outside the allowlist (DNS-rebinding guard)', () => {
    expect(isHostAllowed('attacker.test', ['mcp.ferrlabs.com'])).toBe(false);
  });

  it('rejects a missing host header when an allowlist is set', () => {
    expect(isHostAllowed(undefined, ['mcp.ferrlabs.com'])).toBe(false);
  });
});

describe('defaultBindHost', () => {
  it('defaults to loopback', () => {
    expect(defaultBindHost(undefined, false)).toBe('127.0.0.1');
  });

  it('binds all interfaces only when explicitly opted in', () => {
    expect(defaultBindHost(undefined, true)).toBe('0.0.0.0');
  });

  it('honours an explicit host over the opt-in flag', () => {
    expect(defaultBindHost('10.0.0.5', true)).toBe('10.0.0.5');
  });
});

describe('parseList', () => {
  it('splits, trims, and drops empties', () => {
    expect(parseList(' a , b ,, c ')).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty array for undefined', () => {
    expect(parseList(undefined)).toEqual([]);
  });
});
