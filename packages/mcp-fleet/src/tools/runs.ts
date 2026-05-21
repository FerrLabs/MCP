import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';
import { FLEET_API_URL } from '../api-base.js';

interface Run {
  id: string;
  agent_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  triggered_by: string;
  created_at: string;
}

export function registerRunTools(server: McpServer) {
  server.tool(
    'list_runs',
    'List recent FerrFleet runs for the authenticated org (most recent first).',
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Max runs to return (default 25)'),
    },
    async ({ limit }) => {
      const token = await getToken();
      const qs = limit !== undefined ? `?limit=${limit}` : '';
      const runs = await apiRequest<Run[]>(`/v1/runs${qs}`, {
        token,
        baseUrl: FLEET_API_URL,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(runs, null, 2) }],
      };
    },
  );

  server.tool(
    'get_run',
    'Get details + transcript of a single FerrFleet run.',
    {
      run_id: z.string().min(1).describe('Run id'),
    },
    async ({ run_id }) => {
      const token = await getToken();
      const run = await apiRequest<Run>(`/v1/runs/${encodeURIComponent(run_id)}`, {
        token,
        baseUrl: FLEET_API_URL,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(run, null, 2) }],
      };
    },
  );
}
