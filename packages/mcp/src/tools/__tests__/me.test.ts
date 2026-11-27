import { describe, it, expect, beforeEach } from 'vitest';
import { createToolHarness, lastRequest, makeResponse, mockFetch } from './harness.js';
import { registerMeTools } from '../me.js';

const harness = createToolHarness();

describe('me tools', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    registerMeTools(harness.server);
  });

  it('registers the four self-service tools', () => {
    expect(harness.names()).toEqual(
      expect.arrayContaining([
        'update_me',
        'list_my_sessions',
        'revoke_my_session',
        'export_my_account',
      ]),
    );
  });

  it('update_me patches /auth/me with only the fields provided', async () => {
    mockFetch.mockResolvedValue(makeResponse({ id: 'u1', timezone: 'Europe/Paris' }));

    const result = await harness.call('update_me', {
      timezone: 'Europe/Paris',
      display_name: undefined,
      avatar_url: null,
    });

    const req = lastRequest();
    expect(req.url).toMatch(/\/auth\/me$/);
    expect(req.method).toBe('PATCH');
    expect(req.headers['x-api-token']).toBe('test-token');
    expect(req.body).toEqual({ timezone: 'Europe/Paris', avatar_url: null });
    expect(result.content[0].text).toContain('Europe/Paris');
  });

  it('update_me sends an empty body when nothing is patched', async () => {
    mockFetch.mockResolvedValue(makeResponse({ id: 'u1' }));

    await harness.call('update_me', {});

    expect(lastRequest().body).toEqual({});
  });

  it('list_my_sessions reads /me/sessions with the token', async () => {
    mockFetch.mockResolvedValue(makeResponse([{ id: 's1', current: true }]));

    const result = await harness.call('list_my_sessions');

    const req = lastRequest();
    expect(req.url).toMatch(/\/me\/sessions$/);
    expect(req.method).toBe('GET');
    expect(req.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(result.content[0].text ?? '')).toEqual([{ id: 's1', current: true }]);
  });

  it('revoke_my_session deletes the escaped session id and confirms', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await harness.call('revoke_my_session', { session_id: 'a/b c' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/me\/sessions\/a%2Fb%20c$/);
    expect(req.method).toBe('DELETE');
    expect(result.content[0].text).toBe('Session a/b c revoked.');
  });

  it('revoke_my_session surfaces an API failure instead of confirming', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'nope' }, 403));

    await expect(harness.call('revoke_my_session', { session_id: 's1' })).rejects.toThrow();
  });

  it('export_my_account returns the bundle and flags truncation with a hint', async () => {
    process.env.FERRLABS_MCP_MAX_TOOL_BYTES = '50';
    try {
      mockFetch.mockResolvedValue(makeResponse({ data: 'x'.repeat(500) }));

      const result = await harness.call('export_my_account');

      expect(lastRequest().url).toMatch(/\/auth\/me\/export$/);
      expect(result.content[0].text).toContain('[truncated:');
      expect(result.content[0].text).toContain('Export the account from app.ferrlabs.com');
    } finally {
      delete process.env.FERRLABS_MCP_MAX_TOOL_BYTES;
    }
  });

  it('export_my_account returns the whole bundle when small', async () => {
    mockFetch.mockResolvedValue(makeResponse({ email: 'a@b.c' }));

    const result = await harness.call('export_my_account');

    expect(result.content[0].text).toBe('{"email":"a@b.c"}');
  });
});
