import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { startStdioServer, startHttpServer } = vi.hoisted(() => ({
  startStdioServer: vi.fn(async () => {}),
  startHttpServer: vi.fn(async () => {}),
}));

vi.mock('../transports/stdio.js', () => ({ startStdioServer }));
vi.mock('../transports/http.js', () => ({ startHttpServer }));

import { runMcp } from '../runner.js';

describe('runMcp', () => {
  const originalArgv = process.argv;
  let written: string[];

  beforeEach(() => {
    written = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    });
    startStdioServer.mockClear();
    startHttpServer.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(['--version', '-v'])(
    'prints name and version for %s without starting a transport',
    async (flag) => {
      process.argv = ['node', 'index.js', flag];
      const register = vi.fn();

      await runMcp({ name: 'ferrtrack', version: '1.2.3', register });

      expect(written).toEqual(['ferrtrack 1.2.3\n']);
      expect(register).not.toHaveBeenCalled();
      expect(startStdioServer).not.toHaveBeenCalled();
      expect(startHttpServer).not.toHaveBeenCalled();
    },
  );

  it('starts the stdio transport when no version flag is passed', async () => {
    vi.stubEnv('FERRLABS_MCP_MODE', 'stdio');
    process.argv = ['node', 'index.js'];
    const register = vi.fn();

    await runMcp({ name: 'ferrtrack', version: '1.2.3', register });

    expect(written).toEqual([]);
    expect(register).toHaveBeenCalledOnce();
    expect(startStdioServer).toHaveBeenCalledOnce();
  });
});
