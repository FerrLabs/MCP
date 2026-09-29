const LOOPBACK_HOSTNAMES = ['127.0.0.1', 'localhost', '[::1]'];

export class HttpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HttpConfigError';
  }
}

export interface PublicEndpoint {
  publicUrl: string;
  allowedHosts: string[];
}

export function hostnameOf(hostHeader: string): string | undefined {
  if (hostHeader.length === 0 || /[\s/?#@\\]/.test(hostHeader)) return undefined;
  try {
    return new URL(`http://${hostHeader}`).hostname;
  } catch {
    return undefined;
  }
}

export function isHostAllowed(hostHeader: string | undefined, allowedHosts: string[]): boolean {
  if (!hostHeader) return false;
  const hostname = hostnameOf(hostHeader);
  return hostname !== undefined && allowedHosts.includes(hostname);
}

export function isLoopback(bindHost: string): boolean {
  return [...LOOPBACK_HOSTNAMES, '::1'].includes(bindHost);
}

function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpConfigError(`FERRLABS_MCP_PUBLIC_URL is not a valid URL: ${raw}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new HttpConfigError(`FERRLABS_MCP_PUBLIC_URL must be http or https, got ${url.protocol}`);
  }
  return url;
}

function parseAllowedHosts(entries: string[]): string[] {
  return entries.map((entry) => {
    const hostname = hostnameOf(entry);
    if (hostname === undefined) {
      throw new HttpConfigError(`FERRLABS_MCP_ALLOWED_HOSTS has an invalid entry: ${entry}`);
    }
    return hostname;
  });
}

export function resolvePublicEndpoint(opts: {
  publicUrl: string | undefined;
  allowedHosts: string[];
  bindHost: string;
  port: number;
}): PublicEndpoint {
  const explicitHosts = parseAllowedHosts(opts.allowedHosts);

  if (opts.publicUrl) {
    const url = parsePublicUrl(opts.publicUrl);
    return {
      publicUrl: url.origin,
      allowedHosts: explicitHosts.length > 0 ? explicitHosts : [url.hostname],
    };
  }

  if (isLoopback(opts.bindHost)) {
    return {
      publicUrl: `http://127.0.0.1:${opts.port}`,
      allowedHosts: explicitHosts.length > 0 ? explicitHosts : LOOPBACK_HOSTNAMES,
    };
  }

  throw new HttpConfigError(
    `The HTTP transport is bound to ${opts.bindHost}, so it needs FERRLABS_MCP_PUBLIC_URL, the URL clients reach it at (e.g. https://mcp.ferrlabs.com). It is advertised as the OAuth resource and its host becomes the default Host allowlist.`,
  );
}
