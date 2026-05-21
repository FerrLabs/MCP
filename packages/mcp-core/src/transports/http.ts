import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runWithAuthContext } from '../auth/context.js';

function extractBearer(req: IncomingMessage): string | undefined {
  const header = req.headers['authorization'];
  if (typeof header !== 'string') return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1];
}

function publicOrigin(req: IncomingMessage): string {
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? '';
  return `${proto}://${host}`;
}

export interface HttpServerOptions {
  port: number;
  host?: string;
  stateless?: boolean;
  createServer: () => McpServer;
  /**
   * URL of the OAuth 2.0 Authorization Server users authenticate against.
   * Surfaced to MCP clients via /.well-known/oauth-protected-resource so
   * they can drive the standard PKCE flow when no Bearer is present.
   * Defaults to `FERRLABS_AUTH_URL` env or `https://auth.ferrlabs.com`.
   */
  authorizationServer?: string;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown | undefined> {
  if (req.method !== 'POST') return undefined;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export async function startHttpServer(opts: HttpServerOptions): Promise<void> {
  const { port, host = '0.0.0.0', stateless = true } = opts;
  const authServer =
    opts.authorizationServer ?? process.env.FERRLABS_AUTH_URL ?? 'https://auth.ferrlabs.com';
  const transports = new Map<string, StreamableHTTPServerTransport>();

  function sendUnauthorized(req: IncomingMessage, res: ServerResponse): void {
    const origin = publicOrigin(req);
    const metadataUrl = `${origin}/.well-known/oauth-protected-resource`;
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer resource_metadata="${metadataUrl}"`,
    });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message:
            'Missing or invalid bearer token. The MCP client should fetch the OAuth protected-resource metadata and run the authorization code + PKCE flow.',
        },
        id: null,
      }),
    );
  }

  function sendResourceMetadata(req: IncomingMessage, res: ServerResponse): void {
    const origin = publicOrigin(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        resource: origin,
        authorization_servers: [authServer],
        bearer_methods_supported: ['header'],
        resource_documentation: 'https://ferrlabs.com',
      }),
    );
  }

  async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const bearerToken = extractBearer(req);
    if (!bearerToken) {
      sendUnauthorized(req, res);
      return;
    }

    const sessionId = (req.headers['mcp-session-id'] as string | undefined) ?? undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (sessionId && !transport && !stateless) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: `Session ${sessionId} not found — reinitialize to obtain a new session`,
          },
          id: null,
        }),
      );
      return;
    }

    if (!transport) {
      let createdSessionId: string | undefined;
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: stateless ? undefined : randomUUID,
        onsessioninitialized: stateless
          ? undefined
          : (newSessionId: string) => {
              createdSessionId = newSessionId;
              if (transport) transports.set(newSessionId, transport);
            },
      });
      transport.onclose = () => {
        if (createdSessionId) transports.delete(createdSessionId);
      };
      const server = opts.createServer();
      await server.connect(transport);
    }

    const body = await readJsonBody(req);
    await runWithAuthContext({ bearerToken }, () => transport.handleRequest(req, res, body));
  }

  const httpServer = createHttpServer((req, res) => {
    const url = req.url ?? '/';
    if (url === '/health' || url === '/livez' || url === '/readyz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'ferrlabs-mcp' }));
      return;
    }
    if (url === '/.well-known/oauth-protected-resource') {
      sendResourceMetadata(req, res);
      return;
    }
    if (url === '/mcp' || url.startsWith('/mcp?')) {
      handleMcpRequest(req, res).catch((err) => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        } else {
          res.end();
        }
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => {
      console.error(`ferrlabs-mcp HTTP transport listening on http://${host}:${port}/mcp`);
      resolve();
    });
  });
}
