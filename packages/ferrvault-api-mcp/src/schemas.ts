import { z } from 'zod';

const slug = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase slug (letters, digits, hyphens)');

export const vaultSlug = slug.describe('Vault slug, as listed by list_ferrvault_vaults');

export const environmentSlug = slug.describe(
  'Environment slug inside the vault, as listed by list_ferrvault_environments (e.g. prod)',
);

export const secretName = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^[A-Za-z_][A-Za-z0-9_.]*$/,
    'must start with a letter or underscore, then letters, digits, underscores or dots',
  )
  .describe('Secret name (e.g. STRIPE_API_KEY)');
