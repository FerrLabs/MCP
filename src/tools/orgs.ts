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

interface OrgWithMemberCount {
  id: string;
  slug: string;
  name: string;
  member_count: number;
  created_at: string;
}

interface ProjectWithCounts {
  id: string;
  slug: string;
  name: string;
  issue_count: number;
  vault_count: number;
  created_at: string;
}

export function registerOrgsTools(server: McpServer) {
  server.tool(
    'list_orgs',
    'List FerrLabs organizations the authenticated user belongs to',
    {},
    async () => {
      const token = requireToken();
      const orgs = await apiRequest<OrgWithMemberCount[]>('/v1/orgs', { token });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(orgs, null, 2) }],
      };
    },
  );

  server.tool(
    'list_projects',
    'List projects inside a FerrLabs organization',
    {
      org_slug: z.string().min(1).describe('Organization slug (from list_orgs)'),
    },
    async ({ org_slug }) => {
      const token = requireToken();
      const projects = await apiRequest<ProjectWithCounts[]>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects`,
        { token },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(projects, null, 2) }],
      };
    },
  );
}
