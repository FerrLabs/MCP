#!/usr/bin/env node
import { runMcp } from '@ferrlabs/mcp-core';
import { registerVaultDetailsTool } from './tools/vault-details.js';

runMcp({
  name: 'ferrlabs-vault',
  version: '5.2.5',
  register: (server) => {
    registerVaultDetailsTool(server);
  },
}).catch((err: unknown) => {
  console.error('ferrlabs-mcp-vault fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
