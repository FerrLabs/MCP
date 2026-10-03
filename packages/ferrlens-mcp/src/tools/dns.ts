import { z } from 'zod';
import type { McpServer } from '@ferrlabs/mcp-core';
import { lensPost } from '../api-base.js';
import { domain } from './schemas.js';

const PROPAGATION_KINDS = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'] as const;

export function registerDnsTools(server: McpServer) {
  server.tool(
    'dns_lookup',
    'Resolve the DNS records of a domain (A, AAAA, CNAME, MX, TXT, NS, SOA, SRV), grouped by type.',
    { domain },
    ({ domain }) => lensPost('/v1/dns/lookup', { domain }),
  );

  server.tool(
    'dns_propagation',
    'Query one record type for a domain against several public resolvers worldwide, to see whether a change has propagated.',
    {
      domain,
      kind: z.enum(PROPAGATION_KINDS).optional().describe('Record type, defaults to A'),
    },
    ({ domain, kind }) => lensPost('/v1/dns/propagation', { domain, kind }),
  );

  server.tool(
    'reverse_dns',
    'Reverse DNS (PTR) lookup for an IPv4 or IPv6 address.',
    { ip: z.string().min(1).max(64).describe('IPv4 or IPv6 address') },
    ({ ip }) => lensPost('/v1/dns/reverse', { ip }),
  );
}
