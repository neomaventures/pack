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

## API

- **`MailpitClient`** — `clear()`, `messages()`, `message(id)`, `findByRecipient(email)`.
- **`startContainer(options?)` / `stopContainer(options?)`** — manage the container directly when `globalSetup` isn't a fit. `start` returns `{ container, smtpPort, apiPort }`. Supports SMTP auth via an `htpasswd` option.
- **`@neomaventures/mailpit/setup` / `@neomaventures/mailpit/teardown`** — Jest `globalSetup`/`globalTeardown` drop-ins wrapping the above.

## License

MIT
