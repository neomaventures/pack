import { stopMinIO } from "../docker"

/**
 * Jest `globalTeardown` drop-in that stops the MinIO Docker container.
 *
 * Usage in `jest.config.json`:
 * ```json
 * { "globalTeardown": "@neoma/fixtures/teardown/minio" }
 * ```
 */
export default async function teardown(): Promise<void> {
  await stopMinIO()
}
