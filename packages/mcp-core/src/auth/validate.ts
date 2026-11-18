import { createHash } from 'node:crypto';
import { assertCredentialTarget } from '../api-client.js';
import { fetchWithTimeout } from '../http.js';

export type BearerVerdict = 'valid' | 'invalid' | 'unavailable';

export type BearerValidator = (token: string) => Promise<BearerVerdict>;

const DEFAULT_TTL_MS = 60_000;
const MAX_CACHED = 1_000;
const ORG_TOKEN_PREFIX = 'fft_';

async function probe(
  url: string,
  token: string,
  rejectedStatuses: readonly number[],
): Promise<BearerVerdict> {
  let status: number;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-token': token },
      redirect: 'manual',
    });
    status = res.status;
  } catch {
    return 'unavailable';
  }
  if (status >= 200 && status < 300) return 'valid';
  return rejectedStatuses.includes(status) ? 'invalid' : 'unavailable';
}

export function createBearerValidator(
  authServer: string,
  ttlMs: number = DEFAULT_TTL_MS,
): BearerValidator {
  const base = authServer.replace(/\/+$/, '');
  const meUrl = `${base}/auth/me`;
  const tokenInfoUrl = `${base}/auth/token-info`;
  assertCredentialTarget(meUrl);
  assertCredentialTarget(tokenInfoUrl);
  const accepted = new Map<string, number>();

  return async (token) => {
    const key = createHash('sha256').update(token).digest('hex');
    const expiresAt = accepted.get(key);
    if (expiresAt !== undefined) {
      if (expiresAt > Date.now()) return 'valid';
      accepted.delete(key);
    }

    let verdict = await probe(meUrl, token, [401, 403]);
    if (verdict === 'invalid' && token.startsWith(ORG_TOKEN_PREFIX)) {
      verdict = await probe(tokenInfoUrl, token, [401, 403, 404]);
    }

    if (verdict === 'valid') {
      if (accepted.size >= MAX_CACHED) accepted.delete(accepted.keys().next().value!);
      accepted.set(key, Date.now() + ttlMs);
    }
    return verdict;
  };
}
