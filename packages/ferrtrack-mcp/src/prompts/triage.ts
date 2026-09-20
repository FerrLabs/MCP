import { z } from 'zod';
import type { McpServer } from '@ferrlabs/mcp-core';

export function registerTriagePrompt(server: McpServer) {
  server.prompt(
    'triage_backlog',
    'Walk a FerrTrack project backlog and propose a triage decision per issue.',
    {
      project_slug: z.string().min(1).describe('Project slug'),
      limit: z.string().optional().describe('Max issues to consider (default 50).'),
    },
    ({ project_slug, limit }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Triage the open backlog of the FerrTrack project \`${project_slug}\`.`,
              '',
              `Start by reading \`ferrtrack://project/${project_slug}/issues\`, or call \`list_issues\` with status=open${
                limit ? ` and limit=${limit}` : ''
              } if the resource is not attached.`,
              '',
              'For each issue, propose one of: keep as is, change kind, change status, assign, or close as stale. Give the reason in one sentence, and say which field you would set.',
              '',
              'Group the output by decision rather than listing issues in order, so the ones needing the same action can be applied together. Flag separately any issue whose title or body does not say what would make it done: those need a question back to the author, not a triage decision.',
              '',
              'Do not call `update_issue` yet. Propose the batch first and wait for approval.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
