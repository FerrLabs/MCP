import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';

const isPosix = platform() !== 'win32';

describe('writePersistedToken', () => {
  const originalEnv = process.env;
  let dir: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FERRLABS_MCP_NO_PERSIST;
    dir = mkdtempSync(join(tmpdir(), 'mcp-persist-'));
    process.env.FERRLABS_MCP_TOKEN_PATH = join(dir, 'nested', 'token.json');
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips the persisted token', async () => {
    const { writePersistedToken, readPersistedToken } = await import('../persistence.js');
    await writePersistedToken('fl_secret', ['read']);
    expect(await readPersistedToken()).toBe('fl_secret');
  });

  it.runIf(isPosix)('writes the token file with mode no broader than 0600', async () => {
    const { writePersistedToken } = await import('../persistence.js');
    const path = process.env.FERRLABS_MCP_TOKEN_PATH as string;
    await writePersistedToken('fl_secret');
    const mode = statSync(path).mode & 0o777;
    expect(mode & 0o177).toBe(0);
    expect(mode).toBe(0o600);
  });

  it.runIf(isPosix)('creates the parent directory with mode 0700', async () => {
    const { writePersistedToken } = await import('../persistence.js');
    const path = process.env.FERRLABS_MCP_TOKEN_PATH as string;
    await writePersistedToken('fl_secret');
    const dirMode = statSync(join(path, '..')).mode & 0o777;
    expect(dirMode & 0o077).toBe(0);
  });
});
