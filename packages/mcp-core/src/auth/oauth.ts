import { createHash, randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const AUTH_BASE = process.env.FERRLABS_AUTH_URL ?? 'https://auth.ferrlabs.com';
const API_BASE = process.env.API_URL ?? 'https://api.ferrlabs.com';
const CLIENT_ID = 'mcp';
const REDIRECT_PORTS = [54321, 54322] as const;
const AUTH_TIMEOUT_MS = 2 * 60 * 1000;

interface PkcePair {
  verifier: string;
  challenge: string;
}

export function generatePkcePair(): PkcePair {
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function generateState(): string {
  return randomBytes(16).toString('base64url');
}

function openBrowser(url: string): void {
  const args: { cmd: string; args: string[] } = (() => {
    switch (platform()) {
      case 'win32':
        return { cmd: 'rundll32', args: ['url.dll,FileProtocolHandler', url] };
      case 'darwin':
        return { cmd: 'open', args: [url] };
      default:
        return { cmd: 'xdg-open', args: [url] };
    }
  })();
  const child = spawn(args.cmd, args.args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {
    // ignore — caller will time out and surface the URL via error
  });
  child.unref();
}

interface CallbackResult {
  code: string;
  state: string;
}

function listenForCallback(port: number, expectedState: string): Promise<CallbackResult> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
        if (url.pathname !== '/cb') {
          res.writeHead(404).end('Not found');
          return;
        }
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        if (!code || !state) {
          res.writeHead(400).end('Missing code or state');
          return;
        }
        if (state !== expectedState) {
          res.writeHead(400).end('state mismatch');
          reject(new Error('OAuth callback state mismatch (CSRF protection triggered)'));
          server.close();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });
        res.end(
          "<!doctype html><html><body style='font-family:sans-serif;padding:2rem;color:#1e293b'><h1>Authorized</h1><p>You can close this tab and return to your terminal.</p></body></html>",
        );
        setImmediate(() => server.close());
        resolve({ code, state });
      } catch (err) {
        res.writeHead(500).end('Internal error');
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1');
  });
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'ferrlabs-mcp/oauth' },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(
      `OAuth exchange failed (HTTP ${res.status}): ${body.error ?? body.message ?? 'unknown'}`,
    );
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error('OAuth exchange returned no token');
  return data.token;
}

export interface RunLoopbackFlowResult {
  token: string;
  scope?: string;
}

export async function runLoopbackOauthFlow(): Promise<RunLoopbackFlowResult> {
  const pkce = generatePkcePair();
  const state = generateState();

  let port: number | null = null;
  let callbackPromise: Promise<CallbackResult> | null = null;
  for (const candidate of REDIRECT_PORTS) {
    try {
      callbackPromise = listenForCallback(candidate, state);
      port = candidate;
      break;
    } catch {
      callbackPromise = null;
    }
  }
  if (port === null || !callbackPromise) {
    throw new Error(
      `Could not bind any of the loopback ports (${REDIRECT_PORTS.join(', ')}). Close whatever is using them and retry.`,
    );
  }

  const redirectUri = `http://127.0.0.1:${port}/cb`;
  const authorizeUrl = new URL(`${AUTH_BASE}/authorize`);
  authorizeUrl.searchParams.set('client_id', CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('code_challenge', pkce.challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);

  openBrowser(authorizeUrl.toString());

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `OAuth flow timed out after ${AUTH_TIMEOUT_MS / 1000}s. If your browser didn't open, visit: ${authorizeUrl.toString()}`,
          ),
        ),
      AUTH_TIMEOUT_MS,
    );
  });

  const { code } = await Promise.race([callbackPromise, timeoutPromise]);
  const token = await exchangeCodeForToken(code, pkce.verifier, redirectUri);
  return { token };
}
