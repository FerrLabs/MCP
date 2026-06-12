import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchWithTimeout } from '@ferrlabs/mcp-core';

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

function stripHtml(html: string): string {
  const article = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
  return article
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

export async function fetchDoc(product: string, slug?: string): Promise<string> {
  const url = buildDocUrl(product, slug);

  const res = await fetchWithTimeout(url, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'ferrlabs-mcp',
      Accept: 'text/html,text/markdown,text/plain',
    },
  });

  if (res.status >= 300 && res.status < 400) {
    throw new Error(
      `fetch_docs ${url}: refused to follow redirect (HTTP ${res.status}) off the allowlisted host`,
    );
  }

  if (!res.ok) {
    throw new Error(`fetch_docs ${url}: HTTP ${res.status}`);
  }

  const raw = await res.text();
  const text = stripHtml(raw);
  const truncated = text.length > MAX_BYTES;
  const out = truncated ? `${text.slice(0, MAX_BYTES)}\n\n[truncated]` : text;
  return `# ${url}\n\n${out}`;
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
