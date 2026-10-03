import { z } from 'zod';
import type { McpServer } from '@ferrlabs/mcp-core';
import { lensPost } from '../api-base.js';
import { domain } from './schemas.js';

export function registerEmailTools(server: McpServer) {
  server.tool(
    'check_email_auth',
    'Check the email authentication of a domain: parsed SPF and DMARC records, DKIM keys found on common selectors, a score and notes.',
    { domain },
    ({ domain }) => lensPost('/v1/email/spf-dmarc', { domain }),
  );

  server.tool(
    'check_blacklist',
    'Check an IP address, or the first address a domain resolves to, against public DNS blocklists (DNSBL).',
    { target: z.string().min(1).max(253).describe('IPv4/IPv6 address or domain name') },
    ({ target }) => lensPost('/v1/email/blacklist', { target }),
  );

  server.tool(
    'verify_email',
    'Check an email address without sending mail: syntax, MX records of its domain, disposable provider and role account detection.',
    { email: z.string().min(1).max(320).describe('Email address') },
    ({ email }) => lensPost('/v1/email/verify', { email }),
  );
}
