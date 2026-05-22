import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';
import { GROWTH_API_URL } from '../api-base.js';

interface Page {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export function registerPageTools(server: McpServer) {
  server.tool(
    'list_pages',
    'List pages on a FerrGrowth site.',
    {
      site_id: z.string().min(1).describe('Site id or slug'),
    },
    async ({ site_id }) => {
      const token = await getToken();
      const pages = await apiRequest<Page[]>(`/v1/sites/${encodeURIComponent(site_id)}/pages`, {
        token,
        baseUrl: GROWTH_API_URL,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(pages, null, 2) }],
      };
    },
  );

  server.tool(
    'get_page',
    'Get a single FerrGrowth page (full content + metadata).',
    {
      site_id: z.string().min(1).describe('Site id or slug'),
      page_slug: z.string().min(1).describe('Page slug'),
    },
    async ({ site_id, page_slug }) => {
      const token = await getToken();
      const page = await apiRequest<Page>(
        `/v1/sites/${encodeURIComponent(site_id)}/pages/${encodeURIComponent(page_slug)}`,
        { token, baseUrl: GROWTH_API_URL },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(page, null, 2) }],
      };
    },
  );

  server.tool(
    'publish_page',
    "Publish a FerrGrowth page — flips it live on the site's active release. Idempotent: re-publishing an already-live page is a no-op.",
    {
      site_id: z.string().min(1).describe('Site id or slug'),
      page_slug: z.string().min(1).describe('Page slug'),
    },
    async ({ site_id, page_slug }) => {
      const token = await getToken();
      const page = await apiRequest<Page>(
        `/v1/sites/${encodeURIComponent(site_id)}/pages/${encodeURIComponent(page_slug)}/publish`,
        { token, method: 'POST', baseUrl: GROWTH_API_URL },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(page, null, 2) }],
      };
    },
  );
}
