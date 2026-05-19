import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.FERRLABS_API_TOKEN = 'test-token';

const handlers = new Map<string, (params: Record<string, unknown>) => Promise<unknown>>();
const mockServer = {
  tool: vi.fn((name, _desc, _schema, handler) => {
    handlers.set(name, handler);
  }),
} as unknown as McpServer;

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('orgs tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    handlers.clear();
    const { registerOrgsTools } = await import('../orgs.js');
    registerOrgsTools(mockServer);
  });

  it('registers list_orgs and list_projects', () => {
    expect(handlers.has('list_orgs')).toBe(true);
    expect(handlers.has('list_projects')).toBe(true);
  });

  it('list_orgs hits /v1/orgs with the API token', async () => {
    mockFetch.mockResolvedValue(
      makeResponse([
        {
          id: 'o1',
          slug: 'acme',
          name: 'Acme',
          member_count: 3,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    const result = await handlers.get('list_orgs')!({});
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/v1/orgs');
    expect((init.headers as Record<string, string>)['x-api-token']).toBe('test-token');
    expect(result).toMatchObject({ content: [{ type: 'text' }] });
  });

  it('list_projects URL-encodes the org slug', async () => {
    mockFetch.mockResolvedValue(makeResponse([]));
    await handlers.get('list_projects')!({ org_slug: 'acme corp' });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/v1/orgs/acme%20corp/projects');
  });
});
