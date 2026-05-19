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

interface IssueWithDetails {
  id: string;
  number: number;
  title: string;
  state: string;
  author_id: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Page<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
}

export function registerIssuesTools(server: McpServer) {
  server.tool(
    'list_issues',
    'List FerrTrack issues for a project (FerrTrack — issue tracker)',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
      page: z.number().int().min(1).optional().describe('Page number (default 1)'),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Items per page (default 25, max 100)'),
    },
    async ({ org_slug, project_slug, page, per_page }) => {
      const token = requireToken();
      const params = new URLSearchParams();
      if (page !== undefined) params.set('page', String(page));
      if (per_page !== undefined) params.set('per_page', String(per_page));
      const qs = params.toString();
      const issues = await apiRequest<Page<IssueWithDetails>>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/issues${qs ? `?${qs}` : ''}`,
        { token },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(issues, null, 2) }],
      };
    },
  );
}
