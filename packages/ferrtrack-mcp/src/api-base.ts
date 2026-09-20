import { apiRequest } from '@ferrlabs/mcp-core';

export const TRACK_API_URL = process.env.FERRTRACK_API_URL ?? 'https://api.ferrtrack.com';

const API_VERSION_HEADER = 'x-ferrtrack-api-version';

export const TRACK_API_VERSION = process.env.FERRTRACK_API_VERSION ?? '2026-08-04';

interface TrackRequestOptions {
  method?: string;
  body?: unknown;
  token: string;
}

export function trackRequest<T>(path: string, options: TrackRequestOptions): Promise<T> {
  const { token, ...rest } = options;
  return apiRequest<T>(path, {
    ...rest,
    token,
    baseUrl: TRACK_API_URL,
    headers: { [API_VERSION_HEADER]: TRACK_API_VERSION },
  });
}
