import { ResourceTemplate, toToolText, type McpServer } from '@ferrlabs/mcp-core';
import { fetchOrgOverview, fetchOrgUsage } from '../tools/org-admin.js';
import { listOrgSlugs } from '../tools/orgs.js';

async function listOrgResources(scheme: string, suffix: string) {
  const slugs = await listOrgSlugs();
  return {
    resources: slugs.map((slug) => ({
      uri: `${scheme}://org/${slug}/${suffix}`,
      name: `${slug} ${suffix}`,
      mimeType: 'application/json',
    })),
  };
}

export function registerOrgResources(server: McpServer) {
  server.registerResource(
    'org-overview',
    new ResourceTemplate('ferrlabs://org/{slug}/overview', {
      list: () => listOrgResources('ferrlabs', 'overview'),
    }),
    {
      title: 'Organization overview',
      description:
        'Member count, active subscriptions per product, pending invites and recent activity volume for one organization.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const overview = await fetchOrgOverview(String(slug));
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: toToolText(overview) }],
      };
    },
  );

  server.registerResource(
    'org-usage',
    new ResourceTemplate('ferrlabs://org/{slug}/usage', {
      list: () => listOrgResources('ferrlabs', 'usage'),
    }),
    {
      title: 'Organization usage',
      description:
        'Current-period metered usage across every product for one organization, with the limit for its tier.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const usage = await fetchOrgUsage(String(slug));
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: toToolText(usage) }],
      };
    },
  );
}
