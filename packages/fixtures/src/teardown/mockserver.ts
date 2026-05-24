import { stopMockServer } from "../docker"

/**
 * Jest `globalTeardown` drop-in that stops the MockServer Docker container.
 *
 * Usage in `jest.config.json`:
 * ```json
 * { "globalTeardown": "@neoma/fixtures/teardown/mockserver" }
 * ```
 */
export default async function teardown(): Promise<void> {
  await stopMockServer()
}
