import { z } from 'zod';
import type { McpServer } from '@ferrlabs/mcp-core';
import { lensGet } from '../api-base.js';

export function registerShareTools(server: McpServer) {
  server.tool(
    'get_share',
    'Read a published FerrLens result snapshot by its share id (the last segment of a ferrlens.com share link): tool kind, input and result.',
    { id: z.string().min(1).max(64).describe('Share id') },
    ({ id }) => lensGet(`/v1/shares/${encodeURIComponent(id)}`),
  );
}
