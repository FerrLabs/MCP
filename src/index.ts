#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerStatsTools } from './tools/stats.js';
import { registerTokenTools } from './tools/tokens.js';
import { registerOrgsTools } from './tools/orgs.js';
import { registerVaultsTools } from './tools/vaults.js';
import { registerIssuesTools } from './tools/issues.js';
import { registerSubscriptionsTools } from './tools/subscriptions.js';
import { registerDocsTools } from './tools/docs.js';

const server = new McpServer({
  name: 'ferrlabs',
  version: '4.0.0',
});

registerStatsTools(server);
registerTokenTools(server);
registerOrgsTools(server);
registerVaultsTools(server);
registerIssuesTools(server);
registerSubscriptionsTools(server);
registerDocsTools(server);

const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
const transport = new StdioServerTransport();
await server.connect(transport);
