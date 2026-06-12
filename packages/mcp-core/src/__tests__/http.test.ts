import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithTimeout, fetchTimeoutMs } from '../http.js';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.FERRLABS_MCP_HTTP_TIMEOUT_MS;
});

describe('fetchTimeoutMs', () => {
  it('defaults to 15000ms', () => {
    expect(fetchTimeoutMs()).toBe(15_000);
  });

  it('honours a valid override', () => {
    process.env.FERRLABS_MCP_HTTP_TIMEOUT_MS = '500';
    expect(fetchTimeoutMs()).toBe(500);
  });

  it('ignores a non-positive or non-numeric override', () => {
    process.env.FERRLABS_MCP_HTTP_TIMEOUT_MS = 'nope';
    expect(fetchTimeoutMs()).toBe(15_000);
    process.env.FERRLABS_MCP_HTTP_TIMEOUT_MS = '0';
    expect(fetchTimeoutMs()).toBe(15_000);
  });
});

describe('fetchWithTimeout', () => {
  it('aborts and throws a timeout error when the upstream hangs', async () => {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    });

    await expect(fetchWithTimeout('https://example.test', {}, 10)).rejects.toThrow(/timed out/);
  });

  it('passes the signal through and returns the response on success', async () => {
    const ok = { ok: true } as Response;
    const seen: { signal?: AbortSignal } = {};
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      seen.signal = init.signal ?? undefined;
      return Promise.resolve(ok);
    });

    await expect(fetchWithTimeout('https://example.test')).resolves.toBe(ok);
    expect(seen.signal).toBeInstanceOf(AbortSignal);
  });
});
