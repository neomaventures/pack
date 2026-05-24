import { startContainer } from "./docker/container"

/**
 * Jest `globalSetup` drop-in that starts a Mailpit Docker container.
 *
 * Usage in `jest-e2e.json`:
 * ```json
 * { "globalSetup": "@neoma/mailpit/setup" }
 * ```
 */
export default async function setup(): Promise<void> {
  await startContainer()
}
