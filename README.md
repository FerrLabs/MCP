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
      "args": ["-y", "@ferrlabs/mcp"]
    }
  }
}
```

The first time you call a tool that needs auth, the MCP opens `auth.ferrlabs.com` in your default browser (OAuth 2.0 loopback PKCE). After you click Allow, the token is saved locally and reused for future sessions. No env var required.

### CI / scripted / headless use

Bypass the browser dance by injecting a token directly:

```json
{
  "mcpServers": {
    "ferrlabs": {
      "command": "npx",
      "args": ["-y", "@ferrlabs/mcp"],
      "env": { "FERRLABS_API_TOKEN": "fl_..." }
    }
  }
}
```

Create the token from `app.ferrlabs.com` → Settings → API Tokens. It's forwarded as `x-api-token` to `api.ferrlabs.com`.

## Available Tools

| Tool                 | Scope   | Description                                                                    |
| -------------------- | ------- | ------------------------------------------------------------------------------ |
| `get_stats`          | public  | Public usage statistics from `api.ferrlabs.com`                                |
| `health_check`       | public  | API health status                                                              |
| `fetch_docs`         | public  | Fetch a page from a product marketing site (ferrflow, ferrvault, ferrtrack, …) |
| `get_me`             | auth    | Current user profile                                                           |
| `list_tokens`        | auth    | List your API tokens                                                           |
| `create_token`       | session | Create a new API token (requires interactive session, not a token)             |
| `revoke_token`       | auth    | Revoke an API token                                                            |
| `list_orgs`          | auth    | List FerrLabs organizations you belong to                                      |
| `list_projects`      | auth    | List projects inside an organization                                           |
| `list_subscriptions` | auth    | List product subscriptions for an organization                                 |
| `list_vaults`        | auth    | List FerrVault vaults inside a project                                         |
| `list_issues`        | auth    | List FerrTrack issues inside a project                                         |

FerrFlow CLI-specific tools (`dry_run`, `validate_config`, `read_config`, `read_changelog`, `list_release_tags`, `record_event`) were removed in v4.0.0 — they required either a local FerrFlow CLI install or HMAC signing the MCP doesn't do. Use the FerrFlow CLI directly or fetch docs via `fetch_docs("ferrflow", "docs/...")`.

## Stack

| Component | Technology                |
| --------- | ------------------------- |
| Runtime   | Node.js 22+               |
| Language  | TypeScript                |
| MCP SDK   | @modelcontextprotocol/sdk |

## Configuration

| Variable                  | Description                                                                           | Default                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `API_URL`                 | FerrLabs API base URL (no `/v1` suffix — paths are prefixed in code)                  | `https://api.ferrlabs.com`                                                |
| `FERRLABS_AUTH_URL`       | Auth SPA base URL (where the OAuth browser flow lands)                                | `https://auth.ferrlabs.com`                                               |
| `FERRLABS_API_TOKEN`      | Pre-provisioned token. Bypasses the OAuth flow. Use for CI / scripted environments.   | —                                                                         |
| `FERRFLOW_API_TOKEN`      | **Deprecated** — accepted as a fallback for backward compatibility with v3.x.         | —                                                                         |
| `FERRLABS_MCP_NO_OAUTH`   | Set to `1` to disable the OAuth fallback. Then `FERRLABS_API_TOKEN` becomes required. | unset                                                                     |
| `FERRLABS_MCP_TOKEN_PATH` | Override the path where the OAuth-acquired token is persisted.                        | `%APPDATA%\ferrlabs\mcp\token.json` / `~/.config/ferrlabs/mcp/token.json` |
| `FERRLABS_MCP_NO_PERSIST` | Set to `1` to keep the token in memory only (re-auth on every cold start).            | unset                                                                     |

### How auth resolution works

On the first authenticated tool call, the MCP looks for a token in this order:

1. In-memory cache (set during this MCP process's lifetime)
2. `FERRLABS_API_TOKEN` (or `FERRFLOW_API_TOKEN`) env var
3. Persisted token file (`FERRLABS_MCP_TOKEN_PATH`)
4. **OAuth 2.0 loopback PKCE flow** — opens the user's browser, captures the callback on `http://127.0.0.1:54321/cb`, exchanges the code for a session token via `POST /v1/auth/exchange`. Token is persisted to step 3 for future sessions.

If you set `FERRLABS_MCP_NO_OAUTH=1`, step 4 is skipped — useful for CI where opening a browser would hang.

## Smoke test

`pnpm smoke` builds the server, spawns it over stdio, runs the MCP `initialize`/`tools/list` handshake, then calls `health_check` and `get_stats` against the real `api.ferrlabs.com`. Useful to confirm the server boots, registers all tools, and the API is reachable. Exits non-zero on any failure.

```
[PASS] initialize handshake — serverInfo: ferrlabs@4.0.0
[PASS] tools/list — 12 tools registered
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

Mozilla Public License 2.0 — see [LICENSE](LICENSE).
