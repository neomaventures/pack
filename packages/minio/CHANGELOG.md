# @neoma/minio

## 0.1.0

### Minor Changes

- b960062: Add `@neoma/minio` — a MinIO test fixture extracted from `@neoma/fixtures`. Ships the Docker container lifecycle (`startContainer` / `stopContainer`), which creates an S3 bucket and publishes the `STORAGE_*` connection env vars, plus Jest `globalSetup` / `globalTeardown` drop-ins (`@neoma/minio/setup`, `@neoma/minio/teardown`). Requires Docker on the host.
