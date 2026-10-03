import { z } from 'zod';
import type { McpServer } from '@ferrlabs/mcp-core';
import { lensPost } from '../api-base.js';
import { domain, publicUrl } from './schemas.js';

const CORS_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;

export function registerWebTools(server: McpServer) {
  server.tool(
    'get_http_headers',
    'Fetch a URL and return the status, response headers, timing and every redirect hop.',
    { url: publicUrl },
    ({ url }) => lensPost('/v1/http/headers', { url }),
  );

  server.tool(
    'check_security_headers',
    'Grade the security headers of a URL (HSTS, CSP, X-Frame-Options, Referrer-Policy and others) with a score and a note per header.',
    { url: publicUrl },
    ({ url }) => lensPost('/v1/http/sec-headers', { url }),
  );

  server.tool(
    'get_page_meta',
    'Extract the title and every meta tag of a page, grouped (Open Graph, Twitter, SEO, other).',
    { url: publicUrl },
    ({ url }) => lensPost('/v1/web/meta', { url }),
  );

  server.tool(
    'preview_open_graph',
    'Build the social card a page would show when shared (Open Graph with Twitter and HTML fallbacks) and list missing or weak fields.',
    { url: publicUrl },
    ({ url }) => lensPost('/v1/web/og-preview', { url }),
  );

  server.tool(
    'check_mixed_content',
    'List the http:// resources an https page loads, which browsers block or flag as mixed content.',
    { url: publicUrl },
    ({ url }) => lensPost('/v1/web/mixed-content', { url }),
  );

  server.tool(
    'check_cors',
    'Test the CORS policy of a URL for a given origin and method: sends the preflight when one is needed, then the actual request, and explains each check.',
    {
      url: publicUrl,
      origin: z.string().min(1).max(2048).describe('Origin to test, e.g. https://app.example.com'),
      method: z.enum(CORS_METHODS).optional().describe('HTTP method, defaults to GET'),
    },
    ({ url, origin, method }) => lensPost('/v1/web/cors', { url, origin, method }),
  );

  server.tool(
    'search_certificates',
    'Search Certificate Transparency logs for TLS certificates issued for a domain and its subdomains (newest 200, with issuer, SANs and validity).',
    { domain },
    ({ domain }) => lensPost('/v1/web/ct-search', { domain }),
  );
}
