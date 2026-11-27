import { describe, it, expect, beforeEach } from 'vitest';
import { createToolHarness, lastRequest, makeResponse, mockFetch } from './harness.js';
import { registerVaultsTools } from '../vaults.js';

const harness = createToolHarness();

describe('list_vaults', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    registerVaultsTools(harness.server);
  });

  it('reads the project vaults with the token and escaped slugs', async () => {
    mockFetch.mockResolvedValue(makeResponse([{ id: 'v1', name: 'prod', secret_count: 4 }]));

    const result = await harness.call('list_vaults', { org_slug: 'a b', project_slug: 'c/d' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/a%20b\/projects\/c%2Fd\/vaults$/);
    expect(req.method).toBe('GET');
    expect(req.headers['x-api-token']).toBe('test-token');
    expect(JSON.parse(result.content[0].text ?? '')[0].secret_count).toBe(4);
  });

  it('propagates a forbidden response', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'forbidden' }, 403));

    await expect(
      harness.call('list_vaults', { org_slug: 'acme', project_slug: 'web' }),
    ).rejects.toThrow();
  });
});
