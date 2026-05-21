import { z } from 'zod';
import { apiRequest, getToken, type McpServer } from '@ferrlabs/mcp-core';
import { FLEET_API_URL } from '../api-base.js';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  first_party_for_product: string | null;
  created_at: string;
  updated_at: string;
}

export function registerAgentTools(server: McpServer) {
  server.tool(
    'list_agents',
    'List FerrFleet agents available to the authenticated user (marketplace + custom).',
    {},
    async () => {
      const token = await getToken();
      const agents = await apiRequest<Agent[]>('/v1/agents', { token, baseUrl: FLEET_API_URL });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(agents, null, 2) }],
      };
    },
  );

  server.tool(
    'get_agent',
    'Get full details of a FerrFleet agent (manifest, scopes, last run).',
    {
      agent_id: z.string().min(1).describe('Agent id'),
    },
    async ({ agent_id }) => {
      const token = await getToken();
      const agent = await apiRequest<Agent>(`/v1/agents/${encodeURIComponent(agent_id)}`, {
        token,
        baseUrl: FLEET_API_URL,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(agent, null, 2) }],
      };
    },
  );
}
