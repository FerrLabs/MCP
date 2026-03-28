import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { registerStatsTools } from "./tools/stats.js";
import { registerEventsTools } from "./tools/events.js";
import { registerTokenTools } from "./tools/tokens.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const server = new McpServer({
  name: "ferrflow",
  version: "0.2.0",
});

registerStatsTools(server);
registerEventsTools(server);
registerTokenTools(server);

const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
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
