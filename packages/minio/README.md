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

## API

- **`startContainer(options?)` / `stopContainer(options?)`** — manage the container directly when `globalSetup` isn't a fit. `start` creates the bucket and returns `{ container, apiPort, consolePort, bucket, accessKey, secretKey }`. Options: `prefix`, `apiPort`, `consolePort`, `bucket`.
- **`@neomaventures/minio/setup` / `@neomaventures/minio/teardown`** — Jest `globalSetup`/`globalTeardown` drop-ins wrapping the above.

## License

MIT
