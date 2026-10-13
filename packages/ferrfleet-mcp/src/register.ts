import type { McpServer } from '@ferrlabs/mcp-core';
import { registerAgentTools } from './tools/agents.js';
import { registerOrgTools } from './tools/orgs.js';
import { registerRepoTools } from './tools/repos.js';
import { registerRunnerPoolTools } from './tools/runner-pools.js';
import { registerRunTools } from './tools/runs.js';
import { registerRunReviewPrompt } from './prompts/run-review.js';

export function register(server: McpServer): void {
  registerAgentTools(server);
  registerOrgTools(server);
  registerRepoTools(server);
  registerRunnerPoolTools(server);
  registerRunTools(server);
  registerRunReviewPrompt(server);
}
