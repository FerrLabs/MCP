import { clearPersistedToken } from './auth/persistence.js';
import { clearTokenCache } from './auth/index.js';
import { fetchWithTimeout } from './http.js';

const DEFAULT_API_URL = process.env.API_URL ?? 'https://api.ferrlabs.com';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  /**
   * Override the API base URL for this call. Sub-MCPs targeting per-product
   * APIs (e.g. `api.ferrgrowth.com`, `api.ferrfleet.com`) set this on each
   * tool call. Falls back to `API_URL` env var, then `api.ferrlabs.com`.
   */
  baseUrl?: string;
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, baseUrl } = options;
  const base = baseUrl ?? DEFAULT_API_URL;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ferrlabs-mcp/4.0.0',
  };

  if (token) {
    headers['x-api-token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetchWithTimeout(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (res.status === 401 && token) {
    await clearPersistedToken();
    clearTokenCache();
    throw new UnauthorizedError(
      'Stored token rejected by the FerrLabs API (likely revoked, expired, or issued under an incompatible format). The token has been cleared — retry the call to trigger a fresh OAuth login.',
    );
  }

  const raw = await res.text();
  let data: unknown = undefined;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`API non-JSON response (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }
  }

  if (!res.ok) {
    const errMsg =
      (data as { error?: string; message?: string } | undefined)?.error ??
      (data as { error?: string; message?: string } | undefined)?.message ??
      `API error: HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return data as T;
}
