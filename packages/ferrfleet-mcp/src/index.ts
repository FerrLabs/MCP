#!/usr/bin/env node
import { runMcp, readPackageVersion } from '@ferrlabs/mcp-core';
import { registerAgentTools } from './tools/agents.js';
import { registerRunTools } from './tools/runs.js';

runMcp({
  name: 'ferrfleet',
  version: readPackageVersion(import.meta.url),
  register: (server) => {
    registerAgentTools(server);
    registerRunTools(server);
  },
}).catch((err: unknown) => {
  console.error('ferrfleet-mcp fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
