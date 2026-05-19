import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.FERRLABS_API_TOKEN;
    delete process.env.FERRFLOW_API_TOKEN;
    delete process.env.FERRLABS_MCP_NO_OAUTH;
    process.env.FERRLABS_MCP_NO_PERSIST = '1';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns FERRLABS_API_TOKEN when set, without touching persistence or OAuth', async () => {
    process.env.FERRLABS_API_TOKEN = 'fl_env_token';
    const { getToken } = await import('../index.js');
    expect(await getToken()).toBe('fl_env_token');
  });

  it('falls back to FERRFLOW_API_TOKEN (legacy compat)', async () => {
    process.env.FERRFLOW_API_TOKEN = 'fl_legacy_token';
    const { getToken } = await import('../index.js');
    expect(await getToken()).toBe('fl_legacy_token');
  });

  it('throws when no token and FERRLABS_MCP_NO_OAUTH=1', async () => {
    process.env.FERRLABS_MCP_NO_OAUTH = '1';
    const { getToken } = await import('../index.js');
    await expect(getToken()).rejects.toThrow(/FERRLABS_API_TOKEN environment variable is required/);
  });

  it('caches the token across calls (env path)', async () => {
    process.env.FERRLABS_API_TOKEN = 'fl_cached';
    const { getToken } = await import('../index.js');
    const a = await getToken();
    process.env.FERRLABS_API_TOKEN = 'fl_changed';
    const b = await getToken();
    expect(a).toBe(b);
    expect(a).toBe('fl_cached');
  });
});
