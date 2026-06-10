# @neomaventures/mockserver

MockServer test fixture for `@neomaventures/*` — a reusable client plus Docker container lifecycle and Jest `setup`/`teardown` drop-ins.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Requirements

- Node ≥ 22
- **Docker** available on the host (the container lifecycle shells out to the `docker` CLI)

## Installation

```bash
npm install --save-dev @neomaventures/mockserver
```

## Quick start

Start a MockServer container for the whole test run via Jest's `globalSetup`/`globalTeardown`, then drive it with `MockServerClient`.

```json
// jest-e2e.json
{
  "globalSetup": "@neomaventures/mockserver/setup",
  "globalTeardown": "@neomaventures/mockserver/teardown"
}
```

`setup` starts the container; `teardown` removes it. The package does **not** set any environment variables — the consumer is responsible for wiring the connection URL (e.g. via env vars in the test script or a custom `globalSetup` that calls `startContainer()` and sets env vars from the returned config).

```typescript
import { MockServerClient } from "@neomaventures/mockserver"

// Derive the URL from the MOCKSERVER_PORT env var set in your test script:
const port = process.env.MOCKSERVER_PORT ?? "1080"
const client = new MockServerClient(`http://localhost:${port}/mockserver`)

await client.reset()
await client.createExpectation({
  httpRequest: { path: "/api/users", method: "GET" },
  httpResponse: { statusCode: 200, body: "[]" },
  times: { unlimited: true },
})

// ...exercise the code under test, which calls the mocked endpoint...

const matched = await client.verifyExpectationMatched({
  path: "/api/users",
  method: "GET",
})
```

## Auto-reset fixture

For test suites that want a single shared client and an automatic `reset()` between tests, import the `/fixture` subpath:

```typescript
import { mockserver } from "@neomaventures/mockserver/fixture"

it("returns the mocked body", async () => {
  await mockserver.createExpectation({
    httpRequest: { path: "/api/users", method: "GET" },
    httpResponse: { statusCode: 200, body: "[]" },
    times: { unlimited: true },
  })

  // ...exercise the code under test...
})
```

Importing the subpath:

- Constructs a singleton `MockServerClient` from `process.env.MOCKSERVER_URL`. The variable **must** be set before the module is imported (typically via an `.env.e2e` consumed by `node --env-file` or via a Jest `globalSetup` that runs first). If it is unset or empty, importing throws.
- Registers `beforeEach(() => mockserver.reset())` if the host runner exposes `beforeEach` globally (Jest, Vitest). Playwright Test does not expose a global `beforeEach` — call `await mockserver.reset()` from your own `test.beforeEach` instead.

Suites that test `MockServerClient` itself, or that need multiple independent clients (e.g. per-suite isolated containers), should keep constructing the class directly.

## Configuration

The container honours these environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `MOCKSERVER_PORT` | `1080` | Host port to bind the container to |
| `NEOMA_TEST_PREFIX` | `neoma-test` | Prefix for the container name (`{prefix}-mockserver`) |
| `MOCKSERVER_URL` | _none_ | Required by `@neomaventures/mockserver/fixture` at import time |

### Test layer ports

Consumers run `pnpm turbo test:e2e` in CI, which parallelises e2e jobs across packages. Sharing a host port between two parallel suites collides on `docker run -p`, so each package owns a unique [port slot in the root convention](../../README.md#test-container-ports). The ports below are mockserver's own slot; each consumer of this fixture should declare a `MOCKSERVER_PORT` from its **own** slot in its `.env` files.

Mockserver's own slot (used by `packages/mockserver/.env.e2e`):

| Layer | `MOCKSERVER_PORT` |
|---|---|
| unit (`.spec`) | `1080` (default — no container started) |
| e2e (`.env.e2e`) | `2100` |
| ui | `2200` (reserved) |

Consumer packages pick their own port from their own slot. Example: `@neomaventures/auth` (slot `2900-3199`) uses `MOCKSERVER_PORT=3000` for e2e. `templates/saas` (slot `3500-3799`) uses `MOCKSERVER_PORT=3600` for e2e and `3700` for ui. Declare both the port and the consumer-side URL (e.g. `MOCKSERVER_URL=http://localhost:3000/mockserver`) in the same `.env` file.

## API

- **`MockServerClient`** — `reset()`, `createExpectation(expectation)`, `verifyExpectationMatched(request, count?)`.
- **`startContainer(options?)` / `stopContainer(options?)`** — manage the container directly when `globalSetup` isn't a fit. `start` returns `{ container, port }`.
- **`@neomaventures/mockserver/setup` / `@neomaventures/mockserver/teardown`** — Jest `globalSetup`/`globalTeardown` drop-ins wrapping the above.
- **`@neomaventures/mockserver/fixture`** — singleton `mockserver` client wired from `MOCKSERVER_URL` with an auto-reset `beforeEach` hook.

## License

MIT
