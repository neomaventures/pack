# @neomaventures/mailpit

Mailpit test fixture for `@neomaventures/*` — a reusable client plus Docker container lifecycle and Jest `setup`/`teardown` drop-ins for email testing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Requirements

- Node ≥ 22
- **Docker** available on the host (the container lifecycle shells out to the `docker` CLI)

## Installation

```bash
npm install --save-dev @neomaventures/mailpit
```

## Quick start

Start a Mailpit container for the whole test run via Jest's `globalSetup`/`globalTeardown`, send mail over SMTP, then assert on it with `MailpitClient`.

```json
// jest-e2e.json
{
  "globalSetup": "@neomaventures/mailpit/setup",
  "globalTeardown": "@neomaventures/mailpit/teardown"
}
```

`setup` starts the container; `teardown` removes it. The package does **not** set any environment variables — the consumer is responsible for wiring connection details (e.g. via env vars in the test script or a custom `globalSetup` that calls `startContainer()` and sets env vars from the returned config).

```typescript
import { MailpitClient } from "@neomaventures/mailpit"

// Derive the URL from the MAILPIT_API_PORT env var set in your test script:
const apiPort = process.env.MAILPIT_API_PORT ?? "8025"
const client = new MailpitClient(`http://localhost:${apiPort}/api/v1`)

await client.clear()

// ...exercise the code under test, which sends an email via SMTP...

const message = await client.findByRecipient("user@example.com")
expect(message.Subject).toBe("Welcome")
expect(message.HTML).toContain("Confirm your address")
```

## Configuration

The container honours these environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `MAILPIT_SMTP_PORT` | `1025` | Host port for the SMTP server |
| `MAILPIT_API_PORT` | `8025` | Host port for the HTTP API |
| `NEOMA_TEST_PREFIX` | `neoma-test` | Prefix for the container name (`{prefix}-mailpit`) |

### Test layer ports

Consumers run `pnpm turbo test:e2e` in CI, which parallelises e2e jobs across packages. Sharing a host port between two parallel suites collides on `docker run -p`, so each package owns a unique [port slot in the root convention](../../README.md#test-container-ports). The ports below are mailpit's own slot; each consumer of this fixture should declare its `MAILPIT_SMTP_PORT` / `MAILPIT_API_PORT` from its **own** slot.

Mailpit's own slot (used by `packages/mailpit/.env.e2e`):

| Layer | `MAILPIT_SMTP_PORT` | `MAILPIT_API_PORT` |
|---|---|---|
| unit (`.spec`) | `1025` (default — no container started) | `8025` (default — no container started) |
| e2e (`.env.e2e`) | `2400` | `2401` |
| ui | `2500` (reserved) | `2501` (reserved) |

Consumer packages pick their own ports from their own slots. Example: `@neomaventures/auth` (slot `2900-3199`) uses `MAILPIT_SMTP_PORT=3001` / `MAILPIT_API_PORT=3002` for e2e. `templates/saas` (slot `3500-3799`) uses `3601`/`3602` for e2e and `3701`/`3702` for ui. Declare both the ports and the consumer-side values (e.g. `SMTP_PORT=3001`, `MAILPIT_API=http://localhost:3002/api/v1`) in the same `.env` file.

## API

- **`MailpitClient`** — `clear()`, `messages()`, `message(id)`, `findByRecipient(email)`.
- **`startContainer(options?)` / `stopContainer(options?)`** — manage the container directly when `globalSetup` isn't a fit. `start` returns `{ container, smtpPort, apiPort }`. Supports SMTP auth via an `htpasswd` option.
- **`@neomaventures/mailpit/setup` / `@neomaventures/mailpit/teardown`** — Jest `globalSetup`/`globalTeardown` drop-ins wrapping the above.

## License

MIT
