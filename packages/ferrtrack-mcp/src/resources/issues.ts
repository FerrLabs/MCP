import { ResourceTemplate, toToolText, type McpServer } from '@ferrlabs/mcp-core';
import { fetchProjectIssues } from '../tools/issues.js';
import { fetchProjects } from '../tools/projects.js';

export function registerIssueResources(server: McpServer) {
  server.registerResource(
    'project-issues',
    new ResourceTemplate('ferrtrack://project/{slug}/issues', {
      list: async () => {
        const projects = await fetchProjects();
        return {
          resources: projects.map((project) => ({
            uri: `ferrtrack://project/${project.slug}/issues`,
            name: `${project.slug} open issues`,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      title: 'Project issues',
      description:
        'Open issues in one FerrTrack project, newest first. Use the list_issues tool to filter by kind, assignee or a different status.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const issues = await fetchProjectIssues(String(slug));
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: toToolText(issues) }],
      };
    },
  );
}
