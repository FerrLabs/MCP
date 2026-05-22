import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';

interface VaultSummary {
  id: string;
  name: string;
  description: string | null;
  secret_count: number;
  created_at: string;
  updated_at: string;
}

export function registerVaultMutationTools(server: McpServer) {
  server.tool(
    'create_vault',
    'Create a new vault inside a project. Empty by default — populate via the FerrVault app or via secret-request workflows.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
      name: z.string().min(1).max(100).describe('Human-readable vault name'),
      description: z.string().max(500).optional().describe('Optional description for teammates'),
    },
    async ({ org_slug, project_slug, name, description }) => {
      const token = await getToken();
      const vault = await apiRequest<VaultSummary>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/vaults`,
        {
          token,
          method: 'POST',
          body: { name, description: description ?? null },
        },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(vault, null, 2) }],
      };
    },
  );
}
