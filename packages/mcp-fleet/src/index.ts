#!/usr/bin/env node
import { runMcp } from '@ferrlabs/mcp-core';
import { registerAgentTools } from './tools/agents.js';
import { registerRunTools } from './tools/runs.js';

runMcp({
  name: 'ferrlabs-fleet',
  version: '6.0.0',
  register: (server) => {
    registerAgentTools(server);
    registerRunTools(server);
  },
}).catch((err: unknown) => {
  console.error('ferrlabs-mcp-fleet fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
