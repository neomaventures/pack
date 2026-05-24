# @neoma/docker

Docker test-container helpers for `@neoma/*` — HTTP/TCP health polling and container teardown. The shared building blocks the service fixtures (`@neoma/mockserver`, `@neoma/mailpit`, …) use to start and stop their containers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Requirements

- Node ≥ 22
- **Docker** available on the host (`stopContainer` shells out to the `docker` CLI)

## Installation

```bash
npm install --save-dev @neoma/docker
```

## API

- **`waitForHttp(url, options?)`** — poll an HTTP endpoint until it returns 2xx, or throw after the retry/timeout budget. Used to block until a containerised HTTP service is ready.
- **`waitForTcp(host, port, options?)`** — poll a TCP port until it accepts a connection (e.g. SMTP), or throw.
- **`stopContainer(name)`** — idempotent `docker rm -f <name>`; safe to call even if the container is gone.
- **`BaseOptions`, `HealthCheckOptions`** — shared option types for container start functions and the health pollers.

```typescript
import { waitForHttp, stopContainer } from "@neoma/docker"

await waitForHttp("http://localhost:8025/api/v1/messages", { timeoutMs: 30_000 })
// ...run tests...
await stopContainer("my-test-container")
```

## License

MIT
