# Changelog

All notable changes to `mcp` will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [5.2.3] - 2026-05-21

### Bug Fixes

- fix(docker): reuse node:alpine's built-in UID 1000 user (no addgroup conflict) (#123)

## [5.2.2] - 2026-05-21

### Bug Fixes

- fix(docker): pin app user to UID 1000 so K8s runAsNonRoot validates (#122)

## [5.2.1] - 2026-05-20

### Bug Fixes

- fix(docker): disable husky postinstall in Dockerfile build (no .git in context) (#121)

## [5.2.0] - 2026-05-20

### Features

- feat(transport): dual-transport — stdio default + Streamable HTTP for hosted use (#120)

## [5.1.1] - 2026-05-19

### Bug Fixes

- fix(auth): use rundll32 on Windows to avoid cmd & parsing breaking the OAuth URL (#119)

## [5.1.0] - 2026-05-19

### Features

- feat(auth): OAuth 2.0 loopback PKCE flow + persistence (closes #113) (#117)

## [Unreleased]

### Features

- feat(auth): OAuth 2.0 loopback PKCE flow on first authenticated tool call — the MCP opens `auth.ferrlabs.com` in the user's browser, captures the callback on a loopback port, and persists the token. No more manual `FERRLABS_API_TOKEN` paste for desktop users (#113)
- feat(auth): token persistence per OS conventions (`%APPDATA%\ferrlabs\mcp\token.json` on Windows, `~/.config/ferrlabs/mcp/token.json` on Linux, `~/Library/Application Support/...` on macOS). File mode `0600` on Unix.
- feat(auth): new env knobs — `FERRLABS_AUTH_URL` (override auth host), `FERRLABS_MCP_NO_OAUTH=1` (disable OAuth fallback for CI), `FERRLABS_MCP_TOKEN_PATH` (override persistence path), `FERRLABS_MCP_NO_PERSIST=1` (in-memory only)
- `FERRLABS_API_TOKEN` still works and short-circuits the OAuth dance — safe to keep in CI configs

## [5.0.0] - 2026-05-19

### Breaking Changes

- feat(license)!: relicense from MIT to MPL-2.0 to match FerrFlow (#116)

## [4.0.0] - 2026-05-19

### Breaking Changes

- feat!: rename package from `@ferrflow/mcp` to `@ferrlabs/mcp` (#111)
- feat!: default `API_URL` is now `https://api.ferrlabs.com` (was `https://api.ferrflow.com`) (#111)
- feat!: prefer `FERRLABS_API_TOKEN`; `FERRFLOW_API_TOKEN` accepted as a fallback for one release (#111)
- feat!: authenticated endpoint paths now use the `/v1` prefix to match the unified FerrLabs API router (#111)
- feat!: `revoke_token` switched from `POST /tokens/{id}/revoke` to `DELETE /v1/auth/tokens/{id}` (#111)
- feat!: drop FerrFlow CLI-specific tools — `dry_run`, `validate_config`, `read_config`, `read_changelog`, `list_release_tags`, `record_event` removed. They required either a local FerrFlow CLI install or HMAC-signed payloads the MCP doesn't produce. The MCP is now platform-focused; product-specific docs are reachable via `fetch_docs`. (#111)

### Features

- feat(tools): add `list_orgs` and `list_projects` (FerrLabs organizations + projects) (#111)
- feat(tools): add `list_vaults` (FerrVault — secrets management) (#111)
- feat(tools): add `list_issues` (FerrTrack — issue tracker) (#111)
- feat(tools): add `list_subscriptions` (per-product subscription status) (#111)
- feat(tools): add `fetch_docs(product, slug)` — fetch documentation/marketing pages from any FerrLabs product site (ferrflow, ferrvault, ferrtrack, ferrgrowth, ferrfleet, ferrlens, ferrlabs) (#111)

## [3.2.2] - 2026-04-21

### Bug Fixes

- fix(ci): downgrade release.yml pnpm action v6->v5 + FERRFLOW_TOKEN fallback (#94)
- fix(ci): downgrade pnpm/action-setup v6 -> v5 with pinned version (#93)
- fix(ci): rebrand GHCR + GitHub URLs from ferrflow-org to ferrlabs (#91)

## [3.2.1] - 2026-04-01

## [3.2.0] - 2026-04-01

### Features

- feat(tools): add validate_config tool (#67)

## [3.1.0] - 2026-04-01

### Features

- feat: publish @ferrflow/mcp to npm on release (#64)

## [3.0.0] - 2026-04-01

### Breaking Changes

- chore!: remove Docker and HTTP transport, stdio only (#58)

### Features

- feat(tools): add dry_run tool (#55)

## [2.1.0] - 2026-03-31

### Features

- feat(tools): add dry_run tool (#55)

## [1.1.0] - 2026-04-01

### Features

- feat: add stdio transport for local usage (#52)
- feat(tools): add read_changelog tool (#49)
- feat(tools): add list_release_tags tool (#46)

## [0.3.1] - 2026-03-29

### Bug Fixes

- fix(ci): trigger Docker builds on tag creation and use v* tag format (#29)

## [0.3.0] - 2026-03-28

### Features

- feat: add read_config tool (#24)
- feat: initial release
- feat(config): migrate ferrflow config from TOML to JSON
- feat: add Dockerfile and Docker build to CI
- feat: add CI with FerrFlow release action
- feat: initialize MCP server with project templates

### Bug Fixes

- fix: add /health endpoint for K8S readiness probe
- fix: add @types/node for HTTP server types
- fix: use HTTP transport and push latest tag
- fix: pin FerrFlow action to @v0

## [0.2.0] - 2026-03-26

### Features

- feat: initial release
- feat(config): migrate ferrflow config from TOML to JSON
- feat: add Dockerfile and Docker build to CI
- feat: add CI with FerrFlow release action
- feat: initialize MCP server with project templates

### Bug Fixes

- fix: add /health endpoint for K8S readiness probe
- fix: add @types/node for HTTP server types
- fix: use HTTP transport and push latest tag
- fix: pin FerrFlow action to @v0
