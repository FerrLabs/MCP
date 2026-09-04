import { apiRequest } from '@ferrlabs/mcp-core';

export const FLEET_API_URL = process.env.FERRFLEET_API_URL ?? 'https://api.ferrfleet.com';

const API_VERSION_HEADER = 'x-ferrfleet-api-version';

export const FLEET_API_VERSION = process.env.FERRFLEET_API_VERSION ?? '2026-08-04';

interface FleetRequestOptions {
  method?: string;
  body?: unknown;
  token: string;
}

export function fleetRequest<T>(path: string, options: FleetRequestOptions): Promise<T> {
  const { token, ...rest } = options;
  return apiRequest<T>(path, {
    ...rest,
    token,
    baseUrl: FLEET_API_URL,
    headers: { [API_VERSION_HEADER]: FLEET_API_VERSION },
  });
}
