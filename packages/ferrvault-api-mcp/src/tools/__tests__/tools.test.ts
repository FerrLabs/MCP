import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { McpServer } from '@ferrlabs/mcp-core';

type Result = { content: { text: string }[]; isError?: boolean };
type Handler = (params: Record<string, unknown>) => Promise<Result>;

const handlers = new Map<string, Handler>();
const server = {
  tool: (name: string, _description: string, _schema: unknown, handler: Handler) => {
    handlers.set(name, handler);
  },
} as unknown as McpServer;

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const API = 'https://api.ferrvault.ferrlabs';
const SECRETS = `${API}/vaults/infra/environments/prod/secrets`;

const metadata = {
  id: 's1',
  vault_id: 'v1',
  environment_id: 'e1',
  name: 'DB_PASSWORD',
  current_version: 1,
  tags: [],
  expires_at: null,
  expiry_action: 'notify',
  expired: false,
  created_at: '2026-10-07T00:00:00Z',
  updated_at: '2026-10-07T00:00:00Z',
};

function respond(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

interface Sent {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | undefined;
}

function sent(index = 0): Sent {
  const [url, init] = mockFetch.mock.calls[index];
  return {
    url: String(url),
    method: init.method,
    headers: init.headers,
    body: init.body ? JSON.parse(init.body) : undefined,
  };
}

function call(name: string, params: Record<string, unknown> = {}): Promise<Result> {
  const handler = handlers.get(name);
  if (!handler) throw new Error(`tool ${name} is not registered`);
  return handler(params);
}

const target = { vault: 'infra', environment: 'prod', name: 'DB_PASSWORD' };

describe('ferrvault api tools', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
    handlers.clear();
    process.env.FERRLABS_API_TOKEN = 'jwt-from-idp';
    process.env.FERRVAULT_API_URL = `${API}/`;
    process.env.FERRLABS_MCP_ALLOWED_API_HOSTS = 'api.ferrvault.ferrlabs';
    const { register } = await import('../../register.js');
    register(server);
  });

  afterEach(() => {
    delete process.env.FERRLABS_API_TOKEN;
    delete process.env.FERRVAULT_API_URL;
    delete process.env.FERRLABS_MCP_ALLOWED_API_HOSTS;
  });

  it('sends the bearer token and pins the contract version on every call', async () => {
    mockFetch.mockResolvedValue(respond([]));
    await call('list_ferrvault_vaults');

    const { url, headers } = sent();
    expect(url).toBe(`${API}/vaults`);
    expect(headers['Authorization']).toBe('Bearer jwt-from-idp');
    expect(headers['x-ferrvault-api-version']).toBe('2026-08-04');
  });

  it('forwards the bearer of the HTTP request rather than any stored token', async () => {
    const { runWithAuthContext } = await import('@ferrlabs/mcp-core');
    mockFetch.mockResolvedValue(respond([]));
    await runWithAuthContext({ bearerToken: 'caller-token' }, () =>
      call('list_ferrvault_environments', { vault: 'infra' }),
    );

    expect(sent().url).toBe(`${API}/vaults/infra/environments`);
    expect(sent().headers['Authorization']).toBe('Bearer caller-token');
  });

  it('refuses to send the token to a host outside the allowlist', async () => {
    process.env.FERRLABS_MCP_ALLOWED_API_HOSTS = '';
    const result = await call('list_ferrvault_vaults');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not an allowed FerrLabs API host');
  });

  it('never returns a value from list_ferrvault_secrets, even if the API sends one', async () => {
    mockFetch.mockResolvedValue(respond([{ ...metadata, value: 'leaked' }]));
    const result = await call('list_ferrvault_secrets', { vault: 'infra', environment: 'prod' });

    expect(sent().url).toBe(SECRETS);
    expect(result.content[0].text).not.toContain('leaked');
    expect(JSON.parse(result.content[0].text)[0].name).toBe('DB_PASSWORD');
  });

  it('reveals a secret from its per-name route', async () => {
    mockFetch.mockResolvedValue(respond({ ...metadata, value: 'hunter2' }));
    const result = await call('reveal_ferrvault_secret', target);

    expect(sent().url).toBe(`${SECRETS}/DB_PASSWORD`);
    expect(sent().method).toBe('GET');
    expect(JSON.parse(result.content[0].text).value).toBe('hunter2');
  });

  it('deletes with DELETE on the per-name route', async () => {
    mockFetch.mockResolvedValue(respond(undefined, 204));
    const result = await call('delete_ferrvault_secret', target);

    expect(sent().method).toBe('DELETE');
    expect(sent().url).toBe(`${SECRETS}/DB_PASSWORD`);
    expect(result.isError).toBeUndefined();
  });

  it('set_ferrvault_secret creates the secret when it does not exist', async () => {
    mockFetch.mockResolvedValue(respond(metadata));
    const result = await call('set_ferrvault_secret', { ...target, value: 'v1' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(sent().method).toBe('POST');
    expect(sent().url).toBe(SECRETS);
    expect(sent().body).toEqual({ name: 'DB_PASSWORD', value: 'v1' });
    expect(JSON.parse(result.content[0].text).outcome).toBe('created');
  });

  it('set_ferrvault_secret stores a new version when the name is taken', async () => {
    mockFetch
      .mockResolvedValueOnce(respond({ code: 'SECRET_EXISTS', error: 'exists' }, 409))
      .mockResolvedValueOnce(respond({ ...metadata, current_version: 2 }));
    const result = await call('set_ferrvault_secret', { ...target, value: 'v2' });

    expect(sent(1).method).toBe('PUT');
    expect(sent(1).url).toBe(`${SECRETS}/DB_PASSWORD`);
    expect(sent(1).body).toEqual({ value: 'v2' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.outcome).toBe('rotated');
    expect(parsed.secret.current_version).toBe(2);
  });

  it('does not overwrite on a conflict that is not an existing secret', async () => {
    mockFetch.mockResolvedValue(respond({ code: 'VAULT_REKEYING', error: 'busy' }, 409));
    const result = await call('set_ferrvault_secret', { ...target, value: 'v2' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('FerrVault API error (HTTP 409 VAULT_REKEYING): busy');
  });

  it('maps an API refusal to a tool error carrying status and code', async () => {
    mockFetch.mockResolvedValue(respond({ code: 'AUTH_FORBIDDEN', error: 'viewer role' }, 403));
    const result = await call('reveal_ferrvault_secret', target);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      'FerrVault API error (HTTP 403 AUTH_FORBIDDEN): viewer role',
    );
  });

  it('generate_ferrvault_secret stores a random value and never returns it', async () => {
    mockFetch.mockResolvedValue(respond(metadata));
    const result = await call('generate_ferrvault_secret', {
      ...target,
      length: 64,
      charset: 'hex',
    });

    const stored = sent().body?.value;
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).not.toContain(String(stored));
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      outcome: 'created',
      length: 64,
      charset: 'hex',
    });
  });

  it('generate_ferrvault_secret rotates an existing secret with a fresh value', async () => {
    mockFetch
      .mockResolvedValueOnce(respond({ code: 'SECRET_EXISTS', error: 'exists' }, 409))
      .mockResolvedValueOnce(respond({ ...metadata, current_version: 3 }));
    const result = await call('generate_ferrvault_secret', target);

    expect(sent(1).method).toBe('PUT');
    expect(sent(1).body?.value).toBe(sent(0).body?.value);
    expect(sent(1).body?.value).toMatch(/^[A-Za-z0-9]{48}$/);
    expect(JSON.parse(result.content[0].text).outcome).toBe('rotated');
  });

  it('generate_ferrvault_secret redacts the value from an error that echoes it', async () => {
    mockFetch.mockImplementation((_url: string, init: { body: string }) => {
      const { value } = JSON.parse(init.body);
      return Promise.resolve(respond({ code: 'VALIDATION', error: `bad value ${value}` }, 400));
    });
    const result = await call('generate_ferrvault_secret', target);

    const stored = String(sent().body?.value);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain(stored);
    expect(result.content[0].text).toBe(
      'FerrVault API error (HTTP 400 VALIDATION): bad value [redacted]',
    );
  });

  it('generates distinct values', async () => {
    mockFetch.mockResolvedValue(respond(metadata));
    await call('generate_ferrvault_secret', target);
    await call('generate_ferrvault_secret', target);

    expect(sent(0).body?.value).not.toBe(sent(1).body?.value);
  });
});
