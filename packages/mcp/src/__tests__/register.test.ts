import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { register } from '../register.js';

describe('register', () => {
  const tool = vi.fn();
  const registerResource = vi.fn();
  register({ tool, registerResource } as unknown as McpServer);
  const toolNames = tool.mock.calls.map(([name]) => name as string);
  const resourceNames = registerResource.mock.calls.map(([name]) => name as string);

  it('registers no duplicate tool names', () => {
    expect(new Set(toolNames).size).toBe(toolNames.length);
  });

  it.each([
    'get_stats',
    'health_check',
    'get_me',
    'create_token',
    'create_org_token',
    'list_orgs',
    'list_projects',
    'get_org',
    'update_me',
    'list_vaults',
    'list_issues',
    'list_subscriptions',
    'cancel_subscription',
    'fetch_docs',
  ])('registers the %s tool', (name) => {
    expect(toolNames).toContain(name);
  });

  it('registers the org resources', () => {
    expect(resourceNames).toEqual(['org-overview', 'org-usage']);
  });
});
