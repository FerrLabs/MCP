import { describe, it, expect, beforeEach } from 'vitest';
import { createToolHarness, lastRequest, makeResponse, mockFetch } from './harness.js';
import { registerIssuesTools } from '../issues.js';

const harness = createToolHarness();

describe('list_issues', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(makeResponse({ items: [], page: 1, per_page: 25, total: 0 }));
    registerIssuesTools(harness.server);
  });

  it('omits the query string when no pagination is given', async () => {
    await harness.call('list_issues', { org_slug: 'acme', project_slug: 'web' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/projects\/web\/issues$/);
    expect(req.headers['x-api-token']).toBe('test-token');
  });

  it('forwards page and per_page', async () => {
    await harness.call('list_issues', {
      org_slug: 'acme',
      project_slug: 'web',
      page: 2,
      per_page: 50,
    });

    expect(lastRequest().url).toMatch(/\/issues\?page=2&per_page=50$/);
  });

  it('forwards a single pagination param on its own', async () => {
    await harness.call('list_issues', { org_slug: 'acme', project_slug: 'web', per_page: 10 });

    expect(lastRequest().url).toMatch(/\/issues\?per_page=10$/);
  });

  it('escapes both slugs', async () => {
    await harness.call('list_issues', { org_slug: 'a/b', project_slug: 'c d' });

    expect(lastRequest().url).toMatch(/\/orgs\/a%2Fb\/projects\/c%20d\/issues$/);
  });

  it('returns the page payload as text', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({
        items: [{ id: 'i1', number: 7, title: 'Bug' }],
        page: 1,
        per_page: 25,
        total: 1,
      }),
    );

    const result = await harness.call('list_issues', { org_slug: 'acme', project_slug: 'web' });

    expect(JSON.parse(result.content[0].text ?? '').items[0].title).toBe('Bug');
  });

  it('propagates a 404', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'not found' }, 404));

    await expect(
      harness.call('list_issues', { org_slug: 'acme', project_slug: 'nope' }),
    ).rejects.toThrow();
  });
});
