import { getToken, type McpServer } from '@ferrlabs/mcp-core';
import { vaultPath, vaultRequest } from '../api.js';
import { guarded, textResult } from '../results.js';
import { vaultSlug } from '../schemas.js';

export function registerVaultTools(server: McpServer): void {
  server.tool(
    'list_ferrvault_vaults',
    'List the FerrVault vaults of the organization the token is signed in to, with your role, environment slugs and secret counts.',
    {},
    () =>
      guarded(async () => {
        const token = await getToken();
        return textResult(await vaultRequest<unknown>('/vaults', { token }));
      }),
  );

  server.tool(
    'list_ferrvault_environments',
    'List the environments (e.g. dev, prod) of a FerrVault vault.',
    { vault: vaultSlug },
    ({ vault }) =>
      guarded(async () => {
        const token = await getToken();
        return textResult(
          await vaultRequest<unknown>(`${vaultPath(vault)}/environments`, { token }),
        );
      }),
  );
}
