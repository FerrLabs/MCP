#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerStatsTools } from './tools/stats.js';
import { registerEventsTools } from './tools/events.js';
import { registerTokenTools } from './tools/tokens.js';
import { registerConfigTools } from './tools/config.js';
import { registerTagsTools } from './tools/tags.js';
import { registerChangelogTools } from './tools/changelog.js';
import { registerDryRunTools } from './tools/dry-run.js';
import { registerValidateTools } from './tools/validate.js';
import { registerOrgsTools } from './tools/orgs.js';
import { registerVaultsTools } from './tools/vaults.js';
import { registerIssuesTools } from './tools/issues.js';
import { registerSubscriptionsTools } from './tools/subscriptions.js';

const server = new McpServer({
  name: 'ferrlabs',
  version: '4.0.0',
});

registerStatsTools(server);
registerEventsTools(server);
registerTokenTools(server);
registerConfigTools(server);
registerTagsTools(server);
registerChangelogTools(server);
registerDryRunTools(server);
registerValidateTools(server);
registerOrgsTools(server);
registerVaultsTools(server);
registerIssuesTools(server);
registerSubscriptionsTools(server);

const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
const transport = new StdioServerTransport();
await server.connect(transport);
