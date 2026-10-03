import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildDocUrl, fetchDoc } from '../docs.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const DOCS_PAGE = `<!doctype html><html><head><title>Introduction</title>
<style>.nav{color:red}</style></head><body>
<flr-root ng-version="22.2.0"><flr-site-shell><flr-site-navbar><header class="nav">
<a class="nav__brand" href="/"><span class="nav__wordmark">ferrflow</span></a>
<nav class="nav__desktop"><a class="nav__link mono" href="/performance/">Performance</a></nav>
</header></flr-site-navbar>
<main _ngcontent-ng-c1=""><flr-docs-layout><div class="docs">
<aside class="docs__sidebar" aria-label="Documentation menu">
<select id="flr-docs-version"><option value="/v6/docs/introduction"> v6 </option></select>
<nav class="docs__nav"><ul><li><a class="docs__link" href="/docs/installation">Sidebar Installation</a></li></ul></nav>
</aside>
<main _ngcontent-ng-c2="" class="docs__main"><article _ngcontent-ng-c2="" class="ferr-prose docs__prose"><analog-markdown><div class="analog-markdown">
<p>FerrFlow is a single binary that automates <strong>semantic versioning</strong>.</p>
<h2 id="how-it-works">How it works</h2>
<ol>
<li><p><strong>Reads commits</strong> since the last tag</p></li>
<li>Bumps <code>Cargo.toml</code> &amp; friends</li>
</ol>
<table>
<thead>
<tr>
<th>Tool</th>
<th>Runtime</th>
</tr>
</thead>
<tbody><tr>
<td><strong>FerrFlow</strong></td>
<td>none</td>
</tr>
</tbody></table>
<pre><code class="language-bash">ferrflow check &lt;/main&gt;
</code></pre>
<script>window.tracking = 'leaked';</script>
<aside class="ferr-aside ferr-aside--note"><p class="ferr-aside__title">Heads up</p><div class="ferr-aside__body"><p>FerrFlow is versioning only.</p></div></aside>
</div></analog-markdown></article>
<nav class="docs__pager"><a href="/docs/installation"><span>Next</span><span>Pager Installation</span></a></nav>
</main></div></flr-docs-layout></main>
<flr-site-footer><footer class="footer"><p>Footer colophon</p></footer></flr-site-footer>
</flr-site-shell></flr-root><script>console.log('hydrate')</script></body></html>`;

const MARKETING_PAGE = `<!doctype html><html><body><flr-root>
<flr-site-navbar><header class="nav"><nav><a href="/docs/introduction/">Navbar Docs</a></nav></header></flr-site-navbar>
<main _ngcontent-ng-c3=""><flr-landing>
<section class="hero"><h1 class="hero-title"><span>Every web tool</span><br _ngcontent-ng-c3=""><span>you keep Googling for.</span></h1>
<p class="hero-sub"> SEO scores, DNS lookups &amp; email deliverability. </p></section>
<section id="tools"><div class="tb-filters"><button type="button" class="tb-chip">Filter chip</button></div>
<a class="tb-row" href="/tools/serp/"><h3 class="tb-name">SERP preview</h3><p class="tb-desc">Google preview.</p></a></section>
</flr-landing></main>
<flr-site-footer><footer class="footer"><p>Footer colophon</p></footer></flr-site-footer>
</flr-root></body></html>`;

function makeResponse(status: number, body = '', location?: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(location ? { location } : {}),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

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
  it('does not follow a redirect off the allowlisted host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(302, '', 'https://evil.test/x'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDoc('ferrgrowth', 'r')).rejects.toThrow(/refused to follow redirect/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
  });

  it('refuses a redirect without a location', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(301)));

    await expect(fetchDoc('ferrgrowth', 'no-location')).rejects.toThrow(
      /refused to follow redirect/,
    );
  });

  it('follows a same-host redirect such as the trailing-slash one the sites emit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(301, '', 'https://ferrflow.com/docs/introduction/'))
      .mockResolvedValueOnce(makeResponse(200, DOCS_PAGE));
    vi.stubGlobal('fetch', fetchMock);

    const out = await fetchDoc('ferrflow', 'docs');

    expect(fetchMock.mock.calls[1][0]).toBe('https://ferrflow.com/docs/introduction/');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ redirect: 'manual' });
    expect(out).toContain('FerrFlow is a single binary');
  });

  it('extracts only the docs article from a docs page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(200, DOCS_PAGE)));

    const out = await fetchDoc('ferrflow', 'docs/introduction');

    expect(out).toContain('# https://ferrflow.com/docs/introduction');
    expect(out).toContain('FerrFlow is a single binary that automates semantic versioning.');
    expect(out).toContain('## How it works');
    expect(out).toContain('| Tool | Runtime |\n');
    expect(out).toContain('| FerrFlow | none |');
    expect(out).toContain('- Reads commits since the last tag\n- Bumps `Cargo.toml` & friends');
    expect(out).toContain('```\nferrflow check </main>\n```');
    expect(out).toContain('Heads up');
    expect(out).toContain('FerrFlow is versioning only.');
    for (const chrome of [
      'Sidebar Installation',
      'Pager Installation',
      'v6',
      'Performance',
      'Footer colophon',
      'leaked',
      'hydrate',
      'color:red',
    ]) {
      expect(out).not.toContain(chrome);
    }
  });

  it('extracts the outer main of a marketing page without nav, buttons or footer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(200, MARKETING_PAGE)));

    const out = await fetchDoc('ferrlens');

    expect(out).toContain('# Every web tool\nyou keep Googling for.');
    expect(out).toContain('SEO scores, DNS lookups & email deliverability.');
    expect(out).toContain('### SERP preview');
    expect(out).not.toContain('Navbar Docs');
    expect(out).not.toContain('Filter chip');
    expect(out).not.toContain('Footer colophon');
  });

  it('flags a page with no recognised content container', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(makeResponse(200, '<html><body><div>bare page</div></body></html>')),
    );

    const out = await fetchDoc('ferrvault', 'bare');

    expect(out).toContain('no docs article or <main> element found');
    expect(out).toContain('bare page');
  });

  it('serves a repeat call from the cache until the TTL expires', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, MARKETING_PAGE));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchDoc('ferrtrack', 'cached');
    vi.advanceTimersByTime(4 * 60_000);
    const second = await fetchDoc('ferrtrack', 'cached');

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2 * 60_000);
    await fetchDoc('ferrtrack', 'cached');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(200, MARKETING_PAGE));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDoc('ferrfleet', 'flaky')).rejects.toThrow(/HTTP 503/);
    await expect(fetchDoc('ferrfleet', 'flaky')).resolves.toContain('SERP preview');
  });
});
