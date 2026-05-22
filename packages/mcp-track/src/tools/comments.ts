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

  server.tool(
    'create_issue_comment',
    'Post a new comment on a FerrTrack issue. Body supports markdown.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
      number: z.number().int().min(1).describe('Issue number'),
      body: z.string().min(1).describe('Comment body (markdown).'),
    },
    async ({ org_slug, project_slug, number, body }) => {
      const token = await getToken();
      const comment = await apiRequest<Comment>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/issues/${number}/comments`,
        { token, method: 'POST', body: { body } },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(comment, null, 2) }],
      };
    },
  );
}
