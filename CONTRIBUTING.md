# Contributing to FerrLabs MCP

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/MCP.git`
3. Create a branch: `git checkout -b feat/my-feature`
4. Make your changes
5. Push and open a pull request

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 9

### Build and Test

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Guidelines

### Branches

Use conventional prefixes: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `test/`.

One branch per topic. Don't mix unrelated changes.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add release trigger tool
fix: handle missing token gracefully
```

- Single line, no body
- Breaking changes: add `!` after type/scope

### Pull Requests

- Every PR must reference a GitHub issue. If none exists, create one first.
- PR titles follow the same Conventional Commits format (squash merge uses the title).
- Keep PRs focused. One feature or fix per PR.

### Code Style

- Follow existing TypeScript conventions
- Write tests for new tools and functionality
- Keep MCP tools in sync with the FerrLabs unified API and per-product surfaces (FerrFlow, FerrVault, FerrTrack, FerrGrowth, FerrFleet, FerrLens)

## Reporting Bugs

Use the [bug report template](https://github.com/FerrLabs/MCP/issues/new?template=bug_report.md).

## Requesting Features

Use the [feature request template](https://github.com/FerrLabs/MCP/issues/new?template=feature_request.md).

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the [MPL-2.0 License](LICENSE).
