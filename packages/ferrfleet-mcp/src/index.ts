#!/usr/bin/env node
import { runMcp, readPackageVersion } from '@ferrlabs/mcp-core';
import { registerAgentTools } from './tools/agents.js';
import { registerRunTools } from './tools/runs.js';
import { registerRunReviewPrompt } from './prompts/run-review.js';

runMcp({
  name: 'ferrfleet',
  version: readPackageVersion(import.meta.url),
  register: (server) => {
    registerAgentTools(server);
    registerRunTools(server);
    registerRunReviewPrompt(server);
  },
}).catch((err: unknown) => {
  console.error('ferrfleet-mcp fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
