import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "./api-client.js";

const API_TOKEN = process.env.FERRFLOW_API_TOKEN;

function requireToken(): string {
  if (!API_TOKEN) {
    throw new Error("FERRFLOW_API_TOKEN environment variable is required for authenticated operations.");
  }
  return API_TOKEN;
}

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

interface CreateTokenResponse {
  token: ApiTokenResponse;
  plaintext_token: string;
}

export function registerTokenTools(server: McpServer) {
  server.tool("get_me", "Get the current authenticated user profile", {}, async () => {
    const token = requireToken();
    const user = await apiRequest<UserProfile>("/auth/me", { token });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(user, null, 2),
        },
      ],
    };
  });

  server.tool("list_tokens", "List all API tokens for the authenticated user", {}, async () => {
    const token = requireToken();
    const tokens = await apiRequest<ApiTokenResponse[]>("/tokens", { token });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(tokens, null, 2),
        },
      ],
    };
  });

  server.tool(
    "create_token",
    "Create a new API token",
    {
      name: z.string().min(1).max(100).describe("Token name"),
      scopes: z.array(z.string()).describe('Token scopes (e.g. ["*"] for all)'),
      expires_at: z.string().optional().describe("Expiration date (ISO 8601)"),
    },
    async ({ name, scopes, expires_at }) => {
      const token = requireToken();
      const result = await apiRequest<CreateTokenResponse>("/tokens", {
        method: "POST",
        body: { name, scopes, expires_at },
        token,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Token created: ${result.plaintext_token}\n\nThis is the only time the full token will be shown. Store it securely.\n\n${JSON.stringify(result.token, null, 2)}`,
          },
        ],
      };
    },
  );

  server.tool(
    "revoke_token",
    "Revoke an API token by ID",
    {
      token_id: z.string().uuid().describe("Token ID to revoke"),
    },
    async ({ token_id }) => {
      const token = requireToken();
      await apiRequest<{ message: string }>(`/tokens/${token_id}/revoke`, {
        method: "POST",
        token,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Token ${token_id} revoked successfully.`,
          },
        ],
      };
    },
  );
}
