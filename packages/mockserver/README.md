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

`setup` starts the container and sets `process.env.MOCKSERVER_URL` (e.g. `http://localhost:1080/mockserver`); `teardown` removes it.

```typescript
import { MockServerClient } from "@neomaventures/mockserver"

const client = new MockServerClient(process.env.MOCKSERVER_URL!)

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

## Configuration

The container honours these environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `MOCKSERVER_PORT` | `1080` | Host port to bind the container to |
| `NEOMA_TEST_PREFIX` | `neoma-test` | Prefix for the container name (`{prefix}-mockserver`) |

## API

- **`MockServerClient`** — `reset()`, `createExpectation(expectation)`, `verifyExpectationMatched(request, count?)`.
- **`startContainer(options?)` / `stopContainer(options?)`** — manage the container directly when `globalSetup` isn't a fit. `start` sets `MOCKSERVER_URL`.
- **`@neomaventures/mockserver/setup` / `@neomaventures/mockserver/teardown`** — Jest `globalSetup`/`globalTeardown` drop-ins wrapping the above.

## License

MIT
