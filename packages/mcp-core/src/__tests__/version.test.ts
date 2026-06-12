import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readPackageVersion } from '../version.js';

describe('readPackageVersion', () => {
  it('reads the version from the parent-directory package.json of an entry module', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-version-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '9.9.9' }), 'utf8');
    const entryUrl = pathToFileURL(join(dir, 'dist', 'index.js')).href;

    expect(readPackageVersion(entryUrl)).toBe('9.9.9');
  });

  it('throws when the package.json has no version field', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-version-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x' }), 'utf8');
    const entryUrl = pathToFileURL(join(dir, 'dist', 'index.js')).href;

    expect(() => readPackageVersion(entryUrl)).toThrow(/no version field/);
  });
});
