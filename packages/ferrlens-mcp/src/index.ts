#!/usr/bin/env node
import { runMcp, readPackageVersion } from '@ferrlabs/mcp-core';
import { register } from './register.js';

runMcp({
  name: 'ferrlens',
  version: readPackageVersion(import.meta.url),
  requireBearer: false,
  register,
}).catch((err: unknown) => {
  console.error('ferrlens-mcp fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
