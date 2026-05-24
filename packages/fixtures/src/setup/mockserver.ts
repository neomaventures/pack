import { startMockServer } from "../docker"

/**
 * Jest `globalSetup` drop-in that starts a MockServer Docker container.
 *
 * Usage in `jest.config.json`:
 * ```json
 * { "globalSetup": "@neoma/fixtures/setup/mockserver" }
 * ```
 */
export default async function setup(): Promise<void> {
  await startMockServer()
}
