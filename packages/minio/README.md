# @neomaventures/minio

MinIO test fixture for `@neomaventures/*` — S3-compatible object storage via a Docker container, with a bucket created on start and Jest `setup`/`teardown` drop-ins.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Requirements

- Node ≥ 22
- **Docker** available on the host (the container lifecycle shells out to the `docker` CLI)

## Installation

```bash
npm install --save-dev @neomaventures/minio
```

## Quick start

Start a MinIO container for the whole test run via Jest's `globalSetup`/`globalTeardown`. The container is healthy and a bucket exists before your tests run.

```json
// jest-e2e.json
{
  "globalSetup": "@neomaventures/minio/setup",
  "globalTeardown": "@neomaventures/minio/teardown"
}
```

`setup` starts the container and creates a bucket; `teardown` removes the container. The package does **not** set any environment variables — the consumer is responsible for wiring connection details (e.g. via env vars in the test script or a custom `globalSetup` that calls `startContainer()` and sets env vars from the returned config).

```typescript
import { startContainer } from "@neomaventures/minio"
import { S3Client } from "@aws-sdk/client-s3"

// In a custom globalSetup:
const config = await startContainer()

const s3 = new S3Client({
  endpoint: `http://localhost:${config.apiPort}`,
  region: "us-east-1",
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
  },
  forcePathStyle: true,
})
```

## Configuration

The container honours these environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `MINIO_PORT` | `9000` | Host port for the S3 API |
| `MINIO_CONSOLE_PORT` | `9001` | Host port for the web console |
| `NEOMA_TEST_PREFIX` | `neoma-test` | Prefix for the container name (`{prefix}-minio`) |

### Test layer ports

Consumers run `pnpm turbo test:e2e` in CI, which parallelises e2e jobs across packages. Sharing a host port between two parallel suites collides on `docker run -p`, so each package owns a unique [port slot in the root convention](../../README.md#test-container-ports). The ports below are minio's own slot; each consumer of this fixture should declare its `MINIO_PORT` / `MINIO_CONSOLE_PORT` from its **own** slot.

Minio's own slot (used by `packages/minio/.env.e2e`):

| Layer | `MINIO_PORT` | `MINIO_CONSOLE_PORT` |
|---|---|---|
| unit (`.spec`) | `9000` (default — no container started) | `9001` (default — no container started) |
| e2e (`.env.e2e`) | `2700` | `2701` |
| ui | `2800` (reserved) | `2801` (reserved) |

Consumer packages pick their own ports from their own slots. Example: `@neomaventures/storage` (slot `3200-3499`) uses `MINIO_PORT=3200` for unit specs and `3300` for e2e. Declare both the ports and the consumer-side URL (e.g. `STORAGE_ENDPOINT=http://localhost:3300`) in the same `.env` file.

## API

- **`startContainer(options?)` / `stopContainer(options?)`** — manage the container directly when `globalSetup` isn't a fit. `start` creates the bucket and returns `{ container, apiPort, consolePort, bucket, accessKey, secretKey }`. Options: `prefix`, `apiPort`, `consolePort`, `bucket`.
- **`@neomaventures/minio/setup` / `@neomaventures/minio/teardown`** — Jest `globalSetup`/`globalTeardown` drop-ins wrapping the above.

## License

MIT
