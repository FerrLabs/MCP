import { z } from 'zod';
import type { McpServer } from '@ferrlabs/mcp-core';
import { lensPost } from '../api-base.js';
import { domain, publicUrl } from './schemas.js';

export function registerSeoTools(server: McpServer) {
  server.tool(
    'check_seo',
    'Run a Lighthouse audit of a public URL: performance, SEO, accessibility and best-practices scores, Core Web Vitals and findings. Slow (tens of seconds); results are cached.',
    {
      url: publicUrl,
      strategy: z
        .enum(['mobile', 'desktop'])
        .optional()
        .describe('Device profile, defaults to mobile'),
    },
    ({ url, strategy }) => lensPost('/v1/seo/check', { url, strategy }),
  );

  server.tool(
    'check_robots_txt',
    'Fetch and parse the robots.txt of a domain, optionally testing whether a path is allowed for a user agent.',
    {
      domain,
      user_agent: z
        .string()
        .min(1)
        .max(200)
        .optional()
        .describe('User agent to match, defaults to *'),
      test_path: z.string().min(1).max(2048).optional().describe('Path to test, e.g. /admin'),
    },
    ({ domain, user_agent, test_path }) =>
      lensPost('/v1/seo/robots', { domain, user_agent, test_path }),
  );

  server.tool(
    'check_sitemap',
    'Fetch and parse an XML sitemap or sitemap index: URL count, a sample of entries, child sitemaps and warnings.',
    { url: publicUrl.describe('Sitemap URL, e.g. https://example.com/sitemap.xml') },
    ({ url }) => lensPost('/v1/seo/sitemap', { url }),
  );

  server.tool(
    'check_links',
    'Crawl a site from a URL and report broken links, redirects and blocked or unreachable pages.',
    {
      url: publicUrl.describe('Start URL of the crawl'),
      max_depth: z
        .number()
        .int()
        .min(1)
        .max(3)
        .optional()
        .describe('Crawl depth, 1 to 3, defaults to 2'),
      max_pages: z
        .number()
        .int()
        .min(10)
        .max(500)
        .optional()
        .describe('Page budget, 10 to 500, defaults to 200'),
    },
    ({ url, max_depth, max_pages }) => lensPost('/v1/link-check', { url, max_depth, max_pages }),
  );
}
