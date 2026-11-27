import { describe, it, expect, beforeEach } from 'vitest';
import { createToolHarness, lastRequest, makeResponse, mockFetch } from './harness.js';
import { registerStatsTools } from '../stats.js';

const harness = createToolHarness();

describe('stats tools', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    registerStatsTools(harness.server);
  });

  it('get_stats hits /stats anonymously', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ total_releases: 1, total_repos: 2, total_commits_analyzed: 3 }),
    );

    const result = await harness.call('get_stats');

    const req = lastRequest();
    expect(req.url).toMatch(/\/stats$/);
    expect(req.headers['x-api-token']).toBeUndefined();
    expect(req.headers.Authorization).toBeUndefined();
    expect(JSON.parse(result.content[0].text ?? '')).toEqual({
      total_releases: 1,
      total_repos: 2,
      total_commits_analyzed: 3,
    });
  });

  it('health_check hits /health anonymously and returns the status', async () => {
    mockFetch.mockResolvedValue(makeResponse({ status: 'ok', service: 'api', version: '1.0.0' }));

    const result = await harness.call('health_check');

    const req = lastRequest();
    expect(req.url).toMatch(/\/health$/);
    expect(req.headers['x-api-token']).toBeUndefined();
    expect(result.content[0].text).toContain('"status":"ok"');
  });

  it('health_check propagates a failing API', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'down' }, 503));

    await expect(harness.call('health_check')).rejects.toThrow();
  });
});
