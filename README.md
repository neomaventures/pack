# pack 🐺

The monorepo for the **`@neoma/*`** family — a pack of NestJS building blocks, each published independently to npm.

## Packages

| Package | Description |
|---------|-------------|
| [`@neoma/fixtures`](packages/fixtures) | Test fixtures for `@neoma/*` packages — Express/NestJS mocks, Jest matchers, and a mock logger. |
| [`@neoma/docker`](packages/docker) | Docker test-container helpers — HTTP/TCP health polling and container teardown; the shared base for the service fixtures. |
| [`@neoma/mockserver`](packages/mockserver) | MockServer test fixture — a reusable client plus Docker container lifecycle and Jest setup/teardown drop-ins. |
| [`@neoma/mailpit`](packages/mailpit) | Mailpit test fixture for email testing — a reusable client plus Docker container lifecycle and Jest setup/teardown drop-ins. |
| [`@neoma/minio`](packages/minio) | MinIO test fixture — an S3-compatible object-storage container with a bucket created on start and Jest setup/teardown drop-ins. |
| [`@neoma/cerberus`](packages/cerberus) | NestJS-idiomatic file storage for S3-compatible backends — upload, persist, presigned download. |
| [`@neoma/garmr`](packages/garmr) | Authentication & authorization for NestJS — magic links, Google OAuth, cookie/bearer sessions, and wildcard permissions. |
| [`@neoma/features`](packages/features) | Feature flagging for NestJS controllers — gate routes behind binary on/off flags. |
| [`@neoma/route-model-binding`](packages/route-model-binding) | Laravel-inspired route model binding for NestJS — resolve database models from route parameters automatically. |
| [`@neoma/argos`](packages/argos) | NestJS-idiomatic audit trails for TypeORM — `@CreatedBy` / `@UpdatedBy` decorators that record who changed your entities. |
| [`@neoma/config`](packages/config) | Simple, type-safe environment configuration for NestJS — typed access to env vars with camelCase↔SCREAMING_SNAKE mapping and `.env` precedence loading. |
| [`@neoma/logging`](packages/logging) | Great logging for NestJS — Pino-backed application + request-scoped loggers, with per-request trace IDs and field redaction. |
| [`@neoma/exception-handling`](packages/exception-handling) | Automatic, Laravel-inspired exception handling for NestJS — consistent error responses, status-aware logging, and HTML content negotiation. |
| [`@neoma/request-context`](packages/request-context) | Per-request context (AsyncLocalStorage) for NestJS — read the current request anywhere, no request scope. |
| [`@neoma/managed-app`](packages/managed-app) | Boots a NestJS app from a module path — an e2e harness for the `@neoma/*` packages. |
| [`@neoma/managed-database`](packages/managed-database) | In-memory SQLite `datasource` fixture for tests. |

Each package is versioned, changelogged, and published on its own cadence.

## Getting started

### Prerequisites

- **Node ≥ 22**
- **pnpm 11.1.3** — pinned via `packageManager`; install via Corepack so you get the right version.
- **Docker** — required for test fixtures (`@neoma/minio`, `@neoma/mailpit`, `@neoma/mockserver`) that boot containers. Docker Desktop or any equivalent works. Without Docker running, tests that depend on these fixtures will fail.

### Install

```bash
corepack enable      # one-time — makes `pnpm` resolve to the pinned version
pnpm install
```

> Using a different pnpm major (e.g. 9.x) can resolve a lockfile that fails CI's supply-chain checks. Corepack avoids that.

## Development

Run a task across the workspace, or scope it to one package:

```bash
pnpm -r build                                  # build all (topological order)
pnpm -r lint
pnpm -r test                                   # unit tests — Docker required (MinIO, etc.)

pnpm --filter @neoma/cerberus test             # a single package
pnpm --filter @neoma/cerberus test -- --watch  # watch mode
pnpm --filter @neoma/cerberus test:e2e         # e2e — boots a Nest app against MinIO
```

Editing a package **and** its consumer together? The consumer resolves the dependency from its built `dist/`, so keep a build-watch running alongside:

```bash
pnpm --filter @neoma/fixtures exec tsc -p tsconfig.lib.json --watch
```

## Creating a package

Scaffold a new `@neoma/*` package in the canonical flattened layout:

```bash
pnpm new-package <name> ["description"]   # e.g. pnpm new-package minio
```

This writes `packages/<name>/` — lib in `src/`, a per-package `jest.config.js` and tsconfigs that extend the root configs, a publishable `package.json`, plus `README.md` and `LICENSE` — with a passing placeholder spec so the workspace stays green. Then:

```bash
corepack pnpm install        # register it in the workspace + update the lockfile
pnpm changeset               # record the new package for its first release
```

Replace `src/index.ts` with the real API and add specs alongside it. e2e (a `packages/<name>/e2e/` suite + `test:e2e` script) is added per package when needed — see [`packages/cerberus`](packages/cerberus) for the pattern.

## Releasing

Releases are driven by [Changesets](https://github.com/changesets/changesets), per package:

1. **With your change**, record the intent:
   ```bash
   pnpm changeset     # choose package(s) + bump (patch/minor/major) + a summary
   ```
   Commit the generated `.changeset/*.md` file alongside your change.
2. **Merge to `main`** → CI opens a **"Version Packages"** PR that bumps versions and writes each package's `CHANGELOG.md`.
3. **Merge the Version PR** → CI publishes the changed packages to npm and tags them (`@neoma/<pkg>@<version>`).

A change merged **without** a changeset ships nothing — it waits on `main` until one is added.

## Supply chain

- **`minimumReleaseAge: 10080`** — dependencies published within the last 7 days are refused (protection against compromised/typosquatted releases).
- **`allowBuilds`** — only allowlisted dependencies may run install/build scripts; everything else is blocked.

## License

MIT
