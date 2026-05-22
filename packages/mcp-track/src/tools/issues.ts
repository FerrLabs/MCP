import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';

interface IssueSummary {
  id: string;
  number: number;
  title: string;
  state: string;
  author_id: string;
  assignee_id: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export function registerIssueTools(server: McpServer) {
  server.tool(
    'list_issues',
    'List FerrTrack issues in a project. Supports filtering by state, label, and assignee, plus a pagination limit.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
      state: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter by issue state (default open).'),
      label: z.string().optional().describe('Only return issues carrying this label name.'),
      assignee_id: z.string().optional().describe('Only return issues assigned to this user id.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Max issues to return (default 30).'),
    },
    async ({ org_slug, project_slug, state, label, assignee_id, limit }) => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (state) params.set('state', state);
      if (label) params.set('label', label);
      if (assignee_id) params.set('assignee_id', assignee_id);
      if (limit !== undefined) params.set('limit', String(limit));
      const qs = params.toString() ? `?${params.toString()}` : '';
      const issues = await apiRequest<IssueSummary[]>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/issues${qs}`,
        { token },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(issues, null, 2) }],
      };
    },
  );

  server.tool(
    'create_issue',
    'Create a new FerrTrack issue. Returns the newly assigned issue number.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
      title: z.string().min(1).max(255).describe('Issue title'),
      body: z.string().optional().describe('Issue body (markdown).'),
      labels: z.array(z.string()).optional().describe('Label names to apply on creation.'),
      assignee_id: z.string().optional().describe('User id to assign on creation.'),
    },
    async ({ org_slug, project_slug, title, body, labels, assignee_id }) => {
      const token = await getToken();
      const issue = await apiRequest<IssueSummary>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/issues`,
        {
          token,
          method: 'POST',
          body: {
            title,
            body: body ?? null,
            labels: labels ?? [],
            assignee_id: assignee_id ?? null,
          },
        },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.tool(
    'update_issue',
    'Patch a FerrTrack issue — change title/body, flip state (open↔closed), or update labels/assignee. Only fields you pass are touched.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      project_slug: z.string().min(1).describe('Project slug'),
      number: z.number().int().min(1).describe('Issue number'),
      title: z.string().min(1).max(255).optional(),
      body: z.string().optional(),
      state: z.enum(['open', 'closed']).optional(),
      labels: z.array(z.string()).optional(),
      assignee_id: z.string().nullable().optional().describe('Pass null to unassign.'),
    },
    async ({ org_slug, project_slug, number, ...patch }) => {
      const token = await getToken();
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) body[k] = v;
      }
      const issue = await apiRequest<IssueSummary>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/projects/${encodeURIComponent(project_slug)}/issues/${number}`,
        { token, method: 'PATCH', body },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(issue, null, 2) }],
      };
    },
  );
}
