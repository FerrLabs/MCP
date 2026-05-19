import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from '../api-client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('apiRequest', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('makes a GET request and returns parsed JSON', async () => {
    mockFetch.mockResolvedValue(makeResponse({ status: 'ok' }));
    const result = await apiRequest<{ status: string }>('/health');
    expect(result).toEqual({ status: 'ok' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('includes x-api-token header when token is provided', async () => {
    mockFetch.mockResolvedValue(makeResponse({ id: 'user-1' }));
    await apiRequest('/v1/auth/me', { token: 'my-secret-token' });
    const [, init] = mockFetch.mock.calls[0];
    expect((init.headers as Record<string, string>)['x-api-token']).toBe('my-secret-token');
  });

  it('returns undefined for 204 No Content responses', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: vi.fn() } as unknown as Response);
    const result = await apiRequest('/v1/auth/tokens/123', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('throws an error when the response is not ok', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'Not found' }, 404));
    await expect(apiRequest('/missing')).rejects.toThrow('Not found');
  });

  it('throws a generic error when response has no error field', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, 500));
    await expect(apiRequest('/broken')).rejects.toThrow('API error: 500');
  });

  it('sends a JSON body for POST requests', async () => {
    mockFetch.mockResolvedValue(makeResponse({ id: 'tok-1' }));
    await apiRequest('/v1/auth/tokens', { method: 'POST', body: { name: 'ci', scopes: ['*'] } });
    const [, init] = mockFetch.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ name: 'ci', scopes: ['*'] }));
  });
});
