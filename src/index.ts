#!/usr/bin/env node
import { startStdioServer } from './transports/stdio.js';
import { startHttpServer } from './transports/http.js';

async function main(): Promise<void> {
  const mode =
    process.env.FERRLABS_MCP_MODE ?? (process.argv.includes('--http') ? 'http' : 'stdio');

  if (mode === 'http') {
    const port = Number(process.env.PORT ?? '3000');
    await startHttpServer({
      port,
      host: process.env.HOST,
      stateless: process.env.FERRLABS_MCP_STATEFUL !== '1',
    });
    return;
  }

  await startStdioServer();
}

main().catch((err: unknown) => {
  console.error('ferrlabs-mcp fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
