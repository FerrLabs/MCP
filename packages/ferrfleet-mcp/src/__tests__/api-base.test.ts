import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fleetRequest } from '../api-base.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const ORG_ID = '3f0c6a52-8d1e-4b7a-9c2f-5e6d7a8b9c01';

function ok(): Response {
  const body = { ok: true };
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('fleetRequest org header', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(ok());
  });

  afterEach(() => {
    delete process.env.FERRFLEET_ORG_ID;
  });

  it('sends x-ferrfleet-org when FERRFLEET_ORG_ID is set', async () => {
    process.env.FERRFLEET_ORG_ID = ORG_ID;
    await fleetRequest('/agents', { token: 't' });
    const init = mockFetch.mock.calls[0][1];
    expect(init.headers['x-ferrfleet-org']).toBe(ORG_ID);
    expect(init.headers['x-ferrfleet-api-version']).toBeDefined();
  });

  it('sends no org header when FERRFLEET_ORG_ID is unset', async () => {
    await fleetRequest('/agents', { token: 't' });
    const init = mockFetch.mock.calls[0][1];
    expect(init.headers).not.toHaveProperty('x-ferrfleet-org');
  });

  it('rejects an invalid FERRFLEET_ORG_ID without calling fetch', async () => {
    process.env.FERRFLEET_ORG_ID = 'not-a-uuid';
    await expect(fleetRequest('/agents', { token: 't' })).rejects.toThrow(/FERRFLEET_ORG_ID/);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
