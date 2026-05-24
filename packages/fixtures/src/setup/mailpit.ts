import { startMailpit } from "../docker"

/**
 * Jest `globalSetup` drop-in that starts a Mailpit Docker container.
 *
 * Usage in `jest.config.json`:
 * ```json
 * { "globalSetup": "@neoma/fixtures/setup/mailpit" }
 * ```
 */
export default async function setup(): Promise<void> {
  await startMailpit()
}
