import { describe, it, expect, afterEach } from 'vitest';
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  unauthorizedChallenge,
  resolveAllowedOrigin,
  defaultBindHost,
  parseList,
  startHttpServer,
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

describe('startHttpServer', () => {
  let server: Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
  });

  async function start(requireBearer?: boolean): Promise<number> {
    server = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      publicUrl: 'https://mcp.ferrlabs.test',
      createServer: () => new McpServer({ name: 'test', version: '0.0.0' }),
      requireBearer,
    });
    return (server.address() as AddressInfo).port;
  }

  function initialize(port: number): Promise<{ status: number; body: string }> {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '0.0.0' },
      },
    });
    return new Promise((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          path: '/mcp',
          method: 'POST',
          headers: {
            Host: 'mcp.ferrlabs.test',
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
          },
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (c: string) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      req.on('error', reject);
      req.end(payload);
    });
  }

  it('refuses an MCP request without a bearer by default', async () => {
    const port = await start();
    const res = await initialize(port);
    expect(res.status).toBe(401);
  });

  it('serves an MCP request without a bearer when the server opts out of requiring one', async () => {
    const port = await start(false);
    const res = await initialize(port);
    expect(res.status).toBe(200);
    expect(res.body).toContain('"serverInfo"');
  });

  function get(
    port: number,
    path: string,
    headers: Record<string, string>,
  ): Promise<{ status: number; body: string; wwwAuthenticate?: string }> {
    return new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c: string) => (body += c));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body,
            wwwAuthenticate: res.headers['www-authenticate'],
          }),
        );
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('advertises the configured public URL whatever X-Forwarded-Host says', async () => {
    const port = await start();
    const res = await get(port, '/.well-known/oauth-protected-resource', {
      Host: 'mcp.ferrlabs.test',
      'X-Forwarded-Host': 'attacker.test',
      'X-Forwarded-Proto': 'http',
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).resource).toBe('https://mcp.ferrlabs.test');
  });

  it('points the 401 challenge at the configured public URL', async () => {
    const port = await start();
    const res = await get(port, '/mcp', {
      Host: 'mcp.ferrlabs.test',
      'X-Forwarded-Host': 'attacker.test',
    });
    expect(res.status).toBe(401);
    expect(res.wwwAuthenticate).toContain(
      'resource_metadata="https://mcp.ferrlabs.test/.well-known/oauth-protected-resource"',
    );
  });

  it('rejects a Host outside the allowlist derived from the public URL', async () => {
    const port = await start();
    const res = await get(port, '/.well-known/oauth-protected-resource', {
      Host: 'attacker.test',
    });
    expect(res.status).toBe(421);
  });

  it('answers health probes whatever the Host header, so kubelet probes on the pod IP pass', async () => {
    const port = await start();
    const res = await get(port, '/health', { Host: '10.42.0.17:3000' });
    expect(res.status).toBe(200);
  });

  it('refuses to start on a non-loopback address without a public URL', async () => {
    await expect(
      startHttpServer({
        port: 0,
        host: '0.0.0.0',
        createServer: () => new McpServer({ name: 'test', version: '0.0.0' }),
      }),
    ).rejects.toThrow(/FERRLABS_MCP_PUBLIC_URL/);
  });
});
