# FerrFlow MCP Server

[![CI](https://github.com/FerrFlow-Org/MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/FerrFlow-Org/MCP/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@ferrflow/mcp)](https://www.npmjs.com/package/@ferrflow/mcp)
[![Coverage](https://codecov.io/gh/FerrFlow-Org/MCP/branch/main/graph/badge.svg)](https://codecov.io/gh/FerrFlow-Org/MCP)
[![License](https://img.shields.io/github/license/FerrFlow-Org/MCP)](LICENSE)

[Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants interact with FerrFlow.

## Quick Start

**Local (stdio) — for Claude Code, Cursor, etc.:**

```json
{
  "mcpServers": {
    "ferrflow": {
      "command": "npx",
      "args": ["-y", "@ferrflow/mcp", "--stdio"]
    }
  }
}
```

**Server (HTTP) — for shared/deployed usage:**

```bash
pnpm install
pnpm dev
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_stats` | Get public usage statistics |
| `health_check` | Check API health status |
| `record_event` | Record an analytics event |
| `list_release_tags` | List release tags for a package |

## Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 22+ |
| Language | TypeScript |
| MCP SDK | @modelcontextprotocol/sdk |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server listen port | `3001` |
| `API_URL` | FerrFlow API base URL | `https://api.ferrflow.com` |
| `FERRFLOW_API_TOKEN` | FerrFlow API authentication token (required for authenticated tools and token operations) | — |

## License

MPL-2.0
