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

interface SubscriptionRow {
  id: string;
  product: string;
  tier: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export function registerSubscriptionsTools(server: McpServer) {
  server.tool(
    'list_subscriptions',
    'List FerrLabs product subscriptions for an organization (FerrVault, FerrTrack, FerrGrowth, FerrFleet)',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
    },
    async ({ org_slug }) => {
      const token = requireToken();
      const subs = await apiRequest<SubscriptionRow[]>(
        `/v1/orgs/${encodeURIComponent(org_slug)}/subscriptions`,
        { token },
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(subs, null, 2) }],
      };
    },
  );
}
