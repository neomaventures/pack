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

Start a MinIO container for the whole test run via Jest's `globalSetup`/`globalTeardown`. The container is healthy and a bucket exists before your tests run, and the connection details are published as `STORAGE_*` environment variables.

```json
// jest-e2e.json
{
  "globalSetup": "@neomaventures/minio/setup",
  "globalTeardown": "@neomaventures/minio/teardown"
}
```

`setup` starts the container, creates a bucket, and sets the env vars below; `teardown` removes the container. Point your S3 client (e.g. `@aws-sdk/client-s3`) at them:

```typescript
import { S3Client } from "@aws-sdk/client-s3"

const s3 = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT,
  region: process.env.STORAGE_REGION,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
})
```

### Environment variables set by `setup`

| Variable | Example | Purpose |
|---|---|---|
| `STORAGE_ENDPOINT` | `http://localhost:9000` | S3 API endpoint (host + API port) |
| `STORAGE_REGION` | `us-east-1` | Region to pass to the S3 client |
| `STORAGE_ACCESS_KEY` | `minioadmin` | Root access key |
| `STORAGE_SECRET_KEY` | `minioadmin` | Root secret key |
| `STORAGE_BUCKET` | `test-bucket` | Name of the bucket created on start |
| `STORAGE_FORCE_PATH_STYLE` | `true` | MinIO requires path-style URLs |

## Configuration

The container honours these environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `MINIO_PORT` | `9000` | Host port for the S3 API |
| `MINIO_CONSOLE_PORT` | `9001` | Host port for the web console |
| `NEOMA_TEST_PREFIX` | `neoma-test` | Prefix for the container name (`{prefix}-minio`) |

## API

- **`startContainer(options?)` / `stopContainer(options?)`** — manage the container directly when `globalSetup` isn't a fit. `start` creates the bucket and sets the `STORAGE_*` env vars, then returns `{ container, apiPort, consolePort, bucket, accessKey, secretKey }`. Options: `prefix`, `apiPort`, `consolePort`, `bucket`.
- **`@neomaventures/minio/setup` / `@neomaventures/minio/teardown`** — Jest `globalSetup`/`globalTeardown` drop-ins wrapping the above.

## License

MIT
