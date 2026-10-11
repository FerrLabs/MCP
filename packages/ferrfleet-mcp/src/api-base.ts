import { z } from 'zod';
import { apiRequest } from '@ferrlabs/mcp-core';

export const FLEET_API_URL = process.env.FERRFLEET_API_URL ?? 'https://api.ferrfleet.com';

const API_VERSION_HEADER = 'x-ferrfleet-api-version';
const ORG_HEADER = 'x-ferrfleet-org';

export const FLEET_API_VERSION = process.env.FERRFLEET_API_VERSION ?? '2026-08-04';

interface FleetRequestOptions {
  method?: string;
  body?: unknown;
  token: string;
}

function orgHeader(): Record<string, string> {
  const orgId = process.env.FERRFLEET_ORG_ID;
  if (orgId === undefined || orgId === '') return {};
  if (!z.uuid().safeParse(orgId).success) {
    throw new Error('FERRFLEET_ORG_ID must be a UUID');
  }
  return { [ORG_HEADER]: orgId };
}

export async function fleetRequest<T>(path: string, options: FleetRequestOptions): Promise<T> {
  const { token, ...rest } = options;
  return apiRequest<T>(path, {
    ...rest,
    token,
    baseUrl: FLEET_API_URL,
    headers: { [API_VERSION_HEADER]: FLEET_API_VERSION, ...orgHeader() },
  });
}
