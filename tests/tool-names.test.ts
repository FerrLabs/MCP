import { describe, it, expect } from 'vitest';
import { register as registerFerrLabs } from '../packages/mcp/src/register.js';
import { register as registerFerrVault } from '../packages/ferrvault-mcp/src/register.js';
import { register as registerFerrTrack } from '../packages/ferrtrack-mcp/src/register.js';
import { register as registerFerrGrowth } from '../packages/ferrgrowth-mcp/src/register.js';
import { register as registerFerrFleet } from '../packages/ferrfleet-mcp/src/register.js';
import { register as registerFerrLens } from '../packages/ferrlens-mcp/src/register.js';

type Register = typeof registerFerrLabs;
type Server = Parameters<Register>[0];

const PACKAGES: Readonly<Record<string, Register>> = {
  '@ferrlabs/mcp': registerFerrLabs,
  '@ferrvault/mcp': registerFerrVault,
  '@ferrtrack/mcp': registerFerrTrack,
  '@ferrgrowth/mcp': registerFerrGrowth,
  '@ferrfleet/mcp': registerFerrFleet,
  '@ferrlens/mcp': registerFerrLens,
};

function toolNames(register: Register): string[] {
  const names: string[] = [];
  const recorder = {
    tool: (name: string) => {
      names.push(name);
    },
    registerResource: () => undefined,
    prompt: () => undefined,
  };
  register(recorder as unknown as Server);
  return names;
}

describe('tool names across packages', () => {
  const owners = new Map<string, string[]>();
  for (const [pkg, register] of Object.entries(PACKAGES)) {
    for (const name of new Set(toolNames(register))) {
      owners.set(name, [...(owners.get(name) ?? []), pkg]);
    }
  }

  it('records tools for every package', () => {
    const counted = new Set([...owners.values()].flat());
    expect([...counted].sort()).toEqual(Object.keys(PACKAGES).sort());
  });

  it('never registers the same tool name in two packages', () => {
    const collisions = Object.fromEntries([...owners].filter(([, pkgs]) => pkgs.length > 1));
    expect(collisions).toEqual({});
  });
});
