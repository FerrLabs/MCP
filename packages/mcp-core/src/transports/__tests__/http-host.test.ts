import { describe, it, expect } from 'vitest';
import { hostnameOf, isHostAllowed, resolvePublicEndpoint } from '../http-host.js';

describe('hostnameOf', () => {
  it.each([
    ['[::1]:3000', '[::1]'],
    ['[::1]', '[::1]'],
    ['localhost:3000', 'localhost'],
    ['localhost', 'localhost'],
    ['MCP.ferrlabs.com:443', 'mcp.ferrlabs.com'],
  ])('reads %s as %s', (header, expected) => {
    expect(hostnameOf(header)).toBe(expected);
  });

  it.each(['', '[::1', 'a b', 'evil.test/x', 'user@host', 'host:port'])(
    'rejects the malformed header %j',
    (header) => {
      expect(hostnameOf(header)).toBeUndefined();
    },
  );
});

describe('isHostAllowed', () => {
  it('matches an IPv6 Host against the same IPv6 entry only', () => {
    expect(isHostAllowed('[::1]:3000', ['[::1]'])).toBe(true);
    expect(isHostAllowed('[::2]:3000', ['[::1]'])).toBe(false);
    expect(isHostAllowed('[::1]:3000', ['localhost'])).toBe(false);
  });

  it('does not let a malformed header collapse into a matching token', () => {
    expect(isHostAllowed('[', ['['])).toBe(false);
    expect(isHostAllowed('[::1', ['[::1]'])).toBe(false);
  });

  it('rejects everything when the allowlist is empty', () => {
    expect(isHostAllowed('mcp.ferrlabs.com', [])).toBe(false);
  });

  it('rejects a missing Host header', () => {
    expect(isHostAllowed(undefined, ['mcp.ferrlabs.com'])).toBe(false);
  });
});

describe('resolvePublicEndpoint', () => {
  const bindAll = { bindHost: '0.0.0.0', port: 3000 };

  it('uses the public URL origin and allows only its host by default', () => {
    expect(
      resolvePublicEndpoint({
        ...bindAll,
        publicUrl: 'https://mcp.ferrlabs.com/',
        allowedHosts: [],
      }),
    ).toEqual({ publicUrl: 'https://mcp.ferrlabs.com', allowedHosts: ['mcp.ferrlabs.com'] });
  });

  it('normalises explicit allowlist entries, ports and brackets included', () => {
    expect(
      resolvePublicEndpoint({
        ...bindAll,
        publicUrl: 'https://mcp.ferrlabs.com',
        allowedHosts: ['MCP.ferrlabs.com:443', '[::1]:3000'],
      }).allowedHosts,
    ).toEqual(['mcp.ferrlabs.com', '[::1]']);
  });

  it('defaults to a loopback URL and loopback hosts when bound to loopback', () => {
    expect(
      resolvePublicEndpoint({
        publicUrl: undefined,
        allowedHosts: [],
        bindHost: '127.0.0.1',
        port: 4000,
      }),
    ).toEqual({
      publicUrl: 'http://127.0.0.1:4000',
      allowedHosts: ['127.0.0.1', 'localhost', '[::1]'],
    });
  });

  it('refuses a non-loopback bind without a public URL', () => {
    expect(() =>
      resolvePublicEndpoint({
        ...bindAll,
        publicUrl: undefined,
        allowedHosts: ['mcp.ferrlabs.com'],
      }),
    ).toThrow(/FERRLABS_MCP_PUBLIC_URL/);
  });

  it('refuses a public URL that is not http or https', () => {
    expect(() =>
      resolvePublicEndpoint({ ...bindAll, publicUrl: 'ftp://mcp.ferrlabs.com', allowedHosts: [] }),
    ).toThrow(/http or https/);
  });

  it('refuses a malformed allowlist entry instead of dropping it', () => {
    expect(() =>
      resolvePublicEndpoint({
        ...bindAll,
        publicUrl: 'https://mcp.ferrlabs.com',
        allowedHosts: ['a b'],
      }),
    ).toThrow(/invalid entry/);
  });
});
