import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir, platform } from 'node:os';

interface PersistedToken {
  token: string;
  obtained_at: string;
  scopes?: string[];
}

function defaultTokenPath(): string {
  const override = process.env.FERRLABS_MCP_TOKEN_PATH;
  if (override) return override;

  const home = homedir();
  switch (platform()) {
    case 'win32':
      return join(
        process.env.APPDATA ?? join(home, 'AppData', 'Roaming'),
        'ferrlabs',
        'mcp',
        'token.json',
      );
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'ferrlabs', 'mcp', 'token.json');
    default:
      return join(
        process.env.XDG_CONFIG_HOME ?? join(home, '.config'),
        'ferrlabs',
        'mcp',
        'token.json',
      );
  }
}

export async function readPersistedToken(): Promise<string | null> {
  if (process.env.FERRLABS_MCP_NO_PERSIST === '1') return null;
  try {
    const raw = await readFile(defaultTokenPath(), 'utf8');
    const parsed = JSON.parse(raw) as PersistedToken;
    if (typeof parsed.token === 'string' && parsed.token.length > 0) {
      return parsed.token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writePersistedToken(token: string, scopes?: string[]): Promise<void> {
  if (process.env.FERRLABS_MCP_NO_PERSIST === '1') return;
  const path = defaultTokenPath();
  await mkdir(dirname(path), { recursive: true });
  const payload: PersistedToken = {
    token,
    obtained_at: new Date().toISOString(),
    scopes,
  };
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
  if (platform() !== 'win32') {
    try {
      await chmod(path, 0o600);
    } catch {
      // ignore — best effort on platforms that don't support POSIX modes
    }
  }
}

export async function clearPersistedToken(): Promise<void> {
  const { unlink } = await import('node:fs/promises');
  try {
    await unlink(defaultTokenPath());
  } catch {
    // ignore
  }
}
