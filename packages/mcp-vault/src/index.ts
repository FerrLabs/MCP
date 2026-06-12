#!/usr/bin/env node
import { runMcp, readPackageVersion } from '@ferrlabs/mcp-core';
import { registerVaultDetailsTool } from './tools/vault-details.js';
import { registerSecretTools } from './tools/secrets.js';
import { registerVaultAuditTools } from './tools/audit.js';
import { registerVaultMutationTools } from './tools/vaults.js';
import { registerSecretMutationTools } from './tools/secret-mutations.js';

runMcp({
  name: 'ferrlabs-vault',
  version: readPackageVersion(import.meta.url),
  register: (server) => {
    registerVaultDetailsTool(server);
    registerSecretTools(server);
    registerVaultAuditTools(server);
    registerVaultMutationTools(server);
    registerSecretMutationTools(server);
  },
}).catch((err: unknown) => {
  console.error('ferrlabs-mcp-vault fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
