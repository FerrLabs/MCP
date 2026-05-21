import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';
import { GROWTH_API_URL } from '../api-base.js';

interface Site {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function registerSiteTools(server: McpServer) {
  server.tool(
    'list_sites',
    "List FerrGrowth sites in the authenticated user's org.",
    {},
    async () => {
      const token = await getToken();
      const sites = await apiRequest<Site[]>('/v1/sites', { token, baseUrl: GROWTH_API_URL });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(sites, null, 2) }],
      };
    },
  );

  server.tool(
    'get_site',
    'Get details for a single FerrGrowth site (status, custom domain, etc.).',
    {
      site_id: z.string().min(1).describe('Site id'),
    },
    async ({ site_id }) => {
      const token = await getToken();
      const site = await apiRequest<Site>(`/v1/sites/${encodeURIComponent(site_id)}`, {
        token,
        baseUrl: GROWTH_API_URL,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(site, null, 2) }],
      };
    },
  );
}
