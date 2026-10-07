import { ApiRequestError, toToolText } from '@ferrlabs/mcp-core';

export interface ToolResult {
  [key: string]: unknown;
  content: [{ type: 'text'; text: string }];
  isError?: true;
}

export function textResult(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: toToolText(value) }] };
}

function redact(message: string, secret: string | undefined): string {
  return secret ? message.split(secret).join('[redacted]') : message;
}

function describe(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const code = err.code ? ` ${err.code}` : '';
    return `FerrVault API error (HTTP ${err.status}${code}): ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

function errorResult(err: unknown, secret?: string): ToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: redact(describe(err), secret) }],
  };
}

export async function guarded(
  run: () => Promise<ToolResult>,
  secret?: string,
): Promise<ToolResult> {
  try {
    return await run();
  } catch (err) {
    return errorResult(err, secret);
  }
}
