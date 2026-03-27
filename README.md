# FerrFlow MCP Server

[![CI](https://github.com/FerrFlow-Org/MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/FerrFlow-Org/MCP/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/FerrFlow-Org/MCP)](LICENSE)

MCP Server for AI agents — TypeScript.

## Quick Start

```bash
chmod +x scripts/init-dev-env.sh
./scripts/init-dev-env.sh
pnpm install
pnpm dev
```

## Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 22+ |
| Language | TypeScript |
| MCP SDK | @modelcontextprotocol/sdk |
| Secrets | HashiCorp Vault |
| Cache | Redis |
| Database | TimescaleDB (PostgreSQL 16) |
