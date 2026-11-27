import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const runMcp = vi.fn();
const readPackageVersion = vi.fn(() => '9.9.9');

vi.mock('@ferrlabs/mcp-core', () => ({ runMcp, readPackageVersion }));

describe('mcp entrypoint', () => {
  const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.resetModules();
    runMcp.mockReset();
    exit.mockClear();
    errorLog.mockClear();
  });

  afterEach(() => {
    runMcp.mockReset();
  });

  it('starts the server named ferrlabs with the package version and the register hook', async () => {
    runMcp.mockResolvedValue(undefined);

    await import('../index.js');
    const { register } = await import('../register.js');

    expect(runMcp).toHaveBeenCalledOnce();
    expect(runMcp).toHaveBeenCalledWith({ name: 'ferrlabs', version: '9.9.9', register });
    expect(exit).not.toHaveBeenCalled();
  });

  it('logs the message and exits 1 when startup fails with an Error', async () => {
    runMcp.mockRejectedValue(new Error('port in use'));

    await import('../index.js');

    expect(errorLog).toHaveBeenCalledWith('ferrlabs-mcp fatal:', 'port in use');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('logs a non-Error rejection as is and exits 1', async () => {
    runMcp.mockRejectedValue('boom');

    await import('../index.js');

    expect(errorLog).toHaveBeenCalledWith('ferrlabs-mcp fatal:', 'boom');
    expect(exit).toHaveBeenCalledWith(1);
  });
});
