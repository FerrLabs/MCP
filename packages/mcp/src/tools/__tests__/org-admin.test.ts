import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.FERRLABS_API_TOKEN = 'test-token';

interface ToolResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}

type Handler = (params: Record<string, unknown>) => Promise<ToolResult>;

const handlers = new Map<string, Handler>();
const schemas = new Map<string, z.ZodRawShape>();
const mockServer = {
  tool: vi.fn((name: string, _desc: string, schema: z.ZodRawShape, handler: Handler) => {
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
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('invite_org_member', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    handlers.clear();
    schemas.clear();
    const { registerOrgAdminTools } = await import('../org-admin.js');
    registerOrgAdminTools(mockServer);
  });

  it('posts the email and role to the invitations endpoint', async () => {
    mockFetch.mockResolvedValue(
      makeResponse(
        {
          id: '0190c0de-0000-7000-8000-000000000001',
          email: 'ada@example.com',
          role: 'admin',
          status: 'pending',
          expires_at: '2026-10-17T00:00:00Z',
          created_at: '2026-10-03T00:00:00Z',
        },
        201,
      ),
    );

    const result = await handlers.get('invite_org_member')!({
      org_slug: 'acme labs',
      email: 'ada@example.com',
      role: 'admin',
    });

    expect(result.isError).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/orgs/acme%20labs/invitations')).toBe(true);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'ada@example.com', role: 'admin' });
    expect(result.content[0].text).toContain('pending');
  });

  it('only offers the roles the API accepts', () => {
    const schema = z.object(schemas.get('invite_org_member')!);
    const base = { org_slug: 'acme', email: 'ada@example.com' };

    expect(schema.safeParse({ ...base, role: 'viewer' }).success).toBe(false);
    expect(schema.safeParse({ ...base, role: 'owner' }).success).toBe(true);
    expect(schema.parse(base).role).toBe('member');
  });
});
