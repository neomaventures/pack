import { startContainer } from "./docker/container"

/**
 * Jest `globalSetup` drop-in that starts a MinIO Docker container,
 * creates a bucket, and sets the `STORAGE_*` environment variables.
 *
 * Usage in `jest-e2e.json`:
 * ```json
 * { "globalSetup": "@neoma/minio/setup" }
 * ```
 */
export default async function setup(): Promise<void> {
  await startContainer()
}
