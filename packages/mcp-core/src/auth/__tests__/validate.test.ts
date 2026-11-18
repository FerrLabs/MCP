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
    const validate = createBearerValidator('https://api.ferrlabs.com/');
    expect(await validate('fl_a')).toBe('valid');
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.ferrlabs.com/auth/me');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer fl_a');
  });

  it.each([401, 403])('rejects a token answered with %i', async (status) => {
    stubFetch(status);
    expect(await createBearerValidator('https://api.ferrlabs.com')('x')).toBe('invalid');
  });

  it.each([500, 502, 429])('reports unavailable on %i', async (status) => {
    stubFetch(status);
    expect(await createBearerValidator('https://api.ferrlabs.com')('x')).toBe('unavailable');
  });

  it('refuses to build a validator for an untrusted or cleartext auth server', () => {
    expect(() => createBearerValidator('http://api.ferrlabs.com')).toThrow();
    expect(() => createBearerValidator('https://evil.example.com')).toThrow();
  });

  it('reports unavailable when the request fails', async () => {
    stubFetch(new Error('boom'));
    expect(await createBearerValidator('https://api.ferrlabs.com')('x')).toBe('unavailable');
  });

  it('caches accepted tokens until the ttl expires but never caches rejections', async () => {
    vi.useFakeTimers();
    const fn = stubFetch(200);
    const validate = createBearerValidator('https://api.ferrlabs.com', 1_000);
    await validate('t');
    await validate('t');
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_001);
    await validate('t');
    expect(fn).toHaveBeenCalledTimes(2);

    const rejecting = stubFetch(401);
    const v2 = createBearerValidator('https://api.ferrlabs.com');
    await v2('bad');
    await v2('bad');
    expect(rejecting).toHaveBeenCalledTimes(2);
  });

  describe('org tokens', () => {
    const stubByPath = (me: number, tokenInfo: number | Error) => {
      const fn = vi.fn(async (url: string) => {
        const status = url.endsWith('/auth/me') ? me : tokenInfo;
        if (status instanceof Error) throw status;
        return new Response(null, { status });
      });
      vi.stubGlobal('fetch', fn);
      return fn;
    };
    const urls = (fn: ReturnType<typeof stubByPath>) =>
      fn.mock.calls.map((c) => (c as unknown as [string])[0]);

    it('accepts an fft_ token via /auth/token-info and caches it', async () => {
      const fn = stubByPath(401, 200);
      const validate = createBearerValidator('https://api.ferrlabs.com');
      expect(await validate('fft_abc')).toBe('valid');
      expect(urls(fn)).toEqual([
        'https://api.ferrlabs.com/auth/me',
        'https://api.ferrlabs.com/auth/token-info',
      ]);
      const [, init] = fn.mock.calls[1] as unknown as [string, RequestInit];
      expect(init.redirect).toBe('manual');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer fft_abc');
      expect(await validate('fft_abc')).toBe('valid');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it.each([401, 403, 404])('rejects an fft_ token when token-info answers %i', async (status) => {
      stubByPath(403, status);
      expect(await createBearerValidator('https://api.ferrlabs.com')('fft_x')).toBe('invalid');
    });

    it('does not cache a rejected org token', async () => {
      const fn = stubByPath(401, 401);
      const validate = createBearerValidator('https://api.ferrlabs.com');
      await validate('fft_x');
      await validate('fft_x');
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('never calls token-info for a token without the fft_ prefix', async () => {
      const fn = stubByPath(401, 200);
      expect(await createBearerValidator('https://api.ferrlabs.com')('fl_x')).toBe('invalid');
      expect(urls(fn)).toEqual(['https://api.ferrlabs.com/auth/me']);
    });

    it('does not fall back when /auth/me is unavailable', async () => {
      const fn = stubByPath(500, 200);
      expect(await createBearerValidator('https://api.ferrlabs.com')('fft_x')).toBe('unavailable');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it.each([500, 429])('reports unavailable when token-info answers %i', async (status) => {
      stubByPath(401, status);
      expect(await createBearerValidator('https://api.ferrlabs.com')('fft_x')).toBe('unavailable');
    });

    it('reports unavailable when the token-info request fails', async () => {
      stubByPath(401, new Error('boom'));
      expect(await createBearerValidator('https://api.ferrlabs.com')('fft_x')).toBe('unavailable');
    });
  });
});
