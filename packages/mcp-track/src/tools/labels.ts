import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';

interface Label {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

export function registerLabelTools(server: McpServer) {
  server.tool(
    'list_labels',
    'List all FerrTrack labels for a project.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
    },
    async ({ org_slug, project_slug }) => {
      const token = await getToken();
      const labels = await apiRequest<Label[]>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/labels`,
        { token },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(labels, null, 2) }],
      };
    },
  );
}
