import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildDocUrl, fetchDoc } from '../docs.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildDocUrl', () => {
  it('maps a product and slug to the allowlisted host', () => {
    expect(buildDocUrl('ferrflow', 'docs/getting-started')).toBe(
      'https://ferrflow.com/docs/getting-started',
    );
    expect(buildDocUrl('ferrlabs')).toBe('https://ferrlabs.com/');
  });

  it('rejects slugs containing a scheme, traversal, or a leading //', () => {
    expect(() => buildDocUrl('ferrflow', 'https://evil.test')).toThrow(/invalid slug/);
    expect(() => buildDocUrl('ferrflow', '../../etc/passwd')).toThrow(/invalid slug/);
    expect(() => buildDocUrl('ferrflow', '//evil.test/x')).toThrow(/invalid slug/);
  });

  it('rejects an unknown product', () => {
    expect(() => buildDocUrl('notaproduct')).toThrow(/unknown product/);
  });
});

describe('fetchDoc', () => {
  function makeResponse(status: number, body = ''): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body),
    } as unknown as Response;
  }

  it('does not follow a redirect off the allowlisted host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(302));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDoc('ferrgrowth', 'r')).rejects.toThrow(/refused to follow redirect/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
  });

  it('returns stripped text on a 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse(200, '<main><p>hello world</p></main>')),
    );

    const out = await fetchDoc('ferrflow', 'pricing');
    expect(out).toContain('# https://ferrflow.com/pricing');
    expect(out).toContain('hello world');
  });
});
