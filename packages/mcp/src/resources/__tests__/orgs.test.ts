import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { lastRequest, makeResponse, mockFetch } from '../../tools/__tests__/harness.js';
import { registerOrgResources } from '../orgs.js';

type ReadCallback = (
  uri: URL,
  variables: Record<string, string | string[]>,
) => Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }>;

interface Registered {
  template: ResourceTemplate;
  config: { mimeType?: string };
  read: ReadCallback;
}

const registered = new Map<string, Registered>();
const server = {
  registerResource: vi.fn(
    (
      name: string,
      template: ResourceTemplate,
      config: { mimeType?: string },
      read: ReadCallback,
    ) => {
      registered.set(name, { template, config, read });
    },
  ),
} as unknown as McpServer;

describe('org resources', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    registered.clear();
    registerOrgResources(server);
  });

  it('registers an overview and a usage resource', () => {
    expect([...registered.keys()].sort()).toEqual(['org-overview', 'org-usage']);
    expect(registered.get('org-overview')!.template.uriTemplate.toString()).toBe(
      'ferrlabs://org/{slug}/overview',
    );
    expect(registered.get('org-usage')!.template.uriTemplate.toString()).toBe(
      'ferrlabs://org/{slug}/usage',
    );
  });

  it('lists one overview resource per org the user belongs to', async () => {
    mockFetch.mockResolvedValue(makeResponse([{ slug: 'acme' }, { slug: 'beta' }]));

    const listed = await registered.get('org-overview')!.template.listCallback!({} as never);

    expect(lastRequest().url).toMatch(/\/orgs$/);
    expect(listed.resources).toEqual([
      { uri: 'ferrlabs://org/acme/overview', name: 'acme overview', mimeType: 'application/json' },
      { uri: 'ferrlabs://org/beta/overview', name: 'beta overview', mimeType: 'application/json' },
    ]);
  });

  it('lists usage resources with the usage suffix', async () => {
    mockFetch.mockResolvedValue(makeResponse([{ slug: 'acme' }]));

    const listed = await registered.get('org-usage')!.template.listCallback!({} as never);

    expect(listed.resources).toEqual([
      { uri: 'ferrlabs://org/acme/usage', name: 'acme usage', mimeType: 'application/json' },
    ]);
  });

  it('lists nothing for a user without orgs', async () => {
    mockFetch.mockResolvedValue(makeResponse([]));

    const listed = await registered.get('org-usage')!.template.listCallback!({} as never);

    expect(listed.resources).toEqual([]);
  });

  it('reads the overview for the slug in the URI', async () => {
    mockFetch.mockResolvedValue(makeResponse({ member_count: 5 }));
    const uri = new URL('ferrlabs://org/acme/overview');

    const result = await registered.get('org-overview')!.read(uri, { slug: 'acme' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/overview$/);
    expect(req.headers['x-api-token']).toBe('test-token');
    expect(result.contents).toEqual([
      { uri: uri.href, mimeType: 'application/json', text: '{"member_count":5}' },
    ]);
  });

  it('reads the usage for the slug in the URI', async () => {
    mockFetch.mockResolvedValue(makeResponse({ runs: 12 }));
    const uri = new URL('ferrlabs://org/acme/usage');

    const result = await registered.get('org-usage')!.read(uri, { slug: 'acme' });

    expect(lastRequest().url).toMatch(/\/orgs\/acme\/usage$/);
    expect(result.contents[0].text).toBe('{"runs":12}');
  });

  it('escapes a slug that would break out of the path', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await registered
      .get('org-overview')!
      .read(new URL('ferrlabs://org/x/overview'), { slug: 'a/b' });

    expect(lastRequest().url).toMatch(/\/orgs\/a%2Fb\/overview$/);
  });

  it('propagates an API failure on read', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'nope' }, 404));

    await expect(
      registered.get('org-usage')!.read(new URL('ferrlabs://org/x/usage'), { slug: 'x' }),
    ).rejects.toThrow();
  });
});
