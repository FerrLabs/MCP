#!/usr/bin/env node
import { runMcp, readPackageVersion } from '@ferrlabs/mcp-core';
import { register } from './register.js';

runMcp({
  name: 'ferrlabs',
  version: readPackageVersion(import.meta.url),
  register,
}).catch((err: unknown) => {
  console.error('ferrlabs-mcp fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
