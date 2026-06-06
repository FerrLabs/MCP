import { describe, it, expect } from 'vitest';
import { unauthorizedChallenge } from '../http.js';

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
