# Changelog

All notable changes to `mcp` will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
