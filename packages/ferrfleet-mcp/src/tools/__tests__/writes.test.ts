import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ZodTypeAny } from 'zod';
import type { McpServer } from '@ferrlabs/mcp-core';

process.env.FERRLABS_API_TOKEN = 'test-token';

type Handler = (
  params: Record<string, unknown>,
) => Promise<{ isError?: boolean; content: { text?: string }[] }>;

const handlers = new Map<string, Handler>();
const schemas = new Map<string, Record<string, ZodTypeAny>>();
const mockServer = {
  tool: vi.fn(
    (name: string, _desc: string, schema: Record<string, ZodTypeAny>, handler: Handler) => {
      handlers.set(name, handler);
      schemas.set(name, schema);
    },
  ),
} as unknown as McpServer;

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(body: unknown = { id: 'run-1', status: 'queued' }): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function lastCall(): {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
} {
  const [url, init] = mockFetch.mock.calls[0];
  return {
    url: String(url),
    method: init.method ?? 'GET',
    body: init.body ? JSON.parse(init.body) : undefined,
    headers: init.headers as Record<string, string>,
  };
}

const FLEET = 'https://api.ferrfleet.com';

describe('ferrfleet tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    handlers.clear();
    schemas.clear();
    mockFetch.mockResolvedValue(ok());
    const { registerAgentTools } = await import('../agents.js');
    const { registerRunTools } = await import('../runs.js');
    registerAgentTools(mockServer);
    registerRunTools(mockServer);
  });

  it('every call goes to the FerrFleet API', async () => {
    await handlers.get('list_agents')!({});
    expect(lastCall().url.startsWith(FLEET)).toBe(true);
    expect(lastCall().url).not.toContain('api.ferrlabs.com');
  });

  it('negotiates the contract by date header, since the API has no version prefix', async () => {
    await handlers.get('list_agents')!({});

    const call = lastCall();
    expect(call.url).toBe(`${FLEET}/agents`);
    expect(call.url).not.toContain('/v1/');
    expect(call.headers['x-ferrfleet-api-version']).toBe('2026-08-04');
  });

  it('trigger_agent_run posts to the agent runs collection', async () => {
    await handlers.get('trigger_agent_run')!({ agent_id: 'a1', reason: 'nightly' });

    const call = lastCall();
    expect(call.url).toBe(`${FLEET}/agents/a1/runs`);
    expect(call.method).toBe('POST');
    expect(call.body).toEqual({ input: {}, reason: 'nightly' });
  });

  it('trigger_agent_run defaults input and reason rather than omitting them', async () => {
    await handlers.get('trigger_agent_run')!({ agent_id: 'a1' });
    expect(lastCall().body).toEqual({ input: {}, reason: null });
  });

  it('get_run_transcript reads the transcript sub-resource', async () => {
    await handlers.get('get_run_transcript')!({ run_id: 'run-9' });

    const call = lastCall();
    expect(call.url).toBe(`${FLEET}/runs/run-9/transcript`);
    expect(call.method).toBe('GET');
  });

  it('list_runs passes limit as a query parameter, not a path segment', async () => {
    await handlers.get('list_runs')!({ limit: 10 });
    expect(lastCall().url).toBe(`${FLEET}/runs?limit=10`);
  });

  it('list_runs omits the query string entirely when no limit is given', async () => {
    await handlers.get('list_runs')!({});
    expect(lastCall().url).toBe(`${FLEET}/runs`);
  });

  it('escapes an agent id so it cannot climb the path', async () => {
    await handlers.get('get_agent')!({ agent_id: '../runs' });
    expect(lastCall().url).toBe(`${FLEET}/agents/..%2Fruns`);
  });

  it('rejects a run limit outside the declared bounds', () => {
    const limit = schemas.get('list_runs')!.limit;
    expect(limit.safeParse(25).success).toBe(true);
    expect(limit.safeParse(0).success).toBe(false);
    expect(limit.safeParse(101).success).toBe(false);
  });

  it('update_agent patches the agent with only the fields given', async () => {
    await handlers.get('update_agent')!({ agent_id: 'a1', runner_mode: 'external' });

    const call = lastCall();
    expect(call.url).toBe(`${FLEET}/agents/a1`);
    expect(call.method).toBe('PATCH');
    expect(call.body).toEqual({ runner_mode: 'external' });
  });

  it('update_agent keeps falsy values that are real changes', async () => {
    await handlers.get('update_agent')!({
      agent_id: 'a1',
      enabled: false,
      model: '',
      additional_prompt: '',
    });
    expect(lastCall().body).toEqual({ enabled: false, model: '', additional_prompt: '' });
  });

  it('update_agent refuses an empty update without calling the API', async () => {
    const result = await handlers.get('update_agent')!({ agent_id: 'a1' });

    expect(result).toMatchObject({ isError: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('update_agent only accepts the runner modes the API knows', () => {
    const mode = schemas.get('update_agent')!.runner_mode;
    expect(mode.safeParse('managed').success).toBe(true);
    expect(mode.safeParse('external').success).toBe(true);
    expect(mode.safeParse('hybrid').success).toBe(false);
    expect(mode.safeParse('External').success).toBe(false);
  });

  it('update_agent escapes the agent id', async () => {
    await handlers.get('update_agent')!({ agent_id: '../runs', enabled: true });
    expect(lastCall().url).toBe(`${FLEET}/agents/..%2Fruns`);
  });
});
