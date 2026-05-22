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
    'Get the metadata of a single FerrFleet run (status, timing, agent, trigger). Use get_run_transcript for the captured output.',
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

  server.tool(
    'get_run_transcript',
    'Get the full captured transcript of a FerrFleet run — every event the runner emitted, in order. Heavy for long runs; consider get_run first to confirm the run is interesting before pulling the transcript.',
    {
      run_id: z.string().min(1).describe('Run id'),
    },
    async ({ run_id }) => {
      const token = await getToken();
      const transcript = await apiRequest<unknown>(
        `/v1/runs/${encodeURIComponent(run_id)}/transcript`,
        { token, baseUrl: FLEET_API_URL },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(transcript, null, 2) }],
      };
    },
  );
}
