import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "./api-client.js";

export function registerEventsTools(server: McpServer) {
  server.tool(
    "record_event",
    "Record an analytics event (release, check, init, or error)",
    {
      event_type: z.enum(["release", "check", "init", "error"]).describe("Type of event"),
      package_name: z.string().optional().describe("Package name"),
      package_version: z.string().optional().describe("Package version"),
      metadata: z.record(z.string(), z.unknown()).optional().describe("Additional metadata (max 1KB)"),
    },
    async ({ event_type, package_name, package_version, metadata }) => {
      await apiRequest<undefined>("/events", {
        method: "POST",
        body: { event_type, package_name, package_version, metadata },
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Event "${event_type}" recorded successfully.`,
          },
        ],
      };
    },
  );
}
