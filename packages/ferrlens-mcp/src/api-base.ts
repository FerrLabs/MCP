import { apiRequest, toToolText } from '@ferrlabs/mcp-core';

export const LENS_API_URL = process.env.FERRLENS_API_URL ?? 'https://api.ferrlens.com';

const API_VERSION_HEADER = 'x-ferrlens-api-version';

export const LENS_API_VERSION = process.env.FERRLENS_API_VERSION ?? '2026-08-04';

interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
}

async function lensRequest(
  path: string,
  init: { method: 'GET' } | { method: 'POST'; body: Record<string, unknown> },
): Promise<ToolResult> {
  const result = await apiRequest<unknown>(path, {
    ...init,
    baseUrl: LENS_API_URL,
    headers: { [API_VERSION_HEADER]: LENS_API_VERSION },
  });
  return { content: [{ type: 'text', text: toToolText(result) }] };
}

export function lensPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
  return lensRequest(path, { method: 'POST', body });
}

export function lensGet(path: string): Promise<ToolResult> {
  return lensRequest(path, { method: 'GET' });
}
