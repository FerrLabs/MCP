import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';

interface Comment {
  id: string;
  issue_number: number;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export function registerCommentTools(server: McpServer) {
  server.tool(
    'list_issue_comments',
    'List all comments on a FerrTrack issue.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
      number: z.number().int().min(1).describe('Issue number'),
    },
    async ({ org_slug, project_slug, number }) => {
      const token = await getToken();
      const comments = await apiRequest<Comment[]>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/issues/${number}/comments`,
        { token },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(comments, null, 2) }],
      };
    },
  );
}
