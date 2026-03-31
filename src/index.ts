#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStatsTools } from "./tools/stats.js";
import { registerEventsTools } from "./tools/events.js";
import { registerTokenTools } from "./tools/tokens.js";
import { registerConfigTools } from "./tools/config.js";
import { registerTagsTools } from "./tools/tags.js";
import { registerChangelogTools } from "./tools/changelog.js";

const server = new McpServer({
  name: "ferrflow",
  version: "1.1.0",
});

registerStatsTools(server);
registerEventsTools(server);
registerTokenTools(server);
registerConfigTools(server);
registerTagsTools(server);
registerChangelogTools(server);

const useStdio = process.argv.includes("--stdio");

if (useStdio) {
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );
  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );
  const { createServer } = await import("node:http");

  const PORT = parseInt(process.env.PORT ?? "3001", 10);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  const httpServer = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200);
      res.end("ok");
      return;
    }
    transport.handleRequest(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(`MCP server listening on port ${PORT}`);
  });
}
