import { stopContainer } from "./docker/container"

/**
 * Jest `globalTeardown` drop-in that stops the MinIO Docker container.
 *
 * Usage in `jest-e2e.json`:
 * ```json
 * { "globalTeardown": "@neoma/minio/teardown" }
 * ```
 */
export default async function teardown(): Promise<void> {
  await stopContainer()
}
