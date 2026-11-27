import { describe, it, expect, beforeEach } from 'vitest';
import { createToolHarness, lastRequest, makeResponse, mockFetch } from './harness.js';
import { fetchOrgOverview, fetchOrgUsage, registerOrgAdminTools } from '../org-admin.js';

const harness = createToolHarness();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(makeResponse({ ok: true }));
  registerOrgAdminTools(harness.server);
});

describe('org fetch helpers', () => {
  it('fetchOrgOverview reads the escaped overview path with the token', async () => {
    mockFetch.mockResolvedValue(makeResponse({ member_count: 3 }));

    const overview = await fetchOrgOverview('a b');

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/a%20b\/overview$/);
    expect(req.headers['x-api-token']).toBe('test-token');
    expect(overview).toEqual({ member_count: 3 });
  });

  it('fetchOrgUsage reads the usage path', async () => {
    mockFetch.mockResolvedValue(makeResponse({ products: [] }));

    expect(await fetchOrgUsage('acme')).toEqual({ products: [] });
    expect(lastRequest().url).toMatch(/\/orgs\/acme\/usage$/);
  });
});

describe('org read tools', () => {
  it.each([
    ['get_org', ''],
    ['get_org_overview', '/overview'],
    ['get_org_usage', '/usage'],
    ['list_org_members', '/members'],
    ['list_teams', '/teams'],
  ])('%s reads /orgs/<slug>%s', async (tool, suffix) => {
    const result = await harness.call(tool, { org_slug: 'acme' });

    const req = lastRequest();
    expect(req.url).toMatch(new RegExp(`/orgs/acme${suffix}$`));
    expect(req.method).toBe('GET');
    expect(req.headers['x-api-token']).toBe('test-token');
    expect(result.content[0].text).toBe('{"ok":true}');
  });

  it('list_org_audit omits the limit when not given', async () => {
    await harness.call('list_org_audit', { org_slug: 'acme' });

    expect(lastRequest().url).toMatch(/\/orgs\/acme\/audit$/);
  });

  it('list_org_audit forwards the limit', async () => {
    await harness.call('list_org_audit', { org_slug: 'acme', limit: 20 });

    expect(lastRequest().url).toMatch(/\/orgs\/acme\/audit\?limit=20$/);
  });

  it('list_org_audit tells the model to pass a smaller limit when truncated', async () => {
    process.env.FERRLABS_MCP_MAX_TOOL_BYTES = '40';
    try {
      mockFetch.mockResolvedValue(makeResponse([{ action: 'x'.repeat(300) }]));

      const result = await harness.call('list_org_audit', { org_slug: 'acme' });

      expect(result.content[0].text).toContain('[truncated:');
      expect(result.content[0].text).toContain('Pass a smaller limit.');
    } finally {
      delete process.env.FERRLABS_MCP_MAX_TOOL_BYTES;
    }
  });
});

describe('update_org', () => {
  it('maps new_slug to slug and includes the name', async () => {
    await harness.call('update_org', { org_slug: 'acme', name: 'Acme Inc', new_slug: 'acme-inc' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme$/);
    expect(req.method).toBe('PATCH');
    expect(req.body).toEqual({ name: 'Acme Inc', slug: 'acme-inc' });
  });

  it('sends only the name when no new slug is given', async () => {
    await harness.call('update_org', { org_slug: 'acme', name: 'Acme Inc' });

    expect(lastRequest().body).toEqual({ name: 'Acme Inc' });
  });

  it('sends only the slug when no name is given', async () => {
    await harness.call('update_org', { org_slug: 'acme', new_slug: 'acme-2' });

    expect(lastRequest().body).toEqual({ slug: 'acme-2' });
  });
});

describe('member tools', () => {
  it('invite_org_member posts email and role', async () => {
    await harness.call('invite_org_member', {
      org_slug: 'acme',
      email: 'ada@example.com',
      role: 'admin',
    });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/invitations$/);
    expect(req.method).toBe('POST');
    expect(req.body).toEqual({ email: 'ada@example.com', role: 'admin' });
  });

  it('update_org_member_role patches the escaped user id', async () => {
    await harness.call('update_org_member_role', {
      org_slug: 'acme',
      user_id: 'u/1',
      role: 'viewer',
    });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/members\/u%2F1$/);
    expect(req.method).toBe('PATCH');
    expect(req.body).toEqual({ role: 'viewer' });
  });

  it('remove_org_member deletes and confirms', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await harness.call('remove_org_member', { org_slug: 'acme', user_id: 'u1' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/members\/u1$/);
    expect(req.method).toBe('DELETE');
    expect(result.content[0].text).toBe('User u1 removed from acme.');
  });

  it('remove_org_member does not confirm on a forbidden response', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'forbidden' }, 403));

    await expect(
      harness.call('remove_org_member', { org_slug: 'acme', user_id: 'u1' }),
    ).rejects.toThrow();
  });
});

describe('team tools', () => {
  it('create_team posts the name and a null description by default', async () => {
    await harness.call('create_team', { org_slug: 'acme', name: 'Platform' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/teams$/);
    expect(req.method).toBe('POST');
    expect(req.body).toEqual({ name: 'Platform', description: null });
  });

  it('create_team forwards the description', async () => {
    await harness.call('create_team', { org_slug: 'acme', name: 'Platform', description: 'infra' });

    expect(lastRequest().body).toEqual({ name: 'Platform', description: 'infra' });
  });

  it('update_team drops undefined fields but keeps an explicit null description', async () => {
    await harness.call('update_team', {
      org_slug: 'acme',
      team_id: 't1',
      name: undefined,
      description: null,
    });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/teams\/t1$/);
    expect(req.method).toBe('PATCH');
    expect(req.body).toEqual({ description: null });
  });

  it('delete_team deletes the escaped team and confirms', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await harness.call('delete_team', { org_slug: 'acme', team_id: 't 1' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/teams\/t%201$/);
    expect(req.method).toBe('DELETE');
    expect(result.content[0].text).toBe('Team t 1 deleted.');
  });

  it('add_team_member posts the user id', async () => {
    await harness.call('add_team_member', { org_slug: 'acme', team_id: 't1', user_id: 'u1' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/teams\/t1\/members$/);
    expect(req.method).toBe('POST');
    expect(req.body).toEqual({ user_id: 'u1' });
  });

  it('remove_team_member deletes the member and confirms', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await harness.call('remove_team_member', {
      org_slug: 'acme',
      team_id: 't1',
      user_id: 'u/1',
    });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/teams\/t1\/members\/u%2F1$/);
    expect(req.method).toBe('DELETE');
    expect(result.content[0].text).toBe('User u/1 removed from team t1.');
  });
});
