import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const server = new McpServer({
  name: "ferrflow",
  version: "0.1.0",
});

const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
await server.connect(transport);

const httpServer = createServer((req, res) => {
  transport.handleRequest(req, res);
});

httpServer.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
});
