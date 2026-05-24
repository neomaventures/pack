import { stopMailpit } from "../docker"

/**
 * Jest `globalTeardown` drop-in that stops the Mailpit Docker container.
 *
 * Usage in `jest.config.json`:
 * ```json
 * { "globalTeardown": "@neoma/fixtures/teardown/mailpit" }
 * ```
 */
export default async function teardown(): Promise<void> {
  await stopMailpit()
}
