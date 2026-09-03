import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest, UnauthorizedError } from '../api-client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const clearPersistedTokenMock = vi.fn();
const clearTokenCacheMock = vi.fn();
vi.mock('../auth/persistence.js', () => ({
  clearPersistedToken: () => clearPersistedTokenMock(),
}));
vi.mock('../auth/index.js', () => ({
  clearTokenCache: () => clearTokenCacheMock(),
}));

function makeResponse(body: unknown, status = 200): Response {
  const text = body === undefined ? '' : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('apiRequest', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearPersistedTokenMock.mockReset();
    clearTokenCacheMock.mockReset();
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
    await apiRequest('/auth/me', { token: 'my-secret-token' });
    const [, init] = mockFetch.mock.calls[0];
    expect((init.headers as Record<string, string>)['x-api-token']).toBe('my-secret-token');
  });

  it('returns undefined for 204 No Content responses', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: vi.fn() } as unknown as Response);
    const result = await apiRequest('/auth/tokens/123', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('throws an error when the response is not ok', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'Not found' }, 404));
    await expect(apiRequest('/missing')).rejects.toThrow('Not found');
  });

  it('throws a generic error when response has no error field', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, 500));
    await expect(apiRequest('/broken')).rejects.toThrow('API error: HTTP 500');
  });

  it('sends a JSON body for POST requests', async () => {
    mockFetch.mockResolvedValue(makeResponse({ id: 'tok-1' }));
    await apiRequest('/auth/tokens', { method: 'POST', body: { name: 'ci', scopes: ['*'] } });
    const [, init] = mockFetch.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ name: 'ci', scopes: ['*'] }));
  });

  it('clears persisted token and cache on 401 with a token', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'unauthorized' }, 401));
    await expect(apiRequest('/orgs', { token: 'stale' })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(clearPersistedTokenMock).toHaveBeenCalledOnce();
    expect(clearTokenCacheMock).toHaveBeenCalledOnce();
  });

  it('does not clear persisted token on 401 without a token', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'unauthorized' }, 401));
    await expect(apiRequest('/orgs')).rejects.toThrow('unauthorized');
    expect(clearPersistedTokenMock).not.toHaveBeenCalled();
    expect(clearTokenCacheMock).not.toHaveBeenCalled();
  });
});
