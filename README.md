# FerrLabs MCP Server

[![npm](https://img.shields.io/npm/v/@ferrlabs/mcp)](https://www.npmjs.com/package/@ferrlabs/mcp)
[![Coverage](https://codecov.io/gh/FerrLabs/MCP/branch/main/graph/badge.svg)](https://codecov.io/gh/FerrLabs/MCP)
[![License](https://img.shields.io/github/license/FerrLabs/MCP)](LICENSE)

[Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants interact with the FerrLabs ecosystem (FerrFlow, FerrVault, FerrTrack, FerrGrowth, FerrFleet, FerrLens) through the unified FerrLabs API. Runs locally via stdio transport.

## Quick Start

Add to your MCP client configuration (Claude Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "ferrlabs": {
      "command": "npx",
      "args": ["-y", "@ferrlabs/mcp"],
      "env": {
        "FERRLABS_API_TOKEN": "fl_..."
      }
    }
  }
}
```

Create a token from `app.ferrlabs.com` (Settings → API Tokens) and assign the scopes you want the assistant to have. The token is forwarded as `x-api-token` to `api.ferrlabs.com`.

## Available Tools

| Tool                 | Scope         | Description                                                        |
| -------------------- | ------------- | ------------------------------------------------------------------ |
| `get_stats`          | public        | Public usage statistics                                            |
| `health_check`       | public        | API health status                                                  |
| `get_me`             | auth          | Current user profile                                               |
| `list_tokens`        | auth          | List your API tokens                                               |
| `create_token`       | session       | Create a new API token (requires interactive session, not a token) |
| `revoke_token`       | auth          | Revoke an API token                                                |
| `list_orgs`          | auth          | List FerrLabs organizations you belong to                          |
| `list_projects`      | auth          | List projects inside an organization                               |
| `list_subscriptions` | auth          | List product subscriptions for an organization                     |
| `list_vaults`        | auth          | List FerrVault vaults inside a project                             |
| `list_issues`        | auth          | List FerrTrack issues inside a project                             |
| `list_release_tags`  | public        | List release tags for a package on GitHub                          |
| `record_event`       | public (HMAC) | Record a FerrFlow analytics event                                  |
| `read_changelog`     | local         | Read FerrFlow's CHANGELOG.md                                       |
| `dry_run`            | local         | Run `ferrflow check --dry-run` locally                             |
| `validate_config`    | local         | Validate a `.ferrflow.toml` against the JSON schema                |
| `read_config`        | local         | Read a `.ferrflow.toml` config                                     |

## Stack

| Component | Technology                |
| --------- | ------------------------- |
| Runtime   | Node.js 22+               |
| Language  | TypeScript                |
| MCP SDK   | @modelcontextprotocol/sdk |

## Configuration

| Variable             | Description                                                                  | Default                    |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------- |
| `API_URL`            | FerrLabs API base URL (no `/v1` suffix — paths are prefixed in code)         | `https://api.ferrlabs.com` |
| `FERRLABS_API_TOKEN` | FerrLabs API token (required for authenticated tools)                        | —                          |
| `FERRFLOW_API_TOKEN` | **Deprecated** — accepted as a fallback for backward compatibility with v3.x | —                          |

## Smoke test

`pnpm smoke` builds the server, spawns it over stdio, runs the MCP `initialize`/`tools/list` handshake, then calls `health_check` and `get_stats` against the real `api.ferrlabs.com`. Useful to confirm the server boots, registers all tools, and the API is reachable. Exits non-zero on any failure.

```
[PASS] initialize handshake — serverInfo: ferrlabs@4.0.0
[PASS] tools/list — 17 tools registered
[PASS] tools/call health_check — {"status":"ready", ...}
[PASS] tools/call get_stats — total_releases=N

Smoke: 4/4 OK
```

## Migrating from `@ferrflow/mcp` v3.x

v4.0.0 renames the package and points the MCP at the unified FerrLabs API. To migrate:

1. Replace `@ferrflow/mcp` with `@ferrlabs/mcp` in your MCP client config.
2. Rename `FERRFLOW_API_TOKEN` → `FERRLABS_API_TOKEN` (the old name still works for one release).
3. If you were overriding `API_URL=https://api.ferrflow.com`, drop the override — the default is now `https://api.ferrlabs.com`.

Tokens issued by the legacy FerrFlow-only API are not valid against the unified API. Create a fresh one from `app.ferrlabs.com`.

## License

MIT
