import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';
import { GROWTH_API_URL } from '../api-base.js';

interface Form {
  id: string;
  site_id: string;
  name: string;
  fields: Array<{ name: string; type: string; required: boolean }>;
  created_at: string;
  updated_at: string;
}

interface FormSubmission {
  id: string;
  form_id: string;
  values: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export function registerFormTools(server: McpServer) {
  server.tool(
    'list_forms',
    'List forms attached to a FerrGrowth site.',
    {
      site_id: z.string().min(1).describe('Site id or slug'),
    },
    async ({ site_id }) => {
      const token = await getToken();
      const forms = await apiRequest<Form[]>(`/v1/sites/${encodeURIComponent(site_id)}/forms`, {
        token,
        baseUrl: GROWTH_API_URL,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(forms, null, 2) }],
      };
    },
  );

  server.tool(
    'list_form_submissions',
    'List submissions for a FerrGrowth form, most recent first.',
    {
      site_id: z.string().min(1).describe('Site id or slug'),
      form_id: z.string().min(1).describe('Form id'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Max submissions to return (default 50).'),
    },
    async ({ site_id, form_id, limit }) => {
      const token = await getToken();
      const qs = limit !== undefined ? `?limit=${limit}` : '';
      const subs = await apiRequest<FormSubmission[]>(
        `/v1/sites/${encodeURIComponent(site_id)}/forms/${encodeURIComponent(form_id)}/submissions${qs}`,
        { token, baseUrl: GROWTH_API_URL },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(subs, null, 2) }],
      };
    },
  );
}
