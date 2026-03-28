import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "./api-client.js";

interface PublicStats {
  total_releases: number;
  total_packages: number;
  total_users: number;
  total_bumps: number;
  total_checks: number;
  total_inits: number;
}

interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export function registerStatsTools(server: McpServer) {
  server.tool("get_stats", "Get public FerrFlow statistics (releases, packages, users, checks, inits)", {}, async () => {
    const stats = await apiRequest<PublicStats>("/stats");
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  });

  server.tool("health_check", "Check FerrFlow API health status", {}, async () => {
    const health = await apiRequest<HealthResponse>("/health");
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(health, null, 2),
        },
      ],
    };
  });
}
