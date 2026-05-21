#!/usr/bin/env node
import { runMcp } from '@ferrlabs/mcp-core';
import { registerIssueDetailsTool } from './tools/issue-details.js';
import { registerLabelTools } from './tools/labels.js';
import { registerCommentTools } from './tools/comments.js';

runMcp({
  name: 'ferrlabs-track',
  version: '6.0.0',
  register: (server) => {
    registerIssueDetailsTool(server);
    registerLabelTools(server);
    registerCommentTools(server);
  },
}).catch((err: unknown) => {
  console.error('ferrlabs-mcp-track fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
