import { readPersistedToken, writePersistedToken } from './persistence.js';
import { runLoopbackOauthFlow } from './oauth.js';
import { getRequestBearerToken } from './context.js';

let cached: string | null = null;
let inFlight: Promise<string> | null = null;

export async function getToken(): Promise<string> {
  const perRequest = getRequestBearerToken();
  if (perRequest) return perRequest;

  if (process.env.FERRLABS_MCP_MODE === 'http') {
    throw new Error('Bearer token required. Send `Authorization: Bearer fl_...` on each request.');
  }

  if (cached) return cached;

  const envToken = process.env.FERRLABS_API_TOKEN ?? process.env.FERRFLOW_API_TOKEN;
  if (envToken) {
    cached = envToken;
    return envToken;
  }

  const persisted = await readPersistedToken();
  if (persisted) {
    cached = persisted;
    return persisted;
  }

  if (process.env.FERRLABS_MCP_NO_OAUTH === '1') {
    throw new Error(
      'FERRLABS_API_TOKEN environment variable is required (FERRLABS_MCP_NO_OAUTH=1 disables the OAuth fallback).',
    );
  }

  if (!inFlight) {
    inFlight = (async () => {
      const { token } = await runLoopbackOauthFlow();
      await writePersistedToken(token);
      cached = token;
      return token;
    })().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

export function resetTokenCacheForTesting(): void {
  cached = null;
  inFlight = null;
}
