import { describe, it, expect, beforeEach } from 'vitest';
import { lastRequest, makeResponse, mockFetch } from './harness.js';
import { fetchOrgs, listOrgSlugs } from '../orgs.js';

describe('org helpers', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetchOrgs reads /orgs with the token', async () => {
    mockFetch.mockResolvedValue(makeResponse([{ id: 'o1', slug: 'acme' }]));

    const orgs = await fetchOrgs();

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs$/);
    expect(req.headers['x-api-token']).toBe('test-token');
    expect(orgs).toEqual([{ id: 'o1', slug: 'acme' }]);
  });

  it('listOrgSlugs keeps order and returns only slugs', async () => {
    mockFetch.mockResolvedValue(
      makeResponse([
        { id: 'o1', slug: 'acme', name: 'Acme' },
        { id: 'o2', slug: 'beta', name: 'Beta' },
      ]),
    );

    expect(await listOrgSlugs()).toEqual(['acme', 'beta']);
  });

  it('listOrgSlugs returns an empty list when the user has no orgs', async () => {
    mockFetch.mockResolvedValue(makeResponse([]));

    expect(await listOrgSlugs()).toEqual([]);
  });

  it('listOrgSlugs propagates API failures', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'boom' }, 500));

    await expect(listOrgSlugs()).rejects.toThrow();
  });
});
