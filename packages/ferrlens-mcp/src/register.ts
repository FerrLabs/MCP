import type { McpServer } from '@ferrlabs/mcp-core';
import { registerDnsTools } from './tools/dns.js';
import { registerEmailTools } from './tools/email.js';
import { registerWebTools } from './tools/web.js';
import { registerSeoTools } from './tools/seo.js';
import { registerShareTools } from './tools/shares.js';

export function register(server: McpServer): void {
  registerDnsTools(server);
  registerEmailTools(server);
  registerWebTools(server);
  registerSeoTools(server);
  registerShareTools(server);
}
