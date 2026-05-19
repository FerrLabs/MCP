import { describe, it, expect, beforeEach } from 'vitest';

describe('per-request bearer token takes precedence over env/persisted', () => {
  beforeEach(() => {
    delete process.env.FERRLABS_API_TOKEN;
    delete process.env.FERRFLOW_API_TOKEN;
    process.env.FERRLABS_MCP_NO_PERSIST = '1';
    process.env.FERRLABS_MCP_NO_OAUTH = '1';
  });

  it('returns the bearer from AuthContext when set', async () => {
    const { runWithAuthContext } = await import('../context.js');
    const { getToken } = await import('../index.js');
    const result = await runWithAuthContext({ bearerToken: 'fl_req_token' }, () => getToken());
    expect(result).toBe('fl_req_token');
  });

  it('bearer from context wins over FERRLABS_API_TOKEN env', async () => {
    process.env.FERRLABS_API_TOKEN = 'fl_env';
    const { runWithAuthContext } = await import('../context.js');
    const { getToken } = await import('../index.js');
    const result = await runWithAuthContext({ bearerToken: 'fl_req' }, () => getToken());
    expect(result).toBe('fl_req');
  });

  it('falls back to env when context has no bearer', async () => {
    process.env.FERRLABS_API_TOKEN = 'fl_env_only';
    const { runWithAuthContext } = await import('../context.js');
    const { getToken } = await import('../index.js');
    const result = await runWithAuthContext({}, () => getToken());
    expect(result).toBe('fl_env_only');
  });
});
