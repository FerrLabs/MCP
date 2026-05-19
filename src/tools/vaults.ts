import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest } from './api-client.js';

const API_TOKEN = process.env.FERRLABS_API_TOKEN ?? process.env.FERRFLOW_API_TOKEN;

function requireToken(): string {
  if (!API_TOKEN) {
    throw new Error(
      'FERRLABS_API_TOKEN environment variable is required for authenticated operations.',
    );
  }
  return API_TOKEN;
}

interface VaultWithStats {
  id: string;
  name: string;
  description: string | null;
  secret_count: number;
  created_at: string;
  updated_at: string;
}

export function registerVaultsTools(server: McpServer) {
  server.tool(
    'list_vaults',
    'List FerrVault vaults inside a project (FerrVault — secrets management)',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
    },
    async ({ org_slug, project_slug }) => {
      const token = requireToken();
      const vaults = await apiRequest<VaultWithStats[]>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/vaults`,
        { token },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(vaults, null, 2) }],
      };
    },
  );
}
