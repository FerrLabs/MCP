import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  apiRequest,
  getToken,
  revealedSecretText,
  secretRevealRefusal,
  toToolText,
} from '@ferrlabs/mcp-core';

interface OrgToken {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  created_by: string | null;
  created_by_email: string | null;
  last_used_at: string | null;
  revoked: boolean;
  created_at: string;
  stale: boolean | null;
  no_expiry: boolean;
}

interface CreateOrgTokenResponse {
  token: OrgToken;
  plaintext: string;
}

function tokensBase(orgSlug: string): string {
  return `/orgs/${encodeURIComponent(orgSlug)}/tokens`;
}

export function registerOrgTokenTools(server: McpServer) {
  server.tool(
    'list_org_tokens',
    'List the API tokens of an organization (prefix, scopes, creator, last use, revoked). Never returns the secret.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
    },
    async ({ org_slug }) => {
      const token = await getToken();
      const tokens = await apiRequest<OrgToken[]>(tokensBase(org_slug), { token });
      return { content: [{ type: 'text' as const, text: toToolText(tokens) }] };
    },
  );

  server.tool(
    'create_org_token',
    'Create an organization API token (admin or owner). Disabled unless FERRLABS_MCP_ALLOW_TOKEN_REVEAL=1, because the API shows the secret exactly once and returning it here writes it into the conversation transcript.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      name: z.string().min(1).max(100).describe('Token name'),
      scopes: z.array(z.string()).min(1).describe('Token scopes (at least one)'),
      owner: z
        .enum(['creator', 'org'])
        .optional()
        .describe('creator: tied to you. org: no human holder, for machine-to-machine calls'),
      expires_at: z
        .string()
        .datetime()
        .optional()
        .describe('Expiration date (ISO 8601, in the future). Omitted: the token never expires'),
    },
    async ({ org_slug, name, scopes, owner, expires_at }) => {
      const refusal = secretRevealRefusal({
        action: 'create an organization API token',
        instead: 'Create the token from app.ferrlabs.com → Settings → API Tokens',
      });
      if (refusal) return refusal;

      const token = await getToken();
      const { plaintext, token: created } = await apiRequest<CreateOrgTokenResponse>(
        tokensBase(org_slug),
        {
          method: 'POST',
          body: { name, scopes, owner, expires_at },
          token,
        },
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: revealedSecretText({
              label: 'Organization token created',
              secret: plaintext,
              revokeTool: 'revoke_org_token',
              details: toToolText(created),
            }),
          },
        ],
      };
    },
  );

  server.tool(
    'revoke_org_token',
    'Revoke an organization API token by id (admin or owner). Irreversible; anything using it loses access.',
    {
      org_slug: z.string().min(1).describe('Organization slug'),
      token_id: z.string().uuid().describe('Token id to revoke'),
    },
    async ({ org_slug, token_id }) => {
      const token = await getToken();
      await apiRequest<void>(`${tokensBase(org_slug)}/${encodeURIComponent(token_id)}`, {
        method: 'DELETE',
        token,
      });
      return {
        content: [{ type: 'text' as const, text: `Token ${token_id} revoked in ${org_slug}.` }],
      };
    },
  );
}
