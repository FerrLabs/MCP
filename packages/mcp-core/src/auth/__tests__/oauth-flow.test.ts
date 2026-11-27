import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createServer, get, type Server } from 'node:http';

const spawnMock = vi.fn();
let currentPlatform: NodeJS.Platform = 'linux';

vi.mock('node:child_process', () => ({ spawn: (...args: unknown[]) => spawnMock(...args) }));
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:os')>()),
  platform: () => currentPlatform,
}));

function stubSpawn(): { urls: string[] } {
  const urls: string[] = [];
  spawnMock.mockImplementation((_cmd: string, args: string[]) => {
    urls.push(args[args.length - 1] as string);
    return { on: vi.fn(), unref: vi.fn() };
  });
  return { urls };
}

function hit(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode ?? 0));
    }).on('error', reject);
  });
}

async function waitFor<T>(read: () => T | undefined): Promise<T> {
  for (let i = 0; i < 200; i++) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('condition never met');
}

function squat(port: number): Promise<Server> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

describe('runLoopbackOauthFlow', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    currentPlatform = 'linux';
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function load() {
    return (await import('../oauth.js')).runLoopbackOauthFlow;
  }

  it('opens the authorize URL, accepts the callback and returns the exchanged token', async () => {
    const { urls } = stubSpawn();
    const exchange = vi.fn().mockResolvedValue(Response.json({ token: 'fl_oauth_token' }));
    vi.stubGlobal('fetch', exchange);
    const runLoopbackOauthFlow = await load();

    const flow = runLoopbackOauthFlow();
    const authorize = new URL(await waitFor(() => urls[0]));
    const redirect = authorize.searchParams.get('redirect_uri') as string;
    expect(authorize.searchParams.get('response_type')).toBe('code');
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorize.searchParams.get('client_id')).toBe('mcp');

    const state = authorize.searchParams.get('state');
    expect(await hit(`${redirect}?code=the-code&state=${state}`)).toBe(200);
    await expect(flow).resolves.toEqual({ token: 'fl_oauth_token' });

    const [, init] = exchange.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      code: 'the-code',
      client_id: 'mcp',
      redirect_uri: redirect,
    });
    expect(JSON.parse(init.body as string).code_verifier).toEqual(expect.any(String));
  });

  it('releases the port after the flow so a second flow can bind it', async () => {
    const { urls } = stubSpawn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(Response.json({ token: 't' }))),
    );
    const runLoopbackOauthFlow = await load();

    for (let round = 0; round < 2; round++) {
      const flow = runLoopbackOauthFlow();
      const authorize = new URL(await waitFor(() => urls[round]));
      const redirect = authorize.searchParams.get('redirect_uri') as string;
      await hit(`${redirect}?code=c&state=${authorize.searchParams.get('state')}`);
      await expect(flow).resolves.toEqual({ token: 't' });
    }
  });

  it('falls back to the second port when the first is taken', async () => {
    const { urls } = stubSpawn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ token: 't' })));
    const first = await squat(54321);
    try {
      const runLoopbackOauthFlow = await load();
      const flow = runLoopbackOauthFlow();
      const authorize = new URL(await waitFor(() => urls[0]));
      expect(authorize.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:54322/cb');
      await hit(`http://127.0.0.1:54322/cb?code=c&state=${authorize.searchParams.get('state')}`);
      await expect(flow).resolves.toEqual({ token: 't' });
    } finally {
      await new Promise((r) => first.close(r));
    }
  });

  it('fails with every bind error when no loopback port is free', async () => {
    stubSpawn();
    const a = await squat(54321);
    const b = await squat(54322);
    try {
      const runLoopbackOauthFlow = await load();
      await expect(runLoopbackOauthFlow()).rejects.toThrow(
        /Could not bind any of the loopback ports \(54321, 54322\)\. 54321: .*EADDRINUSE.*; 54322: .*EADDRINUSE/,
      );
      expect(spawnMock).not.toHaveBeenCalled();
    } finally {
      await Promise.all([new Promise((r) => a.close(r)), new Promise((r) => b.close(r))]);
    }
  });

  it('times out after two minutes with the authorize URL and frees the port', async () => {
    const { urls } = stubSpawn();
    const runLoopbackOauthFlow = await load();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const flow = runLoopbackOauthFlow();
    const rejection = expect(flow).rejects.toThrow(
      /OAuth flow timed out after 120s\. If your browser didn't open, visit: http/,
    );
    await vi.waitFor(() => expect(urls).toHaveLength(1));
    await vi.advanceTimersByTimeAsync(120_000);
    await rejection;

    vi.useRealTimers();
    const reclaimed = await squat(54321);
    await new Promise((r) => reclaimed.close(r));
  });

  it('surfaces a failed exchange and still frees the port', async () => {
    const { urls } = stubSpawn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ error: 'invalid_grant' }, { status: 400 })),
    );
    const runLoopbackOauthFlow = await load();
    const flow = runLoopbackOauthFlow();
    const rejection = expect(flow).rejects.toThrow(
      'OAuth exchange failed (HTTP 400): invalid_grant',
    );
    const authorize = new URL(await waitFor(() => urls[0]));
    await hit(
      `${authorize.searchParams.get('redirect_uri')}?code=c&state=${authorize.searchParams.get('state')}`,
    );
    await rejection;
    const reclaimed = await squat(54321);
    await new Promise((r) => reclaimed.close(r));
  });

  it.each([
    ['linux', 'xdg-open', (u: string) => [u]],
    ['darwin', 'open', (u: string) => [u]],
    ['win32', 'rundll32', (u: string) => ['url.dll,FileProtocolHandler', u]],
  ] as const)('launches the browser with the %s opener', async (os, cmd, argsFor) => {
    currentPlatform = os;
    const { urls } = stubSpawn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ token: 't' })));
    const runLoopbackOauthFlow = await load();
    const flow = runLoopbackOauthFlow();
    const url = await waitFor(() => urls[0]);
    expect(spawnMock).toHaveBeenCalledWith(cmd, argsFor(url), { detached: true, stdio: 'ignore' });
    const authorize = new URL(url);
    await hit(
      `${authorize.searchParams.get('redirect_uri')}?code=c&state=${authorize.searchParams.get('state')}`,
    );
    await flow;
  });

  it('ignores a browser launcher that fails to start', async () => {
    const handlers: Record<string, (err: Error) => void> = {};
    let stubbedUrl: string | undefined;
    spawnMock.mockImplementation((_cmd: string, args: string[]) => {
      stubbedUrl = args[0] as string;
      return {
        on: (event: string, handler: (err: Error) => void) => (handlers[event] = handler),
        unref: vi.fn(),
      };
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ token: 't' })));
    const runLoopbackOauthFlow = await load();
    const flow = runLoopbackOauthFlow();
    const url = new URL(await waitFor(() => stubbedUrl));
    expect(() => handlers.error?.(new Error('ENOENT'))).not.toThrow();
    await hit(
      `${url.searchParams.get('redirect_uri')}?code=c&state=${url.searchParams.get('state')}`,
    );
    await expect(flow).resolves.toEqual({ token: 't' });
  });
});

describe('exchangeCodeForToken (response handling)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [Response.json({}), /OAuth exchange returned no token/],
    [Response.json({ message: 'nope' }, { status: 500 }), /HTTP 500\): nope/],
    [new Response('not json', { status: 502 }), /HTTP 502\): unknown/],
  ])('rejects on %#', async (response, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    vi.resetModules();
    const { __testOnly } = await import('../oauth.js');
    await expect(
      __testOnly.exchangeCodeForToken('c', 'v', 'http://127.0.0.1:1/cb'),
    ).rejects.toThrow(message);
  });
});
