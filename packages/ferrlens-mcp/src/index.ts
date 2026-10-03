#!/usr/bin/env node
import { runMcp, readPackageVersion } from '@ferrlabs/mcp-core';
import { registerDnsTools } from './tools/dns.js';
import { registerEmailTools } from './tools/email.js';
import { registerWebTools } from './tools/web.js';
import { registerSeoTools } from './tools/seo.js';
import { registerShareTools } from './tools/shares.js';

runMcp({
  name: 'ferrlens',
  version: readPackageVersion(import.meta.url),
  requireBearer: false,
  register: (server) => {
    registerDnsTools(server);
    registerEmailTools(server);
    registerWebTools(server);
    registerSeoTools(server);
    registerShareTools(server);
  },
}).catch((err: unknown) => {
  console.error('ferrlens-mcp fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
