#!/usr/bin/env node
import { runMcp } from '@ferrlabs/mcp-core';
import { registerStatsTools } from './tools/stats.js';
import { registerTokenTools } from './tools/tokens.js';
import { registerOrgsTools } from './tools/orgs.js';
import { registerVaultsTools } from './tools/vaults.js';
import { registerIssuesTools } from './tools/issues.js';
import { registerSubscriptionsTools } from './tools/subscriptions.js';
import { registerDocsTools } from './tools/docs.js';

runMcp({
  name: 'ferrlabs',
  version: '5.2.5',
  register: (server) => {
    registerStatsTools(server);
    registerTokenTools(server);
    registerOrgsTools(server);
    registerVaultsTools(server);
    registerIssuesTools(server);
    registerSubscriptionsTools(server);
    registerDocsTools(server);
  },
}).catch((err: unknown) => {
  console.error('ferrlabs-mcp fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
