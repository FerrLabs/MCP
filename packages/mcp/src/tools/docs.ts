import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchWithTimeout } from '@ferrlabs/mcp-core';
import { extractContent, htmlToText } from './docs-html.js';

const PRODUCT_HOSTS: Record<string, string> = {
  ferrlabs: 'https://ferrlabs.com',
  ferrflow: 'https://ferrflow.com',
  ferrvault: 'https://ferrvault.com',
  ferrtrack: 'https://ferrtrack.com',
  ferrgrowth: 'https://ferrgrowth.com',
  ferrfleet: 'https://ferrfleet.com',
  ferrlens: 'https://ferrlens.com',
};

const productEnum = z.enum(Object.keys(PRODUCT_HOSTS) as [keyof typeof PRODUCT_HOSTS, ...string[]]);

const MAX_BYTES = 200_000;
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 100;

const cache = new Map<string, { readonly expiresAt: number; readonly text: string }>();

const NO_CONTAINER_NOTICE =
  '[fetch_docs: no docs article or <main> element found, returning the whole page body]';

export function buildDocUrl(product: string, slug?: string): string {
  const host = PRODUCT_HOSTS[product];
  if (!host) {
    throw new Error(`fetch_docs: unknown product '${product}'`);
  }
  if (slug !== undefined) {
    if (slug.includes('://') || slug.includes('..') || slug.startsWith('//')) {
      throw new Error(
        `fetch_docs: invalid slug '${slug}' — must be a relative path without '://', '..', or a leading '//'`,
      );
    }
  }
  const path = slug ? `/${slug.replace(/^\//, '')}` : '/';
  return `${host}${path}`;
}

async function fetchSameOrigin(url: string): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetchWithTimeout(current, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'ferrlabs-mcp',
        Accept: 'text/html,text/markdown,text/plain',
      },
    });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get('location');
    const next = location ? new URL(location, current) : undefined;
    if (!next || next.origin !== new URL(url).origin) {
      throw new Error(
        `fetch_docs ${url}: refused to follow redirect (HTTP ${res.status}) off the allowlisted host`,
      );
    }
    current = next.href;
  }
  throw new Error(`fetch_docs ${url}: more than ${MAX_REDIRECTS} redirects`);
}

function render(url: string, html: string): string {
  const extraction = extractContent(html);
  const text = htmlToText(extraction.html);
  const body =
    extraction.kind === 'none'
      ? `${NO_CONTAINER_NOTICE}

${text}`
      : text;
  const out =
    body.length > MAX_BYTES
      ? `${body.slice(0, MAX_BYTES)}

[truncated]`
      : body;
  return `# ${url}

${out}`;
}

export async function fetchDoc(product: string, slug?: string): Promise<string> {
  const url = buildDocUrl(product, slug);
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.text;

  const res = await fetchSameOrigin(url);
  if (!res.ok) {
    throw new Error(`fetch_docs ${url}: HTTP ${res.status}`);
  }

  const text = render(url, await res.text());
  cache.delete(url);
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, text });
  return text;
}

export function registerDocsTools(server: McpServer) {
  server.tool(
    'fetch_docs',
    'Fetch documentation or marketing copy from a FerrLabs product website (ferrflow, ferrvault, ferrtrack, ferrgrowth, ferrfleet, ferrlens, or ferrlabs holding). Returns the page text content, HTML stripped.',
    {
      product: productEnum.describe('FerrLabs product whose docs to fetch'),
      slug: z
        .string()
        .optional()
        .describe(
          "Path on the product site, e.g. 'docs/getting-started' or 'pricing'. Omit for the homepage.",
        ),
    },
    async ({ product, slug }) => {
      const text = await fetchDoc(product, slug);
      return {
        content: [
          {
            type: 'text' as const,
            text,
          },
        ],
      };
    },
  );
}
