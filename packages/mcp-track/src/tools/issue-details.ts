import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';

interface IssueDetails {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  author_id: string;
  assignee_id: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export function registerIssueDetailsTool(server: McpServer) {
  server.tool(
    'get_issue',
    'Get the full content of a FerrTrack issue (title, body, state, labels, assignee).',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
      number: z.number().int().min(1).describe('Issue number'),
    },
    async ({ org_slug, project_slug, number }) => {
      const token = await getToken();
      const issue = await apiRequest<IssueDetails>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/issues/${number}`,
        { token },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(issue, null, 2) }],
      };
    },
  );
}
