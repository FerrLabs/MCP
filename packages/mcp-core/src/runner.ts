import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { startHttpServer } from './transports/http.js';
import { startStdioServer } from './transports/stdio.js';

export interface RunMcpOptions {
  name: string;
  version: string;
  register: (server: McpServer) => void;
}

function buildServer(opts: RunMcpOptions): McpServer {
  const server = new McpServer({ name: opts.name, version: opts.version });
  opts.register(server);
  return server;
}

export async function runMcp(opts: RunMcpOptions): Promise<void> {
  const mode =
    process.env.FERRLABS_MCP_MODE ?? (process.argv.includes('--http') ? 'http' : 'stdio');

  if (mode === 'http') {
    await startHttpServer({
      port: Number(process.env.PORT ?? '3000'),
      host: process.env.HOST,
      stateless: process.env.FERRLABS_MCP_STATEFUL !== '1',
      createServer: () => buildServer(opts),
    });
    return;
  }

  await startStdioServer(buildServer(opts));
}
