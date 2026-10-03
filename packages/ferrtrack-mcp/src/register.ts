import type { McpServer } from '@ferrlabs/mcp-core';
import { registerIssueDetailsTool } from './tools/issue-details.js';
import { registerIssueTools } from './tools/issues.js';
import { registerCommentTools } from './tools/comments.js';
import { registerProjectTools } from './tools/projects.js';
import { registerCycleTools } from './tools/cycles.js';
import { registerMilestoneTools } from './tools/milestones.js';
import { registerSearchTools } from './tools/search.js';
import { registerIssueResources } from './resources/issues.js';
import { registerTriagePrompt } from './prompts/triage.js';

export function register(server: McpServer): void {
  registerProjectTools(server);
  registerIssueDetailsTool(server);
  registerIssueTools(server);
  registerCommentTools(server);
  registerCycleTools(server);
  registerMilestoneTools(server);
  registerSearchTools(server);
  registerIssueResources(server);
  registerTriagePrompt(server);
}
