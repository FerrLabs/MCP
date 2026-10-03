import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z, type ZodTypeAny } from 'zod';
import type { McpServer } from '@ferrlabs/mcp-core';

type Handler = (params: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;

const handlers = new Map<string, Handler>();
const schemas = new Map<string, Record<string, ZodTypeAny>>();
const mockServer = {
  tool: vi.fn(
    (name: string, _desc: string, schema: Record<string, ZodTypeAny>, handler: Handler) => {
      handlers.set(name, handler);
      schemas.set(name, schema);
    },
  ),
} as unknown as McpServer;

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function respond(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function lastCall(): {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
} {
  const [url, init] = mockFetch.mock.calls[0];
  return {
    url: String(url),
    method: init.method ?? 'GET',
    body: init.body ? JSON.parse(init.body) : undefined,
    headers: init.headers as Record<string, string>,
  };
}

function parse(tool: string, args: Record<string, unknown>) {
  return z.object(schemas.get(tool)!).safeParse(args);
}

const LENS = 'https://api.ferrlens.com';

interface Case {
  tool: string;
  args: Record<string, unknown>;
  path: string;
  body: Record<string, unknown>;
}

const POST_CASES: Case[] = [
  {
    tool: 'dns_lookup',
    args: { domain: 'exämple.com' },
    path: '/v1/dns/lookup',
    body: { domain: 'exämple.com' },
  },
  {
    tool: 'dns_propagation',
    args: { domain: 'example.com', kind: 'MX' },
    path: '/v1/dns/propagation',
    body: { domain: 'example.com', kind: 'MX' },
  },
  {
    tool: 'reverse_dns',
    args: { ip: '2606:4700::1111' },
    path: '/v1/dns/reverse',
    body: { ip: '2606:4700::1111' },
  },
  {
    tool: 'check_email_auth',
    args: { domain: 'example.com' },
    path: '/v1/email/spf-dmarc',
    body: { domain: 'example.com' },
  },
  {
    tool: 'check_blacklist',
    args: { target: '192.0.2.1' },
    path: '/v1/email/blacklist',
    body: { target: '192.0.2.1' },
  },
  {
    tool: 'verify_email',
    args: { email: 'Ops+alerts@example.com' },
    path: '/v1/email/verify',
    body: { email: 'Ops+alerts@example.com' },
  },
  {
    tool: 'get_http_headers',
    args: { url: 'https://example.com/a?b=c&d=e' },
    path: '/v1/http/headers',
    body: { url: 'https://example.com/a?b=c&d=e' },
  },
  {
    tool: 'check_security_headers',
    args: { url: 'https://example.com' },
    path: '/v1/http/sec-headers',
    body: { url: 'https://example.com' },
  },
  {
    tool: 'get_page_meta',
    args: { url: 'https://example.com' },
    path: '/v1/web/meta',
    body: { url: 'https://example.com' },
  },
  {
    tool: 'preview_open_graph',
    args: { url: 'https://example.com' },
    path: '/v1/web/og-preview',
    body: { url: 'https://example.com' },
  },
  {
    tool: 'check_mixed_content',
    args: { url: 'https://example.com' },
    path: '/v1/web/mixed-content',
    body: { url: 'https://example.com' },
  },
  {
    tool: 'check_cors',
    args: { url: 'https://api.example.com', origin: 'https://app.example.com', method: 'PUT' },
    path: '/v1/web/cors',
    body: { url: 'https://api.example.com', origin: 'https://app.example.com', method: 'PUT' },
  },
  {
    tool: 'search_certificates',
    args: { domain: 'example.com' },
    path: '/v1/web/ct-search',
    body: { domain: 'example.com' },
  },
  {
    tool: 'check_seo',
    args: { url: 'https://example.com', strategy: 'desktop' },
    path: '/v1/seo/check',
    body: { url: 'https://example.com', strategy: 'desktop' },
  },
  {
    tool: 'check_robots_txt',
    args: { domain: 'example.com', user_agent: 'Googlebot', test_path: '/admin' },
    path: '/v1/seo/robots',
    body: { domain: 'example.com', user_agent: 'Googlebot', test_path: '/admin' },
  },
  {
    tool: 'check_sitemap',
    args: { url: 'https://example.com/sitemap.xml' },
    path: '/v1/seo/sitemap',
    body: { url: 'https://example.com/sitemap.xml' },
  },
  {
    tool: 'check_links',
    args: { url: 'https://example.com', max_depth: 3, max_pages: 50 },
    path: '/v1/link-check',
    body: { url: 'https://example.com', max_depth: 3, max_pages: 50 },
  },
];

describe('ferrlens tools', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();
    handlers.clear();
    schemas.clear();
    process.env = { ...originalEnv };
    delete process.env.FERRLABS_API_TOKEN;
    delete process.env.FERRFLOW_API_TOKEN;
    mockFetch.mockResolvedValue(respond(200, { ok: true }));
    const { registerDnsTools } = await import('../dns.js');
    const { registerEmailTools } = await import('../email.js');
    const { registerWebTools } = await import('../web.js');
    const { registerSeoTools } = await import('../seo.js');
    const { registerShareTools } = await import('../shares.js');
    registerDnsTools(mockServer);
    registerEmailTools(mockServer);
    registerWebTools(mockServer);
    registerSeoTools(mockServer);
    registerShareTools(mockServer);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('registers exactly the read-only tools the API serves', () => {
    expect([...handlers.keys()].sort()).toEqual(
      [...POST_CASES.map((c) => c.tool), 'get_share'].sort(),
    );
  });

  it.each(POST_CASES)('$tool posts its arguments to $path', async ({ tool, args, path, body }) => {
    expect(parse(tool, args).success).toBe(true);
    await handlers.get(tool)!(args);

    const call = lastCall();
    expect(call.method).toBe('POST');
    expect(call.url).toBe(`${LENS}${path}`);
    expect(call.body).toEqual(body);
  });

  it('leaves optional arguments out of the body so the API applies its own defaults', async () => {
    await handlers.get('check_links')!({ url: 'https://example.com' });
    expect(lastCall().body).toEqual({ url: 'https://example.com' });
  });

  it('get_share reads the snapshot with the id encoded as one path segment', async () => {
    await handlers.get('get_share')!({ id: 'ab/../cd?x=1' });

    const call = lastCall();
    expect(call.method).toBe('GET');
    expect(call.url).toBe(`${LENS}/v1/shares/ab%2F..%2Fcd%3Fx%3D1`);
    expect(call.body).toBeUndefined();
  });

  it('sends the contract version header the API negotiates on', async () => {
    await handlers.get('dns_lookup')!({ domain: 'example.com' });
    expect(lastCall().headers['x-ferrlens-api-version']).toBe('2026-08-04');
  });

  it('calls the API anonymously with no token configured', async () => {
    await handlers.get('dns_lookup')!({ domain: 'example.com' });

    const { headers } = lastCall();
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['x-api-token']).toBeUndefined();
  });

  it('never forwards a FerrLabs token, since the API reads none', async () => {
    process.env.FERRLABS_API_TOKEN = 'fl_secret';
    await handlers.get('check_email_auth')!({ domain: 'example.com' });

    const { headers } = lastCall();
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['x-api-token']).toBeUndefined();
    expect(JSON.stringify(mockFetch.mock.calls[0])).not.toContain('fl_secret');
  });

  it('returns the API payload as tool text', async () => {
    mockFetch.mockResolvedValue(respond(200, { domain: 'example.com', total: 2 }));
    const result = await handlers.get('dns_lookup')!({ domain: 'example.com' });
    expect(JSON.parse(result.content[0].text)).toEqual({ domain: 'example.com', total: 2 });
  });

  it('surfaces the rate limit message when the per-IP quota is spent', async () => {
    mockFetch.mockResolvedValue(
      respond(429, { code: 'RATE_LIMITED', message: 'too many requests', retry_after_secs: 2 }),
    );
    await expect(handlers.get('check_seo')!({ url: 'https://example.com' })).rejects.toThrow(
      'too many requests',
    );
  });

  it('rejects arguments outside the bounds the API enforces', () => {
    expect(parse('dns_propagation', { domain: 'example.com', kind: 'PTR' }).success).toBe(false);
    expect(parse('check_links', { url: 'https://example.com', max_depth: 4 }).success).toBe(false);
    expect(parse('check_links', { url: 'https://example.com', max_pages: 5 }).success).toBe(false);
    expect(parse('check_seo', { url: 'https://example.com', strategy: 'tablet' }).success).toBe(
      false,
    );
    expect(
      parse('check_cors', { url: 'https://example.com', origin: 'x', method: 'TRACE' }).success,
    ).toBe(false);
  });
});
