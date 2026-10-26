import { describe, it, expect, vi, afterEach } from 'vitest';
import { createBearerValidator } from '../validate.js';

function stubFetch(status: number | Error) {
  const fn = vi.fn(async () => {
    if (status instanceof Error) throw status;
    return new Response(null, { status });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('createBearerValidator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('accepts a token the auth server accepts and sends it to /auth/me', async () => {
    const fn = stubFetch(200);
    const validate = createBearerValidator('https://api.example.test/');
    expect(await validate('fl_a')).toBe('valid');
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.test/auth/me');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer fl_a');
  });

  it.each([401, 403])('rejects a token answered with %i', async (status) => {
    stubFetch(status);
    expect(await createBearerValidator('https://a.test')('x')).toBe('invalid');
  });

  it.each([500, 502, 429])('reports unavailable on %i', async (status) => {
    stubFetch(status);
    expect(await createBearerValidator('https://a.test')('x')).toBe('unavailable');
  });

  it('reports unavailable when the request fails', async () => {
    stubFetch(new Error('boom'));
    expect(await createBearerValidator('https://a.test')('x')).toBe('unavailable');
  });

  it('caches accepted tokens until the ttl expires but never caches rejections', async () => {
    vi.useFakeTimers();
    const fn = stubFetch(200);
    const validate = createBearerValidator('https://a.test', 1_000);
    await validate('t');
    await validate('t');
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_001);
    await validate('t');
    expect(fn).toHaveBeenCalledTimes(2);

    const rejecting = stubFetch(401);
    const v2 = createBearerValidator('https://a.test');
    await v2('bad');
    await v2('bad');
    expect(rejecting).toHaveBeenCalledTimes(2);
  });
});
