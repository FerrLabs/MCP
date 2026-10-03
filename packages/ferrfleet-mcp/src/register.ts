import type { McpServer } from '@ferrlabs/mcp-core';
import { registerAgentTools } from './tools/agents.js';
import { registerRunTools } from './tools/runs.js';
import { registerRunReviewPrompt } from './prompts/run-review.js';

export function register(server: McpServer): void {
  registerAgentTools(server);
  registerRunTools(server);
  registerRunReviewPrompt(server);
}
