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
      site_id: z.string().min(1).describe('Site id'),
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
}
