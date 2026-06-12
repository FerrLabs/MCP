import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function readPackageVersion(entryUrl: string): string {
  const packageJsonUrl = new URL('../package.json', entryUrl);
  const raw = readFileSync(fileURLToPath(packageJsonUrl), 'utf8');
  const parsed = JSON.parse(raw) as { version?: unknown };
  if (typeof parsed.version !== 'string' || parsed.version.length === 0) {
    throw new Error(`package.json at ${packageJsonUrl.href} has no version field`);
  }
  return parsed.version;
}
