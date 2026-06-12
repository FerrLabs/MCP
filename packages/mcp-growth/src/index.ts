#!/usr/bin/env node
import { runMcp, readPackageVersion } from '@ferrlabs/mcp-core';
import { registerSiteTools } from './tools/sites.js';
import { registerPageTools } from './tools/pages.js';
import { registerFormTools } from './tools/forms.js';
import { registerAnalyticsTools } from './tools/analytics.js';
import { registerSeoTools } from './tools/seo.js';
import { registerReleaseTools } from './tools/releases.js';

runMcp({
  name: 'ferrlabs-growth',
  version: readPackageVersion(import.meta.url),
  register: (server) => {
    registerSiteTools(server);
    registerPageTools(server);
    registerFormTools(server);
    registerAnalyticsTools(server);
    registerSeoTools(server);
    registerReleaseTools(server);
  },
}).catch((err: unknown) => {
  console.error('ferrlabs-mcp-growth fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
