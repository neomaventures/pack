import { startMinIO } from "../docker"

/**
 * Jest `globalSetup` drop-in that starts a MinIO Docker container.
 *
 * Usage in `jest.config.json`:
 * ```json
 * { "globalSetup": "@neoma/fixtures/setup/minio" }
 * ```
 */
export default async function setup(): Promise<void> {
  await startMinIO()
}
