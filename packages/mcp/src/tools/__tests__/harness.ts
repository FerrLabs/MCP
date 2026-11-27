import { vi, type Mock } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.FERRLABS_API_TOKEN = 'test-token';

export interface ToolResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}

export type Handler = (params: Record<string, unknown>) => Promise<ToolResult>;

export const mockFetch: Mock = vi.fn();
vi.stubGlobal('fetch', mockFetch);

export function makeResponse(body: unknown, status = 200): Response {
  const text = body === undefined ? '' : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

export function createToolHarness() {
  const handlers = new Map<string, Handler>();
  const server = {
    tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: Handler) => {
      handlers.set(name, handler);
    }),
  } as unknown as McpServer;
  return {
    server,
    call: (name: string, params: Record<string, unknown> = {}) => {
      const handler = handlers.get(name);
      if (!handler) throw new Error(`tool not registered: ${name}`);
      return handler(params);
    },
    names: () => [...handlers.keys()],
  };
}

export function lastRequest() {
  const [url, init] = mockFetch.mock.calls.at(-1) as [string, RequestInit];
  const headers = init.headers as Record<string, string>;
  return {
    url,
    method: init.method,
    headers,
    body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
  };
}
