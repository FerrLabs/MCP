import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

if (!existsSync(SERVER_ENTRY)) {
  console.error(`mcp dist not found at ${SERVER_ENTRY}. Run 'pnpm build' first.`);
  process.exit(2);
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface ContentBlock {
  type: string;
  text?: string;
}

interface ToolResult {
  content?: ContentBlock[];
  isError?: boolean;
}

interface ToolDescriptor {
  name: string;
  description?: string;
}

const TIMEOUT_MS = 10_000;
const child = spawn(process.execPath, [SERVER_ENTRY], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env },
});

let nextId = 1;
const pending = new Map<number, (msg: JsonRpcResponse) => void>();
let buffer = '';

child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk: string) => {
  buffer += chunk;
  let newlineIdx: number;
  while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newlineIdx).trim();
    buffer = buffer.slice(newlineIdx + 1);
    if (!line) continue;
    let msg: JsonRpcResponse;
    try {
      msg = JSON.parse(line);
    } catch {
      console.error(`Non-JSON line from server: ${line}`);
      continue;
    }
    const cb = pending.get(msg.id);
    if (cb) {
      pending.delete(msg.id);
      cb(msg);
    }
  }
});

function rpc<T>(method: string, params?: unknown): Promise<T> {
  const id = nextId++;
  const req: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };
  return new Promise<T>((resolveP, rejectP) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectP(new Error(`Timeout waiting for response to ${method}`));
    }, TIMEOUT_MS);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      if (msg.error) {
        rejectP(new Error(`${method} failed: ${msg.error.message}`));
        return;
      }
      resolveP(msg.result as T);
    });
    child.stdin.write(JSON.stringify(req) + '\n');
  });
}

function shutdown(code: number): never {
  child.stdin.end();
  child.kill();
  process.exit(code);
}

const checks: { name: string; ok: boolean; detail: string }[] = [];

async function run(): Promise<void> {
  const init = await rpc<{ serverInfo: { name: string; version: string } }>('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'ferrlabs-mcp-smoke', version: '1.0.0' },
  });
  checks.push({
    name: 'initialize handshake',
    ok: init.serverInfo.name === 'ferrlabs',
    detail: `serverInfo: ${init.serverInfo.name}@${init.serverInfo.version}`,
  });

  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const list = await rpc<{ tools: ToolDescriptor[] }>('tools/list');
  const names = new Set(list.tools.map((t) => t.name));
  const expected = [
    'get_stats',
    'health_check',
    'fetch_docs',
    'get_me',
    'list_tokens',
    'list_orgs',
    'list_projects',
    'list_vaults',
    'list_issues',
    'list_subscriptions',
  ];
  const missing = expected.filter((n) => !names.has(n));
  checks.push({
    name: 'tools/list',
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${list.tools.length} tools registered`
        : `missing: ${missing.join(', ')}`,
  });

  const health = await rpc<ToolResult>('tools/call', { name: 'health_check', arguments: {} });
  const healthText = health.content?.[0]?.text ?? '';
  let healthOk = false;
  try {
    const parsed = JSON.parse(healthText);
    healthOk = parsed.status === 'ready' || parsed.status === 'ok';
  } catch {
    healthOk = false;
  }
  checks.push({
    name: 'tools/call health_check',
    ok: healthOk && !health.isError,
    detail: healthOk ? healthText.slice(0, 80) : `unexpected response: ${healthText.slice(0, 120)}`,
  });

  const stats = await rpc<ToolResult>('tools/call', { name: 'get_stats', arguments: {} });
  const statsText = stats.content?.[0]?.text ?? '';
  let statsOk = false;
  try {
    const parsed = JSON.parse(statsText);
    statsOk =
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).total_releases === 'number';
  } catch {
    statsOk = false;
  }
  checks.push({
    name: 'tools/call get_stats',
    ok: statsOk && !stats.isError,
    detail: statsOk
      ? `total_releases=${JSON.parse(statsText).total_releases}`
      : `unexpected response: ${statsText.slice(0, 120)}`,
  });
}

run()
  .then(() => {
    let failed = 0;
    for (const c of checks) {
      const marker = c.ok ? 'PASS' : 'FAIL';
      console.log(`[${marker}] ${c.name} — ${c.detail}`);
      if (!c.ok) failed++;
    }
    console.log('');
    if (failed === 0) {
      console.log(`Smoke: ${checks.length}/${checks.length} OK`);
      shutdown(0);
    } else {
      console.error(`Smoke: ${failed}/${checks.length} FAILED`);
      shutdown(1);
    }
  })
  .catch((err: unknown) => {
    console.error('Smoke aborted:', err instanceof Error ? err.message : err);
    shutdown(1);
  });
