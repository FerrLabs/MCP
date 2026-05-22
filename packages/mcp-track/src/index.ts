#!/usr/bin/env node
import { runMcp } from '@ferrlabs/mcp-core';
import { registerIssueDetailsTool } from './tools/issue-details.js';
import { registerIssueTools } from './tools/issues.js';
import { registerCommentTools } from './tools/comments.js';
import { registerProjectTools } from './tools/projects.js';

runMcp({
  name: 'ferrlabs-track',
  version: '6.0.0',
  register: (server) => {
    registerProjectTools(server);
    registerIssueDetailsTool(server);
    registerIssueTools(server);
    registerCommentTools(server);
  },
}).catch((err: unknown) => {
  console.error('ferrlabs-mcp-track fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
