import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ZodTypeAny } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.FERRLABS_API_TOKEN = 'test-token';

interface ToolResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}

const handlers = new Map<string, (params: Record<string, unknown>) => Promise<ToolResult>>();
const schemas = new Map<string, Record<string, ZodTypeAny>>();
const mockServer = {
  tool: vi.fn((name, _desc, schema, handler) => {
    handlers.set(name, handler);
    schemas.set(name, schema);
  }),
} as unknown as McpServer;

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function lastCall(): { url: string; method: string; body: unknown } {
  const [url, init] = mockFetch.mock.calls[0];
  return {
    url: String(url),
    method: init.method ?? 'GET',
    body: init.body ? JSON.parse(init.body) : undefined,
  };
}

const SECRET = 'fft_ab12cd34_0123456789abcdef0123456789abcdef0123456789abcdef';
const TOKEN_ID = '3f1c2a54-7a0e-4c5e-9d57-0d8b6a1f6a10';

const createdRow = {
  id: TOKEN_ID,
  name: 'ci',
  token_prefix: 'ab12cd34',
  scopes: ['read'],
  created_by: null,
  created_by_email: null,
  last_used_at: null,
  revoked: false,
  created_at: '2026-10-10T00:00:00Z',
  stale: false,
  no_expiry: true,
};

describe('org token tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    handlers.clear();
    schemas.clear();
    delete process.env.FERRLABS_MCP_ALLOW_TOKEN_REVEAL;
    const { registerOrgTokenTools } = await import('../org-tokens.js');
    registerOrgTokenTools(mockServer);
  });

  afterEach(() => {
    delete process.env.FERRLABS_MCP_ALLOW_TOKEN_REVEAL;
  });

  it('list_org_tokens reads the org tokens collection and escapes the slug', async () => {
    mockFetch.mockResolvedValue(makeResponse([createdRow]));

    await handlers.get('list_org_tokens')!({ org_slug: 'acme/../x' });

    const call = lastCall();
    expect(call.url).toMatch(/\/orgs\/acme%2F\.\.%2Fx\/tokens$/);
    expect(call.method).toBe('GET');
  });

  it('revoke_org_token deletes the token under its org', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await handlers.get('revoke_org_token')!({
      org_slug: 'acme',
      token_id: TOKEN_ID,
    });

    const call = lastCall();
    expect(call.url).toMatch(new RegExp(`/orgs/acme/tokens/${TOKEN_ID}$`));
    expect(call.method).toBe('DELETE');
    expect(result.content[0].text).toContain(TOKEN_ID);
  });

  it('revoke_org_token rejects an id that is not a uuid', () => {
    const tokenId = schemas.get('revoke_org_token')!.token_id;
    expect(tokenId.safeParse(TOKEN_ID).success).toBe(true);
    expect(tokenId.safeParse('../members').success).toBe(false);
  });

  it('create_org_token only accepts the owners the API knows', () => {
    const owner = schemas.get('create_org_token')!.owner;
    expect(owner.safeParse('creator').success).toBe(true);
    expect(owner.safeParse('org').success).toBe(true);
    expect(owner.safeParse('user').success).toBe(false);
  });

  it('create_org_token refuses without calling the API, so no credential is minted', async () => {
    const result = await handlers.get('create_org_token')!({
      org_slug: 'acme',
      name: 'ci',
      scopes: ['read'],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/FERRLABS_MCP_ALLOW_TOKEN_REVEAL=1/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('create_org_token sends the body and returns the plaintext once opted in', async () => {
    process.env.FERRLABS_MCP_ALLOW_TOKEN_REVEAL = '1';
    mockFetch.mockResolvedValue(makeResponse({ token: createdRow, plaintext: SECRET }, 201));

    const result = await handlers.get('create_org_token')!({
      org_slug: 'acme',
      name: 'ci',
      scopes: ['read'],
      owner: 'org',
      expires_at: '2027-01-01T00:00:00Z',
    });

    const call = lastCall();
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(call.url).toMatch(/\/orgs\/acme\/tokens$/);
    expect(call.method).toBe('POST');
    expect(call.body).toEqual({
      name: 'ci',
      scopes: ['read'],
      owner: 'org',
      expires_at: '2027-01-01T00:00:00Z',
    });

    const text = result.content[0].text ?? '';
    expect(text).toContain(SECRET);
    expect(text.split(SECRET)).toHaveLength(2);
    expect(text).toContain(TOKEN_ID);
    expect(text).toContain('revoke_org_token');
  });

  it('create_org_token leaks nothing on the default path', async () => {
    mockFetch.mockResolvedValue(makeResponse({ token: createdRow, plaintext: SECRET }, 201));

    const result = await handlers.get('create_org_token')!({
      org_slug: 'acme',
      name: 'ci',
      scopes: ['read'],
    });

    expect(JSON.stringify(result)).not.toContain(SECRET);
  });
});
