import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest } from '@ferrlabs/mcp-core';
import { getToken } from '@ferrlabs/mcp-core';

interface UserProfile {
  id: string;
  email: string;
  email_verified: boolean;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
}

interface ApiTokenResponse {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

type CreateTokenResponse = ApiTokenResponse & {
  plaintext: string;
};

export function registerTokenTools(server: McpServer) {
  server.tool('get_me', 'Get the current authenticated FerrLabs user profile', {}, async () => {
    const token = await getToken();
    const user = await apiRequest<UserProfile>('/auth/me', { token });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(user, null, 2),
        },
      ],
    };
  });

  server.tool('list_tokens', 'List all API tokens for the authenticated user', {}, async () => {
    const token = await getToken();
    const tokens = await apiRequest<ApiTokenResponse[]>('/auth/tokens', { token });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(tokens, null, 2),
        },
      ],
    };
  });

  server.tool(
    'create_token',
    'Create a new FerrLabs API token (requires an interactive session, not a token)',
    {
      name: z.string().min(1).max(100).describe('Token name'),
      scopes: z.array(z.string()).describe('Token scopes (e.g. ["*"] for all)'),
      expires_at: z.string().optional().describe('Expiration date (ISO 8601)'),
    },
    async ({ name, scopes, expires_at }) => {
      const token = await getToken();
      const result = await apiRequest<CreateTokenResponse>('/auth/tokens', {
        method: 'POST',
        body: { name, scopes, expires_at },
        token,
      });
      const { plaintext, ...meta } = result;
      return {
        content: [
          {
            type: 'text' as const,
            text: `Token created: ${plaintext}\n\nThis is the only time the full token will be shown. Store it securely.\n\n${JSON.stringify(meta, null, 2)}`,
          },
        ],
      };
    },
  );

  server.tool(
    'revoke_token',
    'Revoke a FerrLabs API token by ID',
    {
      token_id: z.string().uuid().describe('Token ID to revoke'),
    },
    async ({ token_id }) => {
      const token = await getToken();
      await apiRequest<{ message: string }>(`/auth/tokens/${token_id}`, {
        method: 'DELETE',
        token,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Token ${token_id} revoked successfully.`,
          },
        ],
      };
    },
  );
}
