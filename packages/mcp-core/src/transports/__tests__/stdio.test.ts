import { describe, it, expect, vi } from 'vitest';

const connect = vi.fn();
const transportInstance = { kind: 'stdio-transport' };

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(function () {
    return transportInstance;
  }),
}));

describe('startStdioServer', () => {
  it('connects the server to a stdio transport', async () => {
    const { startStdioServer } = await import('../stdio.js');
    connect.mockResolvedValue(undefined);
    await startStdioServer({ connect } as never);
    expect(connect).toHaveBeenCalledExactlyOnceWith(transportInstance);
  });

  it('propagates a failed connection', async () => {
    const { startStdioServer } = await import('../stdio.js');
    connect.mockRejectedValue(new Error('pipe closed'));
    await expect(startStdioServer({ connect } as never)).rejects.toThrow('pipe closed');
  });
});
