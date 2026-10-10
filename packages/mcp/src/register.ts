import type { McpServer } from '@ferrlabs/mcp-core';
import { registerStatsTools } from './tools/stats.js';
import { registerTokenTools } from './tools/tokens.js';
import { registerOrgTokenTools } from './tools/org-tokens.js';
import { registerOrgsTools } from './tools/orgs.js';
import { registerOrgAdminTools } from './tools/org-admin.js';
import { registerMeTools } from './tools/me.js';
import { registerVaultsTools } from './tools/vaults.js';
import { registerIssuesTools } from './tools/issues.js';
import { registerSubscriptionsTools } from './tools/subscriptions.js';
import { registerDocsTools } from './tools/docs.js';
import { registerOrgResources } from './resources/orgs.js';

export function register(server: McpServer): void {
  registerStatsTools(server);
  registerTokenTools(server);
  registerOrgTokenTools(server);
  registerOrgsTools(server);
  registerOrgAdminTools(server);
  registerMeTools(server);
  registerVaultsTools(server);
  registerIssuesTools(server);
  registerSubscriptionsTools(server);
  registerDocsTools(server);
  registerOrgResources(server);
}
