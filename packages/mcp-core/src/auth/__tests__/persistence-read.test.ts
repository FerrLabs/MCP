import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('persisted token read and clear', () => {
  const originalEnv = process.env;
  let dir: string;
  let path: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FERRLABS_MCP_NO_PERSIST;
    dir = mkdtempSync(join(tmpdir(), 'mcp-persist-read-'));
    path = join(dir, 'token.json');
    process.env.FERRLABS_MCP_TOKEN_PATH = path;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.doUnmock('node:os');
    vi.resetModules();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when no token file exists', async () => {
    const { readPersistedToken } = await import('../persistence.js');
    expect(await readPersistedToken()).toBeNull();
  });

  it.each([
    ['malformed json', '{not json'],
    ['a missing token field', JSON.stringify({ obtained_at: 'now' })],
    ['an empty token', JSON.stringify({ token: '' })],
    ['a non-string token', JSON.stringify({ token: 42 })],
  ])('returns null for %s', async (_label, content) => {
    writeFileSync(path, content);
    const { readPersistedToken } = await import('../persistence.js');
    expect(await readPersistedToken()).toBeNull();
  });

  it('neither reads nor writes when persistence is disabled', async () => {
    const { writePersistedToken, readPersistedToken } = await import('../persistence.js');
    await writePersistedToken('fl_secret');
    expect(await readPersistedToken()).toBe('fl_secret');

    process.env.FERRLABS_MCP_NO_PERSIST = '1';
    expect(await readPersistedToken()).toBeNull();
    rmSync(path);
    await writePersistedToken('fl_other');
    expect(existsSync(path)).toBe(false);
  });

  it('clearPersistedToken removes the file and tolerates a missing one', async () => {
    const { writePersistedToken, clearPersistedToken, readPersistedToken } =
      await import('../persistence.js');
    await writePersistedToken('fl_secret');
    await clearPersistedToken();
    expect(existsSync(path)).toBe(false);
    expect(await readPersistedToken()).toBeNull();
    await expect(clearPersistedToken()).resolves.toBeUndefined();
  });

  it('leaves no temp file behind and rethrows when the rename fails', async () => {
    mkdirSync(path);
    const { writePersistedToken } = await import('../persistence.js');
    await expect(writePersistedToken('fl_secret')).rejects.toThrow();
    const { readdirSync } = await import('node:fs');
    expect(readdirSync(dir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it.each([
    ['win32', { APPDATA: '/appdata' }, join('/appdata', 'ferrlabs', 'mcp', 'token.json')],
    ['win32', {}, join('/home/u', 'AppData', 'Roaming', 'ferrlabs', 'mcp', 'token.json')],
    [
      'darwin',
      {},
      join('/home/u', 'Library', 'Application Support', 'ferrlabs', 'mcp', 'token.json'),
    ],
    ['linux', { XDG_CONFIG_HOME: '/xdg' }, join('/xdg', 'ferrlabs', 'mcp', 'token.json')],
    ['linux', {}, join('/home/u', '.config', 'ferrlabs', 'mcp', 'token.json')],
  ])('default path on %s with %j', async (os, env, expected) => {
    delete process.env.FERRLABS_MCP_TOKEN_PATH;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.APPDATA;
    Object.assign(process.env, env);
    const reads: string[] = [];
    vi.resetModules();
    vi.doMock('node:os', () => ({ platform: () => os, homedir: () => '/home/u' }));
    vi.doMock('node:fs/promises', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs/promises')>();
      return {
        ...actual,
        readFile: (file: string) => {
          reads.push(file);
          return Promise.reject(new Error('absent'));
        },
      };
    });
    const { readPersistedToken } = await import('../persistence.js');
    await readPersistedToken();
    vi.doUnmock('node:fs/promises');
    expect(reads).toEqual([expected]);
  });
});
