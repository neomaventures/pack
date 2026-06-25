# pack 🐺

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/f02a6f7b3f7545598a9ef608cb5f086b)](https://app.codacy.com/gh/neomaventures/pack/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

The monorepo for the **`@neomaventures/*`** family — a pack of NestJS building blocks, each privately published to GitHub Packages for use across Neoma projects.

## Packages

| Package | Description |
|---------|-------------|
| [`@neomaventures/fixtures`](packages/fixtures) | Test fixtures for `@neomaventures/*` packages — Express/NestJS mocks, Jest matchers, and a mock logger. |
| [`@neomaventures/docker`](packages/docker) | Docker test-container helpers — HTTP/TCP health polling and container teardown; the shared base for the service fixtures. |
| [`@neomaventures/mockserver`](packages/mockserver) | MockServer test fixture — a reusable client plus Docker container lifecycle and Jest setup/teardown drop-ins. |
| [`@neomaventures/mailpit`](packages/mailpit) | Mailpit test fixture for email testing — a reusable client plus Docker container lifecycle and Jest setup/teardown drop-ins. |
| [`@neomaventures/minio`](packages/minio) | MinIO test fixture — an S3-compatible object-storage container with a bucket created on start and Jest setup/teardown drop-ins. |
| [`@neomaventures/storage`](packages/storage) | NestJS-idiomatic file storage for S3-compatible backends — upload, persist, presigned download. |
| [`@neomaventures/auth`](packages/auth) | Authentication & authorization for NestJS — magic links, Google OAuth, cookie/bearer sessions, and wildcard permissions. |
| [`@neomaventures/features`](packages/features) | Feature flagging for NestJS controllers — gate routes behind binary on/off flags. |
| [`@neomaventures/route-model-binding`](packages/route-model-binding) | Laravel-inspired route model binding for NestJS — resolve database models from route parameters automatically. |
| [`@neomaventures/audit`](packages/audit) | NestJS-idiomatic audit trails for TypeORM — `@CreatedBy` / `@UpdatedBy` decorators that record who changed your entities. |
| [`@neomaventures/config`](packages/config) | Simple, type-safe environment configuration for NestJS — typed access to env vars with camelCase↔SCREAMING_SNAKE mapping and `.env` precedence loading. |
| [`@neomaventures/logging`](packages/logging) | Great logging for NestJS — Pino-backed application + request-scoped loggers, with per-request trace IDs and field redaction. |
| [`@neomaventures/exceptions`](packages/exceptions) | Automatic, Laravel-inspired exception handling for NestJS — consistent error responses, status-aware logging, and HTML content negotiation. |
| [`@neomaventures/request-context`](packages/request-context) | Per-request context (AsyncLocalStorage) for NestJS — read the current request anywhere, no request scope. |
| [`@neomaventures/webhooks`](packages/webhooks) | Webhook signature verification for NestJS -- Svix-standard HMAC-SHA256 guard. |
| [`@neomaventures/managed-app`](packages/managed-app) | Boots a NestJS app from a module path — an e2e harness for the `@neomaventures/*` packages. |
| [`@neomaventures/google-fixtures`](packages/google-fixtures) | Google OAuth test fixtures — fake data generators and MockServer helpers for `POST /token`. |
| [`@neomaventures/managed-database`](packages/managed-database) | In-memory SQLite `datasource` fixture for tests. |
| [`@neomaventures/healthcheck`](packages/healthcheck) | Drop-in healthcheck endpoint for NestJS — `@HealthCheck()` decorator with auto-detected TypeORM connectivity probe. |

## Templates

| Template | Description |
|----------|-------------|
| [`saas`](templates/saas) | SaaS starter template — integration test bed and starter kit. EJS + htmx + Alpine.js, wires `@neomaventures/*` packages into a working app. |

Each package is versioned, changelogged, and published on its own cadence — **privately, to GitHub Packages** (not the public npm registry). When a package proves itself in production, it graduates to public npm publishing (see [Versioning](#versioning) for the graduation flow).

## Getting started

### Prerequisites

- **Node ≥ 22**
- **pnpm 11.1.3** — pinned via `packageManager`; install via Corepack so you get the right version.
- **Docker** — required for test fixtures (`@neomaventures/minio`, `@neomaventures/mailpit`, `@neomaventures/mockserver`) that boot containers. Docker Desktop or any equivalent works. Without Docker running, tests that depend on these fixtures will fail.

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

pnpm --filter @neomaventures/storage test             # a single package
pnpm --filter @neomaventures/storage test -- --watch  # watch mode
pnpm --filter @neomaventures/storage test:e2e         # e2e — boots a Nest app against MinIO
```

Editing a package **and** its consumer together? The consumer resolves the dependency from its built `dist/`, so keep a build-watch running alongside:

```bash
pnpm --filter @neomaventures/fixtures exec tsc -p tsconfig.lib.json --watch
```

### Test container ports

Every test layer that boots a Docker container declares its host ports in the layer's `.env` file — never mutates `process.env` from `globalSetup`. CI runs `pnpm turbo test:e2e` which fans suites out **in parallel**, so any two suites that share a host port collide on `docker run -p`. To stay parallel-safe, each package owns a unique **300-port slot**, split into three 100-port sub-ranges:

| Sub-range | Layer |
|---|---|
| `base + 0..99` | unit (`.spec`) |
| `base + 100..199` | e2e (`.e2e-spec`, `.env.e2e`) |
| `base + 200..299` | ui (`.ui-spec`) |

Within each sub-range, the package picks specific ports for the containers it boots. The next package's `base` is 300 higher, so slots never overlap.

| Package | Base | Slot |
|---|---|---|
| [`@neomaventures/mockserver`](packages/mockserver) | `2000` | `2000-2299` |
| [`@neomaventures/mailpit`](packages/mailpit) | `2300` | `2300-2599` |
| [`@neomaventures/minio`](packages/minio) | `2600` | `2600-2899` |
| [`@neomaventures/auth`](packages/auth) | `2900` | `2900-3199` |
| [`@neomaventures/storage`](packages/storage) | `3200` | `3200-3499` |
| [`templates/saas`](templates/saas) | `3500` | `3500-3799` |
| [`@neomaventures/mailbox`](packages/mailbox) | `3800` | `3800-4099` |

Each container package's README documents the specific port numbers its consumers should use. Each consumer package's `.env` files declare the slot ports plus the consumer-side URLs derived from them (e.g. `MOCKSERVER_URL=http://localhost:3000/mockserver`).

When you add a new package that needs container ports, take the next free slot above the table and add a row.

### Pre-commit lint hook

A `pre-commit` git hook runs ESLint with `--fix` on staged `.ts` and YAML files via [husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged). It auto-installs on `corepack pnpm install` (via the `prepare` script) — existing contributors should re-run install once after pulling this change.

The hook is a local convenience; CI's `lint` job remains the merge gate. Skip the hook with `git commit --no-verify` if you need to (e.g. mid-rebase fixups).

## Creating a package

Scaffold a new `@neomaventures/*` package in the canonical flattened layout:

```bash
pnpm new-package <name> ["description"]   # e.g. pnpm new-package minio
```

This writes `packages/<name>/` — lib in `src/`, a per-package `jest.config.js` and tsconfigs that extend the root configs, a `package.json` configured to publish to GitHub Packages, plus `README.md` and `LICENSE` — with a passing placeholder spec so the workspace stays green. Then:

```bash
corepack pnpm install        # register it in the workspace + update the lockfile
pnpm changeset               # record the new package for its first release
```

Replace `src/index.ts` with the real API and add specs alongside it. e2e (a `packages/<name>/e2e/` suite + `test:e2e` script) is added per package when needed — see [`packages/storage`](packages/storage) for the pattern.

## Versioning

[Changesets](https://github.com/changesets/changesets) drive versions and CHANGELOGs. Each package publishes to GitHub Packages via its `publishConfig.registry` setting; no `NPM_TOKEN` is involved.

1. **With your change**, record the intent:
   ```bash
   pnpm changeset     # choose package(s) + bump (patch/minor/major) + a summary
   ```
   Commit the generated `.changeset/*.md` file alongside your change.
2. **Merge to `main`** → CI opens a **"Version Packages"** PR that bumps versions and writes each package's `CHANGELOG.md`.
3. **Merge the Version PR** → CI publishes the changed packages to GitHub Packages and tags them (`@neomaventures/<pkg>@<version>`).

A PR that touches a published package without a `.changeset/*.md` entry **fails CI** (the `changeset-check` job). The auto-raised "Version Packages" PR is exempt.

### Consuming the packages

Downstream consumers (Neoma SaaS apps, internal tools) configure the `@neoma` scope to resolve from GitHub Packages via `.npmrc`:

```
@neomaventures:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` needs the `read:packages` scope (CI gets this via workflow `permissions:`; local dev uses a personal access token).

### Graduation to public npm

When a package proves itself in production, it graduates to public publishing:

1. Drop `publishConfig` from its `package.json`
2. Add a `1.0.0` changeset documenting the API stability commitment
3. Merge → CI publishes to the default registry (npm)
4. Old GitHub Packages versions remain at their URL as the pre-stable history

Each package graduates independently. Bertie's consumption (`@neomaventures/<pkg>: ^x.y.z`) doesn't change between registries — only the `.npmrc` mapping does.

## Supply chain

- **`minimumReleaseAge: 10080`** — dependencies published within the last 7 days are refused (protection against compromised/typosquatted releases).
- **`allowBuilds`** — only allowlisted dependencies may run install/build scripts; everything else is blocked.

## License

MIT
