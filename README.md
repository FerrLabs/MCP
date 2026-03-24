# FerrFlow MCP Server

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
