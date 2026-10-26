import { createHash } from 'node:crypto';
import { assertCredentialTarget } from '../api-client.js';
import { fetchWithTimeout } from '../http.js';

export type BearerVerdict = 'valid' | 'invalid' | 'unavailable';

export type BearerValidator = (token: string) => Promise<BearerVerdict>;

const DEFAULT_TTL_MS = 60_000;
const MAX_CACHED = 1_000;

export function createBearerValidator(
  authServer: string,
  ttlMs: number = DEFAULT_TTL_MS,
): BearerValidator {
  const meUrl = `${authServer.replace(/\/+$/, '')}/auth/me`;
  assertCredentialTarget(meUrl);
  const accepted = new Map<string, number>();

  return async (token) => {
    const key = createHash('sha256').update(token).digest('hex');
    const expiresAt = accepted.get(key);
    if (expiresAt !== undefined) {
      if (expiresAt > Date.now()) return 'valid';
      accepted.delete(key);
    }

    let status: number;
    try {
      const res = await fetchWithTimeout(meUrl, {
        headers: { Authorization: `Bearer ${token}`, 'x-api-token': token },
        redirect: 'manual',
      });
      status = res.status;
    } catch {
      return 'unavailable';
    }

    if (status >= 200 && status < 300) {
      if (accepted.size >= MAX_CACHED) accepted.delete(accepted.keys().next().value!);
      accepted.set(key, Date.now() + ttlMs);
      return 'valid';
    }
    if (status === 401 || status === 403) return 'invalid';
    return 'unavailable';
  };
}
