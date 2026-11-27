import { describe, it, expect, afterEach } from 'vitest';
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { startHttpServer } from '../http.js';

interface Reply {
  status: number;
  body: string;
  sessionId?: string;
}

describe('startHttpServer sessions and bearer parsing', () => {
  let server: Server | undefined;
  let created = 0;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
    created = 0;
  });

  async function start(stateless: boolean): Promise<number> {
    server = await startHttpServer({
      port: 0,
      host: '127.0.0.1',
      publicUrl: 'https://mcp.ferrlabs.test',
      stateless,
      createServer: () => {
        created += 1;
        return new McpServer({ name: 'test', version: '0.0.0' });
      },
      validateBearer: async () => 'valid',
    });
    return (server.address() as AddressInfo).port;
  }

  function post(
    port: number,
    message: object,
    headers: Record<string, string> = { Authorization: 'Bearer fl_ok' },
  ): Promise<Reply> {
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
            ...headers,
          },
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (c: string) => (body += c));
          res.on('end', () =>
            resolve({
              status: res.statusCode ?? 0,
              body,
              sessionId: res.headers['mcp-session-id'] as string | undefined,
            }),
          );
        },
      );
      req.on('error', reject);
      req.end(JSON.stringify(message));
    });
  }

  const initialize = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '0.0.0' },
    },
  };

  it('answers 404 with a JSON-RPC error for an unknown session in stateful mode', async () => {
    const port = await start(false);
    const res = await post(port, initialize, {
      Authorization: 'Bearer fl_ok',
      'mcp-session-id': 'ghost',
    });
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toMatchObject({
      jsonrpc: '2.0',
      error: { code: -32001, message: expect.stringContaining('Session ghost not found') },
      id: null,
    });
    expect(created).toBe(0);
  });

  it('issues a session id and reuses its transport on the next request', async () => {
    const port = await start(false);
    const first = await post(port, initialize);
    expect(first.status).toBe(200);
    expect(first.sessionId).toEqual(expect.any(String));
    expect(created).toBe(1);

    const second = await post(
      port,
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
      { Authorization: 'Bearer fl_ok', 'mcp-session-id': first.sessionId as string },
    );
    expect(second.status).toBe(200);
    expect(created).toBe(1);
  });

  it('builds and disposes a fresh server per request in stateless mode', async () => {
    const port = await start(true);
    const first = await post(port, initialize);
    const second = await post(port, initialize);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.sessionId).toBeUndefined();
    expect(created).toBe(2);
  });

  it.each(['Bearer', 'Bearer ', 'Bearer    ', 'Basic abc', 'bearer'])(
    'treats the authorization header %j as no bearer',
    async (header) => {
      const port = await start(true);
      const res = await post(port, initialize, { Authorization: header });
      expect(res.status).toBe(401);
      expect(created).toBe(0);
    },
  );

  it('accepts the bearer scheme case-insensitively and ignores extra spacing', async () => {
    const port = await start(true);
    const res = await post(port, initialize, { Authorization: 'bEaReR   fl_ok' });
    expect(res.status).toBe(200);
  });
});
