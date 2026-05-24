# @neoma/mailpit

Mailpit test fixture for `@neoma/*` — a reusable client plus Docker container lifecycle and Jest `setup`/`teardown` drop-ins for email testing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Requirements

- Node ≥ 22
- **Docker** available on the host (the container lifecycle shells out to the `docker` CLI)

## Installation

```bash
npm install --save-dev @neoma/mailpit
```

## Quick start

Start a Mailpit container for the whole test run via Jest's `globalSetup`/`globalTeardown`, send mail over SMTP, then assert on it with `MailpitClient`.

```json
// jest-e2e.json
{
  "globalSetup": "@neoma/mailpit/setup",
  "globalTeardown": "@neoma/mailpit/teardown"
}
```

`setup` starts the container and sets `SMTP_HOST`, `SMTP_PORT`, and `MAILPIT_API` (e.g. `http://localhost:8025/api/v1`); `teardown` removes it.

```typescript
import { MailpitClient } from "@neoma/mailpit"

const client = new MailpitClient(process.env.MAILPIT_API!)

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
- **`startContainer(options?)` / `stopContainer(options?)`** — manage the container directly when `globalSetup` isn't a fit; `start` sets the `SMTP_*`/`MAILPIT_API` env vars. Supports SMTP auth via an `htpasswd` option.
- **`@neoma/mailpit/setup` / `@neoma/mailpit/teardown`** — Jest `globalSetup`/`globalTeardown` drop-ins wrapping the above.

## License

MIT
